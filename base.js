class GameEventTarget {
    constructor () {
        this.passKeyDown = false;
        this.passKeyUp = false;
        this.passKeyPress = false;
        this.passMouseDown = false;
        this.passMouseUp = false;
        this.passMousePress = false;
    }

    keydown (ev) {
        console.log("keydown", this, ...arguments);
        return this.passKeyDown;
    }

    keyup (ev) {
        console.log("keyup", this, ...arguments);
        return this.passKeyUp;
    }

    keypress (ev) {
        console.log("keypress", this, ...arguments);
        return this.passKeyPress;
    }
    
    mousedown (ev) {
        console.log("mousedown", this, ...arguments);
        return this.passMouseDown;
    }

    mouseup (ev) {
        console.log("mouseup", this, ...arguments);
        return this.passMouseUp;
    }

    mousepress (ev) {
        console.log("mousepress", this, ...arguments);
        return this.passMousePress;
    }
}

class Drawable {
    constructor (ctx, x, y, w, h) {
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    draw () {}
}

class Sprite extends Drawable {
    constructor (ctx, src, x, y, w, h, x_, y_, w_, h_) {
        if (x_ !== undefined){
            super(ctx, x_, y_, w_, h_);
            this.sx = x;
            this.sy = y;
            this.sw = w;
            this.sh = h;
        }
        else {
            super(ctx, x, y, w, h);
            this.sx = this.sy = this.sw = this.sh = undefined;
        }
        this.img = Image();
        this.img.src = src;
    }

    draw () {
        this.ctx.save();
        if (this.sx !== undefined)
            this.ctx.drawImage(
                this.img,
                this.sx, this.sy, this.sw, this.sh,
                this.dx, this.dy, this.dw, this.dh);
        else
            this.ctx.drawImage(
                this.img,
                this.dx, this.dy, this.dw, this.dh);
        this.ctx.restore();
    }
}

class Path extends Drawable {
    constructor (ctx, x, y, pathData, fill, stroke) {
        super(ctx, x, y);
        this.path = new Path2D(pathData);
        this.fill = fill;
        this.stroke = stroke;
    }

    draw () {
        console.log("draw", this, ...arguments);
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        if (this.fill !== null){
            this.ctx.fillStyle = this.fill;
            this.ctx.fill(this.path);
        }
        if (this.stroke !== null){
            this.ctx.strokeStyle = this.stroke;
            this.ctx.stroke(this.path);
        }
        this.ctx.restore();
    }
}

class GameState extends GameEventTarget{
    constructor (ctx) {
        super();
        this.ctx = ctx;
        this.drawables = [];
        this.passDraw = false;
        this.passUpdate = false;
    }

    draw () {
        console.log("draw", this, ...arguments);
        for (drbl in this.drawables) {
            drbl.draw();
        }
    }

    update () {
        console.log("update", this, ...arguments);
    }

    log () {
        console.log("log", this, ...arguments);
    }
}