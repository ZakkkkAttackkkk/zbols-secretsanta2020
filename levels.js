class Player extends Drawable {
    constructor (ctx, x, y, len, gx, gy) {
        super(ctx, x, y)
        this.len = len;
        this._gx = gx;
        this._gy = gy;
        var path = "M5 40a35 35 0 1 1 0 1Z"
        // var path = "M40 5L75 75L5 75Z"
        this.body = new Path(ctx, x+len*gx, y+len*gy, path, "#000", null);
    }

    get gx () {
        return this._gx;
    }

    set gx (value) {
        this._gx = value;
        this.body.x = this.x + this._gx * this.len;
    }

    get gy () {
        return this._gy;
    }

    set gy (value) {
        this._gy = value;
        this.body.y = this.y + this._gy * this.len;
    }

    draw () {
        this.body.draw();
    }
}

class Grid {
    constructor (ctx, x, y, len, w, h) {
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.len = len;
        this.w = w;
        this.h = h;
        this.cells = [];
        var path = ["M0 0h","v","h-","z"].join(len);
        for (var r = 0; r < h; r++) {
            this.cells.push([]);
            for (var c = 0; c < w; c++) {
                this.cells[r].push(new Path(
                    ctx, x+len*c, y+len*r, path,
                    (r+c)&1 ? "#aaa" : "#777",
                    "#0003"
                ));
            }
        }
    }

    draw () {
        // console.log("draw", this, ...arguments);
        for (var i in this.cells) {
            for (var j in this.cells[i]) {
                this.cells[i][j].draw();
            }
        }
    }
}

class Level extends GameState {
    constructor (ctx, x, y, len, w, h, px, py) {
        super(ctx);
        this.grid = new Grid(ctx, x, y, len, w, h);
        this.player = new Player(ctx, x, y, len, px, py);
        this.drawables = [this.grid, this.player];
    }

    keydown (ev) {
        if (ev.code === "ArrowLeft") {
            if (0 < this.player.gx){
                this.player.gx--;
            }
        }
        else if (ev.code === "ArrowRight") {
            if (this.player.gx < this.grid.w - 1){
                this.player.gx++;
            }
        }
        else if (ev.code === "ArrowUp") {
            if (0 < this.player.gy){
                this.player.gy--;
            }
        }
        else if (ev.code === "ArrowDown") {
            if (this.player.gy < this.grid.h - 1){
                this.player.gy++;
            }
        }
    }
}

cnv = document.getElementById("cnv-main");
ctx = cnv.getContext("2d");

var levels = [];

levels.push(new Level(ctx,0,0,80,10,7,3,5));