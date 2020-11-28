class Animation {
    ;
}

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
            if (w !== undefined){
                super(ctx, x, y, w, h);
            }
            else{
                super(ctx, x, y);
                this.w = this.h = undefined
            }
            this.sx = this.sy = this.sw = this.sh = undefined;
        }
        this.img = new Image();
        this.img.src = src;
    }

    draw () {
        console.log("draw", this, ...arguments);
        this.ctx.save();
        if (this.sx !== undefined) {
            this.ctx.drawImage(
                this.img,
                this.sx, this.sy, this.sw, this.sh,
                this.x, this.y, this.w, this.h);
        }
        else if (this.w !== undefined) {
            this.ctx.drawImage(
                this.img,
                this.x, this.y, this.w, this.h);
        }
        else {
            this.ctx.drawImage(
                this.img,
                this.x, this.y);

        }
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
        for (var i in this.drawables) {
            this.drawables[i].draw();
        }
    }

    update (t) {
        console.log("update", this, ...arguments);
    }

    log () {
        console.log("log", this, ...arguments);
    }
}