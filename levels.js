class Player extends Drawable {
    constructor (ctx, x, y) {
        super(ctx, x, y)
        var path = "M5 40a35 35 0 1 1 0 1Z"
        // var path = "M40 5L75 75L5 75Z"
        this.sprite = new Path(ctx, x, y, path, "#000", null);
    }

    get x () {
        return this._x;
    }

    set x (value) {
        this._x = value;
        this.sprite.x = value;
    }

    get y () {
        return this._y;
    }

    set y (value) {
        this._y = value;
        this.sprite.y = value;
    }

    draw () {
        this.sprite.draw();
    }
}

class Grid {
    constructor (ctx, x, y, w, h) {
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.cells = [];
        var path = "M0 0h80v80h-80z";
        for (var r = 0; r < h; r++) {
            this.cells.push([]);
            for (var c = 0; c < w; c++) {
                this.cells[r].push(new Path(
                    ctx, x+80*c, y+80*r, path,
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
    constructor (ctx, x, y, w, h, px, py) {
        super(ctx);
        this.grid = new Grid(ctx, x, y, w, h);
        this.player = new Player(ctx, x+px*80, y+py*80);
        this.drawables = [this.grid, this.player];
        this.px = px;
        this.py = py;
    }

    keydown (ev) {
        if (ev.code === "ArrowLeft") {
            if (0 < this.px){
                this.px--;
                this.player.x -= 80;
            }
        }
        else if (ev.code === "ArrowRight") {
            if (this.px < this.grid.w - 1){
                this.px++;
                this.player.x += 80;
            }
        }
        else if (ev.code === "ArrowUp") {
            if (0 < this.py){
                this.py--;
                this.player.y -= 80;
            }
        }
        else if (ev.code === "ArrowDown") {
            if (this.py < this.grid.h - 1){
                this.py++;
                this.player.y += 80;
            }
        }
    }
}

cnv = document.getElementById("cnv-main");
ctx = cnv.getContext("2d");

var levels = [];

levels.push(new Level(ctx,0,0,10,7,3,5));