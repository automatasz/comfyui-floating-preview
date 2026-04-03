const { app } = window.comfyAPI.app;
const { api } = window.comfyAPI.api;

// tag -> [{img, sourceNodeId}]
const _galleryImages = new Map();

function getTagFromNode(node) {
  return node?.widgets?.find((w) => w.name === "tag")?.value ?? null;
}

function findDisplayNodes(tag) {
  const graph = app.graph;
  if (!graph?._nodes) return [];
  return graph._nodes.filter(
    (n) => n.type === "GroupPreviewDisplay" && getTagFromNode(n) === tag
  );
}

function refreshDisplayNodes(tag) {
  for (const node of findDisplayNodes(tag)) {
    const imgs = _galleryImages.get(tag);
    if (imgs?.length) {
      node.imgs = imgs.map((entry) => entry.img);
    }
    node.setDirtyCanvas(true, true);
  }
}

app.registerExtension({
  name: "cg.group_preview",

  async beforeRegisterNodeDef(nodeType, nodeData) {

    // ── GroupPreview emitter ──
    if (nodeData?.name === "GroupPreview") {
      const origCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = function () {
        origCreated?.apply(this, arguments);

        const nodeRef = this;
        api.addEventListener("b_preview_with_metadata", function (event) {
          const { blob, nodeId, displayNodeId } = event.detail;
          const targetId = String(displayNodeId || nodeId);
          if (targetId !== String(nodeRef.id)) return;

          const tag = getTagFromNode(nodeRef);
          if (!tag) return;

          const img = new Image();
          img.onload = () => {
            if (!_galleryImages.has(tag)) _galleryImages.set(tag, []);
            _galleryImages.get(tag).push({ img, sourceNodeId: nodeRef.id });
            refreshDisplayNodes(tag);
          };
          img.src = URL.createObjectURL(blob);
        });
      };
    }

    // ── GroupPreviewDisplay viewer ──
    if (nodeData?.name === "GroupPreviewDisplay") {
      const origCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = function () {
        origCreated?.apply(this, arguments);
        this.setSize([550, 550]);
      };
    }
  },

  setup() {
    api.addEventListener("execution_start", function () {
      for (const [tag, imgs] of _galleryImages) {
        imgs.forEach((entry) => {
          if (entry.img.src?.startsWith("blob:")) {
            URL.revokeObjectURL(entry.img.src);
          }
        });
      }
      _galleryImages.clear();

      const graph = app.graph;
      if (!graph?._nodes) return;
      for (const n of graph._nodes) {
        if (n.type === "GroupPreviewDisplay") {
          n.imgs = [];
          n.setDirtyCanvas(true, true);
        }
      }
    });
  },
});
