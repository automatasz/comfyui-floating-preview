from PIL import Image

try:
    from server import PromptServer, BinaryEventTypes
except Exception:
    PromptServer = None
    BinaryEventTypes = None


def _send_preview(image_tensor, fmt, max_size, unique_id, prompt_id):
    """Encode the first frame and push it over the binary websocket."""
    if PromptServer is None or unique_id is None:
        return
    arr = image_tensor[0].cpu().mul(255).clamp(0, 255).byte().numpy()
    h, w = arr.shape[:2]
    if w > max_size or h > max_size:
        scale = max_size / max(w, h)
        new_w, new_h = int(w * scale), int(h * scale)
        pil_image = Image.fromarray(arr).resize((new_w, new_h), Image.LANCZOS)
    else:
        pil_image = Image.fromarray(arr)
    PromptServer.instance.send_sync(
        BinaryEventTypes.PREVIEW_IMAGE_WITH_METADATA,
        (
            (fmt, pil_image, None),
            {
                "node_id": unique_id,
                "display_node_id": unique_id,
                "prompt_id": prompt_id or "",
            },
        ),
        PromptServer.instance.client_id,
    )

class GroupPreview:
    """Sends a single image preview tagged with a group name.

    Place one after each pipeline stage. The JS frontend accumulates all
    previews sharing the same tag and displays them in a gallery on the
    paired GroupPreviewDisplay node.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "tag": ("STRING", {"default": "steps",
                                   "tooltip": "Group tag. All GroupPreview nodes with the same tag feed into the same gallery."}),
            },
            "optional": {
                "format": (["JPEG", "PNG"], {"default": "JPEG"}),
                "max_size": ("INT", {"default": 768, "min": 128, "max": 4096, "step": 64}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "prompt_id": "PROMPT_ID",
            },
        }

    RETURN_TYPES = ()
    FUNCTION = "preview"
    CATEGORY = "cg-previewer"
    OUTPUT_NODE = True
    DESCRIPTION = (
        "Sends a tagged image preview over websocket. "
        "Pair with a GroupPreviewDisplay node to see all tagged images in one gallery."
    )

    def preview(self, image, tag,
                format="JPEG", max_size=768,
                unique_id=None, prompt_id=None):
        _send_preview(image, format, max_size, unique_id, prompt_id)
        return {"ui": {"group_tag": [tag], "source_node_id": [unique_id]}, "result": ()}

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")


class GroupPreviewDisplay:
    """Pure display node — the JS frontend renders a gallery of images
    received from GroupPreview emitters sharing the same tag.

    Has no image input, so it never blocks the pipeline.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "tag": ("STRING", {"default": "steps",
                                   "tooltip": "Must match the tag used by GroupPreview emitter nodes."}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            },
        }

    RETURN_TYPES = ()
    FUNCTION = "display"
    CATEGORY = "cg-previewer"
    OUTPUT_NODE = True
    DESCRIPTION = (
        "Displays a gallery of images sent by GroupPreview nodes with the matching tag. "
        "No image input — never blocks the pipeline."
    )

    def display(self, tag, unique_id=None):
        return {"ui": {"group_tag": [tag], "display_node_id": [unique_id]}, "result": ()}

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")
