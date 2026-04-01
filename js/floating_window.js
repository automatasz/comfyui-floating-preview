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
        this.style.width = '400px'
        this.style.height = '300px'
        this.header = create('div', 'preview_floater_header', this, {innerText:title} )
        this.body   = create('div', 'preview_floater_body', this )

        // Create resize handles
        this.resizeHandleNW = create('div', 'resize-handle resize-handle-nw', this)
        this.resizeHandleNE = create('div', 'resize-handle resize-handle-ne', this)
        this.resizeHandleSW = create('div', 'resize-handle resize-handle-sw', this)
        this.resizeHandleSE = create('div', 'resize-handle resize-handle-se', this)

        this.header.addEventListener('mousedown',()=>{this.dragging = true})
        this.header.addEventListener('click',this.header_click.bind(this))
        document.addEventListener('mousemove',this.on_mousemove.bind(this))
        document.addEventListener('mouseleave',()=>{this.dragging = false; this.resizing = null})
        document.addEventListener('mouseup',()=>{this.dragging = false; this.resizing = null})

        // Add resize event listeners
        this.resizeHandleNW.addEventListener('mousedown', (e) => this.start_resize(e, 'nw'))
        this.resizeHandleNE.addEventListener('mousedown', (e) => this.start_resize(e, 'ne'))
        this.resizeHandleSW.addEventListener('mousedown', (e) => this.start_resize(e, 'sw'))
        this.resizeHandleSE.addEventListener('mousedown', (e) => this.start_resize(e, 'se'))

        this.dragging = false
        this.shaded   = false
        this.resizing = null
        this.aspectRatio = null

        document.body.append(this)
    }

    show() {
        this.style.display = 'flex'
    }

    hide() {
        this.style.display = 'none'
    }

    set_title(title) {
        this.header.innerText = title
    }

    fit_to_image() {
        if (!this.img_elem || !this.img_elem.naturalWidth || !this.img_elem.naturalHeight) return

        const imgWidth = this.img_elem.naturalWidth
        const imgHeight = this.img_elem.naturalHeight
        const imgAspect = imgHeight / imgWidth

        // Get current width and calculate height based on image aspect ratio
        const currentWidth = this.offsetWidth
        const newHeight = currentWidth * imgAspect

        this.style.height = `${newHeight}px`
    }

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
            this.body.style.display = this.shaded ? 'none' : 'flex'
            this.header.style.width = (this.shaded) ? `${w}px` : `unset`

            // Toggle resize handles visibility
            const handles = [this.resizeHandleNW, this.resizeHandleNE, this.resizeHandleSW, this.resizeHandleSE]
            handles.forEach(h => h.style.display = this.shaded ? 'none' : 'block')
        }
    }

    on_mousemove(e) {
        if (this.dragging) {
            this.move_to( this.position.x + e.movementX , this.position.y + e.movementY )
        } else if (this.resizing) {
            this.handle_resize(e)
        }
    }

    start_resize(e, direction) {
        e.preventDefault()
        e.stopPropagation()
        this.resizing = direction
        this.resizeStartX = e.clientX
        this.resizeStartY = e.clientY
        this.resizeStartWidth = this.offsetWidth
        this.resizeStartHeight = this.offsetHeight
        this.resizeStartLeft = this.position.x
        this.resizeStartTop = this.position.y

        // Calculate aspect ratio from image if available
        if (this.img_elem && this.img_elem.naturalWidth && this.img_elem.naturalHeight) {
            this.aspectRatio = this.img_elem.naturalHeight / this.img_elem.naturalWidth
        } else {
            this.aspectRatio = this.resizeStartHeight / this.resizeStartWidth
        }
    }

    handle_resize(e) {
        const dx = e.clientX - this.resizeStartX
        const dy = e.clientY - this.resizeStartY
        const minSize = 100

        let newWidth = this.resizeStartWidth
        let newHeight = this.resizeStartHeight
        let newLeft = this.resizeStartLeft
        let newTop = this.resizeStartTop

        // Calculate new dimensions based on resize direction
        if (this.resizing.includes('e')) {
            newWidth = Math.max(minSize, this.resizeStartWidth + dx)
            newHeight = newWidth * this.aspectRatio
        } else if (this.resizing.includes('w')) {
            newWidth = Math.max(minSize, this.resizeStartWidth - dx)
            newHeight = newWidth * this.aspectRatio
            newLeft = this.resizeStartLeft + (this.resizeStartWidth - newWidth)
        }

        if (this.resizing.includes('s')) {
            // If not already set by horizontal resize
            if (newHeight === this.resizeStartHeight) {
                newHeight = Math.max(minSize, this.resizeStartHeight + dy)
                newWidth = newHeight / this.aspectRatio
            }
        } else if (this.resizing.includes('n')) {
            // If not already set by horizontal resize
            if (newHeight === this.resizeStartHeight) {
                newHeight = Math.max(minSize, this.resizeStartHeight - dy)
                newWidth = newHeight / this.aspectRatio
                newTop = this.resizeStartTop + (this.resizeStartHeight - newHeight)
            }
        }

        // Apply new dimensions
        this.style.width = `${newWidth}px`
        this.style.height = `${newHeight}px`

        // Update position for north/west resizes
        if (this.resizing.includes('w')) {
            this.position.x = newLeft
            this.style.left = `${newLeft}px`
        }
        if (this.resizing.includes('n')) {
            this.position.y = newTop
            this.style.top = `${newTop}px`
        }

        // Notify callback of position change
        this.movecallback?.(this.position.x, this.position.y)
    }
}
customElements.define('cg-preview-floater',  FloatingWindow, {extends: 'div'})