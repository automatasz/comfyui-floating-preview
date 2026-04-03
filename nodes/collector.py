import torch
from PIL import Image

try:
    from server import PromptServer, BinaryEventTypes
except Exception:
    PromptServer = None
    BinaryEventTypes = None

# ── ProgressiveImageCollector (Option 2) ──────────────────────────────────
# Module-level dict survives across node executions within the same server
# session. Keyed by group name -> {slot_name: image_tensor}.
_accumulator = {}


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
            {"node_id": unique_id, "prompt_id": prompt_id or ""},
        ),
        PromptServer.instance.client_id,
    )


class ProgressiveImageCollector:
    """Accumulates images across independent execution steps.

    Each instance fires as soon as its single IMAGE input is ready, stores
    the tensor in a shared dict keyed by (group, slot), and outputs all
    images collected for that group so far as a single batch.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "group": ("STRING", {"default": "default",
                                     "tooltip": "Shared group name. All collectors with the same group accumulate together."}),
                "slot": ("STRING", {"default": "1",
                                    "tooltip": "Slot key within the group. Images are batched in sorted slot order."}),
                "reset": ("BOOLEAN", {"default": False,
                                      "tooltip": "Clear the group before storing this image. Enable on the first step of each run."}),
            },
            "optional": {
                "format": (["JPEG", "PNG"], {"default": "JPEG"}),
                "max_size": ("INT", {"default": 768, "min": 128, "max": 4096, "step": 64,
                                     "tooltip": "Max dimension for the websocket preview thumbnail."}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "prompt_id": "PROMPT_ID",
            },
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("images",)
    FUNCTION = "collect"
    CATEGORY = "cg-previewer"
    OUTPUT_NODE = True
    DESCRIPTION = (
        "Accumulates images in a shared group across execution steps. "
        "Each instance fires independently and outputs all images collected so far."
    )

    def collect(self, image, group, slot, reset,
                format="JPEG", max_size=768,
                unique_id=None, prompt_id=None):
        if reset:
            _accumulator.pop(group, None)

        _accumulator.setdefault(group, {})[slot] = image

        slots = _accumulator[group]
        batch = torch.cat([slots[k] for k in sorted(slots.keys())], dim=0)

        _send_preview(image, format, max_size, unique_id, prompt_id)

        return {"ui": {"collector_count": [len(slots)]}, "result": (batch,)}

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")


# ── GroupPreview (Option 4) ───────────────────────────────────────────────
# Lightweight emitter: sends one image over binary ws tagged with a group
# name. The JS frontend collects images by tag for display.

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
