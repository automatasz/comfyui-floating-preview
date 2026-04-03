VERSION = "0.3.0"

from .nodes.collector import ProgressiveImageCollector, GroupPreview, GroupPreviewDisplay

WEB_DIRECTORY = "./js"

NODE_CLASS_MAPPINGS = {
    "ProgressiveImageCollector": ProgressiveImageCollector,
    "GroupPreview": GroupPreview,
    "GroupPreviewDisplay": GroupPreviewDisplay,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ProgressiveImageCollector": "Progressive Image Collector",
    "GroupPreview": "Group Preview",
    "GroupPreviewDisplay": "Group Preview Display",
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]