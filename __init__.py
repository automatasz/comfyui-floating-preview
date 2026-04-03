VERSION = "0.3.0"

from .nodes.collector import GroupPreview, GroupPreviewDisplay

WEB_DIRECTORY = "./js"

NODE_CLASS_MAPPINGS = {
    "GroupPreview": GroupPreview,
    "GroupPreviewDisplay": GroupPreviewDisplay,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "GroupPreview": "Group Preview",
    "GroupPreviewDisplay": "Group Preview Display",
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]