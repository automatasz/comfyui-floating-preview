# Preview

A very simple ComfyUI extension to show the preview full-size in a single floating window, whichever node is running.

## Install

Install:

```
cd custom_nodes
git clone https://github.com/chrisgoringe/cg-previewer
```

and restart Comfy

## Usage

By default the window will pop up when the first preview is generated. The title bar will show which node the preview is being sent to. You can drag the window around using the header, and you can toggle-minimise it by double-clicking the header (a hat tip to WindowShade, my favourite extension from the days of MacOS8).

Note that the window will show previews from any tab - so you can use this to watch the progress of one workflow while you work on another.

## Settings

In the Comfy settings are the following options

- `remove` can be used to remove the previews from the nodes generating them
- `show` determines when the preview window is shown (never, when active, or always)