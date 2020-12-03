class Item extends DrawableGroup {
    constructor (ctx, x, y, len, gx, gy, grab, pass) {
        super(ctx, x, y);
        this.len = len;
        this._gx = gx;
        this._gy = gy;
        this.drawables = [];
        this.grabbable = grab;
        this.passable = pass;
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
        super(ctx, x, y, len, gx, gy, false, true);
        var path = "m0-30a30 30 0 1 1 0 60a30 30 0 1 1 0-60";
        this.body = new Path(ctx, len*gx, len*gy, path, "purple", null);
        this.legs = [
            new Path(ctx, len*gx, len*gy, "m0 0h50", null, "purple"),
            new Path(ctx, len*gx, len*gy, "m0 0h130", null, "purple"),
        ];
        this.grabItems = [null, null, null, null, null, null, null, null];
        this.startAngle = 0;
        this.drawables = [this.body, ...this.legs];
    }

    draw () {
        for (var angle = (this.startAngle + 3) * 8 / 4 * Math.PI , i = 0;
            i < 8;
            angle -= Math.PI/4, i++){
            this.ctx.save();
            this.ctx.translate(this.x, this.y);
            this.ctx.rotate(angle);
            this.legs[this.grabItems[i]===null?0:1].draw();
            this.ctx.restore();
        }
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.body.draw();
        this.ctx.restore();
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
                    ctx, len*c, len*r, path,
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
        this.items = [];
        this.drawables = [this.grid, this.player, ...this.items];
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