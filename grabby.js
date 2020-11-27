class Drawable {
    constructor (ctx, src, x, y, h, w, x_, y_, h_, w_) {
        this.ctx = ctx;
        this.img = Image();
        this.img.src = src;
        if (x_ !== undefined){
            this.sx = x;
            this.sy = y;
            this.sh = h;
            this.sw = w;
            this.dx = x_;
            this.dy = y_;
            this.dh = h_;
            this.dw = w_;
        }
        else {
            this.sx = this.sy = this.sh = this.sw = undefined;
            this.dx = x;
            this.dy = y;
            this.dh = h;
            this.dw = w;
        }
    }

    draw () {
        if (this.sx !== undefined)
            this.ctx.drawImage(
                this.img,
                this.sx, this.sy, this.sh, this.sw,
                this.dx, this.dy, this.dh, this.dw);
        else
            this.ctx.drawImage(
                this.img,
                this.dx, this.dy, this.dh, this.dw);
    }
}

class GameState {
    constructor () {
        this.drawables = [];
    };

    draw () {
        for (drbl in this.drawables) {
            drbl.draw();
        }
    };

    log () {
        console.log("Hello!",...arguments)
    }
};

class Level extends GameState {
    constructor () {
        super();
        this.stuff = arguments;
    }
}