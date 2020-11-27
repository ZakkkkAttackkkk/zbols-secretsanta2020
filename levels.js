class Grid  {
    constructor (ctx, x, y, w, h) {
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.cells = [];
        var path = "M0 0l20 0l0 20l-20 0z";
        for (var r = 0; r < h; r++) {
            this.cells.push(new Array);
            for (var c = 0; c < w; c++) {
                this.cells[r].push(new Path(
                    ctx, x+20*c, y+20*r, path,
                    (r+c)&1 ? "#aaa" : "#777",
                    "#0003"
                ));
            }
        }
    }

    draw () {
        console.log("draw", this, ...arguments);
        for (var i in this.cells) {
            for (var j in this.cells[i]) {
                this.cells[i][j].draw();
            }
        }
    }
}

class Level extends GameState {
    constructor (ctx, x, y, w, h) {
        super(ctx);
        this.grid = new Grid(ctx, x, y, w, h);
        console.log(this.grid);
    }

    draw () {
        console.log("draw", this, ...arguments);
        this.grid.draw();
    }
}

cnv = document.getElementById("cnv-main");
ctx = cnv.getContext("2d");

var levels = [];

levels.push(new Level(ctx,0,0,5,5));