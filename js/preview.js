import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js"
import { FloatingWindow } from "./floating_window.js";
import { create } from "./utils.js";

const floater  = new FloatingWindow("Preview", (x,y) => { app.graph.extra.cg_preview_position = [x,y]})
var running_and_have_image = false

function set_visibility() {
    const option = app.ui.settings.getSettingValue("Preview.show");
    if (option==2 || (running_and_have_image && option==1)) floater.show();
    else floater.hide();
}

function on_executing(e) {
    const running_node = e.detail
    if (running_node) {
        const node_name = app.graph?._nodes_by_id[running_node]?.getTitle()
        floater.set_title(node_name ? `${node_name} (#${running_node})` : `Node #${running_node}`);
    } else { 
        running_and_have_image = false;
    }

    set_visibility();
}

function on_b_preview(e) { 
    document.getElementById('cg-preview-image').src = window.URL.createObjectURL(e.detail) 
    running_and_have_image = true;
    set_visibility();
}

function on_image_loaded() {}

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
        create('img', null, floater.body, {id: 'cg-preview-image'}).onload = on_image_loaded
        floater.move_to( app.graph?.extra?.cg_preview_position?.[0] || 100, app.graph?.extra?.cg_preview_position?.[1] || 200 )
        if (app.ui.settings.getSettingValue("Preview.show") == 2) floater.show();
        else floater.hide();
    }
})
    