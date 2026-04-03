const { app } = window.comfyAPI.app;
const { api } = window.comfyAPI.api;

app.registerExtension({
  name: "cg.collector",

  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData?.name !== "ProgressiveImageCollector") return;

    const origOnNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      origOnNodeCreated?.apply(this, arguments);

      this.setSize([300, 340]);
      this._collectedImgs = [];

      const nodeRef = this;
      api.addEventListener("b_preview_with_metadata", function (event) {
        const { blob, nodeId, displayNodeId } = event.detail;
        const targetId = String(displayNodeId || nodeId);
        if (targetId !== String(nodeRef.id)) return;

        const img = new Image();
        img.onload = () => {
          nodeRef._collectedImgs.push(img);
          nodeRef.imgs = [...nodeRef._collectedImgs];
          nodeRef.setDirtyCanvas(true);
        };
        img.src = URL.createObjectURL(blob);
      });

      api.addEventListener("execution_start", function () {
        nodeRef._collectedImgs = [];
        nodeRef.imgs = [];
      });
    };
  },
});
