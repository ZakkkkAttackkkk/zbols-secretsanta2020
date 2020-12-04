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

class Wall extends Item {
    constructor (ctx, x, y, len, gx, gy) {
        super(ctx, x, y, len, gx, gy, false, false);
    }
}

class Floor extends Item {
    constructor (ctx, x, y, len, gx, gy) {
        super(ctx, x, y, len, gx, gy, false, true);
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
        this.startAngle = 3;
        this.drawables = [this.body, ...this.legs];
    }

    draw () {
        for (var angle = this.startAngle % 8 / 4 * Math.PI , i = 0;
            i < 8;
            angle += Math.PI/4, i++){
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
        this.cells = new Trie();
        this.drawables = this.cells;
    }

    register (map, list) {
        for (var r = 0; r < map.length; r++) {
            var row = map[r];
            for (var c = 0; c < row.length; c++) {
                if (row[c] !== null){
                    var cell = [];
                    row[c].forEach((el)=>{
                        var [itm, drbls] = list.get(el);
                        var item = new (itm)(
                            this.ctx, this.x, this.y,
                            this.len, c, r
                        );
                        drbls.forEach((drbl)=>{
                            var [func, spec, ...args] = drbl;
                            if (func == "P") {
                                item.drawables.push(new Path(
                                    this.ctx, this.len * c, this.len * r,
                                    spec(this.len), ...args
                                ));
                            }
                            else if (func == "S") {
                                item.drawables.push(new Sprite(
                                    this.ctx, spec, 
                                    this.len * c, this.len * r, ...args
                                ));
                            }
                        })
                        cell.push(item);
                    })
                    this.cells.set([r, c], cell);
                }
            }
        }
    }

    // Check if the cell at the given position is passable
    passable (pos) {
        var x, y;
        [x, y] = pos;
        var cell = this.cells.get([y,x]);
        console.log(...pos, cell, this.cells);
        if (cell === undefined) return false;
        return !(cell.some((item) => item.passable == false));
    }

    // Check if the player collides with anything that isn't passable
    collide (dx, dy, rot, player) {
        if (rot == 0 && !this.passable([player.gx+dx, player.gy+dy])) {
            return true;
        }
        var dirs = [
            [1,0], [1,1], [0,1], [-1,1], 
            [-1,0], [-1,-1], [0,-1], [1,-1]
        ], x, y, ind;
        for (var i = 0; i < 8 ; i++) {
            if (player.grabItems[i] === null) continue;
            ind = rot == 0 ? - i : rot + i;
            [x, y] = dirs[(8 + player.startAngle + ind) % 8];
            if (!this.passable([player.gx+x+dx, player.gy+y+dy])) {
                return true;
            }
        }
        return false;
    }

    draw () {
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.cells.forEach((cell) => {
            cell.forEach((drbl) => {
                drbl.draw();
            })
        });
        this.ctx.restore();
    }
}

class Level extends GameState {
    constructor (ctx, x, y, len, w, h, px, py) {
        super(ctx);
        this.grid = new Grid(ctx, x, y, len, w, h);
        this.player = new Player(ctx, x+len/2, y+len/2, len, px, py);
        this.drawables = [this.grid, this.player];
    }

    keydown (ev) {
        if (ev.code === "ArrowLeft") {
            if (!this.grid.collide(-1, 0, 0, this.player)){
                this.player.gx--;
            }
        }
        else if (ev.code === "ArrowRight") {
            if (!this.grid.collide(1, 0, 0, this.player)){
                this.player.gx++;
            }
        }
        else if (ev.code === "ArrowUp") {
            if (!this.grid.collide(0, -1, 0, this.player)){
                this.player.gy--;
            }
        }
        else if (ev.code === "ArrowDown") {
            if (!this.grid.collide(0, 1, 0, this.player)){
                this.player.gy++;
            }
        }
        else if (ev.code === "KeyS") {
            if (!this.grid.collide(0, 0, -1, this.player)){
                this.player.startAngle = (this.player.startAngle + 7) % 8
            }
        }
        else if (ev.code === "KeyF") {
            if (!this.grid.collide(0, 0, 1, this.player)){
                this.player.startAngle = (this.player.startAngle + 1) % 8
            }
        }
        else {
            for (var i = 0; i < 8; i++){
                if (ev.code === "Key" + "DCXZAQWE"[i]) {
                    var ind = (8 + i - this.player.startAngle) % 8;
                    if (this.player.grabItems[ind] === null){
                        var dirs = [
                            [1,0], [1,1], [0,1], [-1,1], 
                            [-1,0], [-1,-1], [0,-1], [1,-1]
                        ];
                        var [x,y] = dirs[i];
                        if (this.grid.passable([
                            this.player.gx+x,
                            this.player.gy+y
                        ])){
                            this.player.grabItems[ind] = true;
                        }
                    }
                    else {
                        this.player.grabItems[ind] = null;
                    }
                    break;
                }
            }
        }
        console.log(this.player.startAngle, this.player.grabItems);
        return false;
    }
}

cnv = document.getElementById("cnv-main");
ctx = cnv.getContext("2d");

var levels = [];

itemList = new Map([
    [
        "FL0", [Floor, [
            ["P", (len)=>["M0 0h","v","h-","z"].join(len), "#aaa", null],
        ]]
    ],
    [
        "FL1", [Floor, [
            ["P", (len)=>["M0 0h","v","h-","z"].join(len), "#777", null],
        ]]
    ],
    [
        "WL0", [Wall, [
            ["P", (len)=>["m0 0h","v","h-","z"].join(len), "#aad", null],
            ["P", (len)=>["m10 10h","v","h-","z"].join(len-20), "#77a", null],
        ]]
    ],
])
maps = [
    [ // Level 0
        [["FL1"], null   , ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["WL0"], ],
        [["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ],
        [["FL1"], null   , ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["WL0"], ],
        [["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ],
    ]
]
levels.push(new Level(ctx,0,0,80,10,7,3,0));
levels[0].grid.register(maps[0],itemList);