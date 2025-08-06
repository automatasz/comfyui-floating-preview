function create( tag, clss, parent, properties ) {
    const nd = document.createElement(tag);
    if (clss)       clss.split(" ").forEach((s) => nd.classList.add(s))
    if (parent)     parent.appendChild(nd);
    if (properties) Object.assign(nd, properties);
    return nd;
}

export class FloatingWindow extends HTMLDivElement {
    constructor(title, movecallback) {
        super()
        this.movecallback = movecallback
        this.classList.add('preview_floater')
        this.header = create('div', 'preview_floater_header', this, {innerText:title} ) 
        this.body   = create('div', 'prewview_floater_body', this )

        this.header.addEventListener('mousedown',()=>{this.dragging = true})
        this.header.addEventListener('click',this.header_click.bind(this))
        document.addEventListener('mousemove',this.header_mousemove.bind(this))
        document.addEventListener('mouseleave',()=>{this.dragging = false})
        document.addEventListener('mouseup',()=>{this.dragging = false})
        
        this.dragging = false
        this.shaded   = false
        
        document.body.append(this)
    }

    show() { this.style.display = 'block' }
    hide() { this.style.display = 'none' }
    set_title(title) { this.header.innerText = title }

    move_to(x,y) {
        this.position = {x:x,y:y}
        this.style.left = `${this.position.x}px`
        this.style.top = `${this.position.y}px`
        this.movecallback?.(x,y)
    }

    header_click(e) {
        if (e.detail>1) {
            this.shaded = !this.shaded
            const w = this.header.getBoundingClientRect().width
            this.body.style.display = this.shaded ? 'none' : 'block'
            this.header.style.width = (this.shaded) ? `${w}px` : `unset`
        }
    }

    header_mousemove(e) {
        if (this.dragging) this.move_to( this.position.x + e.movementX , this.position.y + e.movementY )
    }


}
customElements.define('cg-preview-floater',  FloatingWindow, {extends: 'div'})