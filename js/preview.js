import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js"
import { FloatingWindow } from "./floating_window.js";
import { create } from "./utils.js";

var _floater      = null
var image_to_show = false
var node_name     = null
var running_node  = null

function floater() {
    if (!_floater) {
        _floater = new FloatingWindow("Preview", (x,y) => { app.graph.extra.cg_preview_position = [x,y]})
        create('img', null, _floater.body, {id: 'cg-preview-image'})
    }
    return _floater
}

function update() {
    floater().set_title(node_name ? `${node_name} (#${running_node})` : `Node #${running_node}`);
    const option = app.ui.settings.getSettingValue("Preview.show");
    (option==2 || (image_to_show && option==1)) ? floater().show() : floater().hide();
}

function on_executing(e) {
    running_node = e.detail
    if (!running_node) {
        image_to_show = false;
    } else {
        node_name = app.graph?._nodes_by_id[running_node]?.getTitle();
    }
    update();
}

function on_b_preview(e) { 
    if (!node_name && running_node) node_name = app.graph?._nodes_by_id[running_node]?.getTitle()
    document.getElementById('cg-preview-image').src = window.URL.createObjectURL(e.detail) 
    image_to_show = true;
    update();
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
    ],
    setup() {
        create('link', null, document.getElementsByTagName('HEAD')[0], 
            {'rel':'stylesheet', 'type':'text/css', 'href': new URL("./preview.css", import.meta.url).href } )
        api.addEventListener('executing', on_executing)
        api.addEventListener('b_preview', on_b_preview)
        floater().move_to( app.graph?.extra?.cg_preview_position?.[0] || 100, app.graph?.extra?.cg_preview_position?.[1] || 200 )
        (app.ui.settings.getSettingValue("Preview.show") == 2) ? floater().show() : floater().hide();
    }
})
    