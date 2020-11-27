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
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        if (this.fill){
            this.ctx.fillStyle = fill;
            this.ctx.fill(this.path);
        }
        if (this.stroke){
            this.ctx.strokeStyle = stroke;
            this.ctx.stroke(this.path);
        }
        this.ctx.restore();
    }
}

class GameState {
    constructor () {
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

    keydown (ev) {
        console.log("keydown", this, ...arguments);
        return false;
    }

    keyup (ev) {
        console.log("keyup", this, ...arguments);
        return false;
    }

    keypress (ev) {
        console.log("keypress", this, ...arguments);
        return false;
    }
}