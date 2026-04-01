import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js"
import { FloatingWindow } from "./floating_window.js";
import { create } from "./utils.js";

var _floater          = null

function remove_node_previews(nid) {
    const previews = app.nodePreviewImages[nid]
    if (previews) {
        previews.forEach(url => {URL.revokeObjectURL(url)})
        delete app.nodePreviewImages[nid]
    }
}

function floater() {
    if (!_floater) {
        _floater = new FloatingWindow((x,y) => { app.graph.extra.cg_preview_position = [x,y]})
        _floater.move_to( app.graph?.extra?.cg_preview_position?.[0] || 100, app.graph?.extra?.cg_preview_position?.[1] || 200 )
        _floater.img_elem = create('img', null, _floater.body, {id: 'cg-preview-image'})
        _floater.img_elem.addEventListener('load', () => {
            _floater.fit_to_image()
        })
    }
    return _floater
}

function _update() {
    const option = app.ui.settings.getSettingValue("Preview.show");
    (option==2 || option==1) ? floater().show() : floater().hide();
}

function on_executed(e) {
    _update();
}

function on_b_preview(e) {
    floater().img_elem.src = window.URL.createObjectURL(e.detail.blob)
    const nid = e.detail.nodeId
    let a = app.nodePreviewImages[nid]
    const node = app.graph?.getNodeById(nid)
    if (node) {
        if (app.ui.settings.getSettingValue("Preview.remove")) remove_node_previews(nid)
    }
    _update();
}

app.registerExtension({
	name: "cg.preview",
    settings: [
        {
            id: "Preview.show",
            name: "Show preview window",
            type: "combo",
            options: [ {value:0, text:"Never"}, {value:1, text:"When Active"}, {value:2, text:"Always"} ],
            defaultValue: "2",
        },
        {
            id: "Preview.remove",
            name: "Remove previews from nodes",
            type: "boolean",
            defaultValue: false,
        }
    ],
    setup() {
        create('link', null, document.getElementsByTagName('HEAD')[0], 
            {'rel':'stylesheet', 'type':'text/css', 'href': new URL("./preview.css", import.meta.url).href } )
        api.addEventListener('executed', on_executed)
        api.addEventListener('b_preview_with_metadata', on_b_preview)
    }
})
    