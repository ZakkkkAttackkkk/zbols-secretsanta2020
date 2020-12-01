class Item extends DrawableGroup {
    constructor (ctx, x, y, len, gx, gy) {
        super(ctx, x, y);
        this.len = len;
        this._gx = gx;
        this._gy = gy;
        this.drawables = []; 
    }

    get gx () {
        return this._gx;
    }

    set gx (value) {
        this._gx = value;
        this.drawables.forEach((drbl)=>{
            drbl.x = this._gx * this.len;
        })
    }

    get gy () {
        return this._gy;
    }

    set gy (value) {
        this._gy = value;
        this.drawables.forEach((drbl)=>{
            drbl.y = this._gy * this.len;
        })
    }
}

class Player extends Item {
    constructor (ctx, x, y, len, gx, gy) {
        super(ctx, x, y, len, gx, gy);
        var path = "m0-30a30 30 0 1 1 0 60a30 30 0 1 1 0-60";
        this.body = new Path(ctx, len*gx, len*gy, path, "purple", null);
        this.drawables = [this.body];
        ;
    }
}

class Grid extends DrawableGroup {
    constructor (ctx, x, y, len, w, h) {
        super(ctx, x, y);
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
                    null
                ));
            }
            this.drawables.push(...this.cells[r]);
        }
    }
}

class Level extends GameState {
    constructor (ctx, x, y, len, w, h, px, py) {
        super(ctx);
        delete this.x;
        delete this.y;
        this.grid = new Grid(ctx, x, y, len, w, h);
        this.player = new Player(ctx, x+len/2, y+len/2, len, px, py);
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