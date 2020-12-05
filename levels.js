class Item extends DrawableGroup {
    constructor (ctx, name, x, y, len, gx, gy, grab, pass) {
        super(ctx, x, y);
        this.name = name;
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
        super(ctx, "Player", x, y, len, gx, gy, false, true);
        var path = "m0-30a30 30 0 1 1 0 60a30 30 0 1 1 0-60";
        this.body = new Path(ctx, len*gx, len*gy, path, "purple", null);
        this.legs = [
            new Path(ctx, len*gx, len*gy, "m0 0h50", null, "purple"),
            new Path(ctx, len*gx, len*gy, "m0 0h130", null, "purple"),
        ];
        this.grabItems = [null, null, null, null, null, null, null, null];
        this._startAngle = 5;
        this.drawables = [this.body, ...this.legs];
    }

    get startAngle () {
        return this._startAngle;
    }

    set startAngle (value) {
        var dirs = [
            [1,0], [1,1], [0,1], [-1,1], 
            [-1,0], [-1,-1], [0,-1], [1,-1]
        ], x, y, x_, y_, item;
        for (var i = 0; i < 8; i++) {
            item = this.grabItems[i];
            if (item !== null) {
                [x, y] = dirs[(this._startAngle + i) % 8];
                [x_, y_] = dirs[(value + i) % 8];
                item.gx += x_ - x;
                item.gy += y_ - y;
            }
        }
        this._startAngle = value;
    }

    get gx () {
        return this._gx;
    }

    set gx (value) {
        this.grabItems.forEach((item)=>{
            if (item !== null) {
                item.gx += value - this._gx;
            }
        })
        this._gx = value;
        this.drawables.forEach((drbl)=>{
            drbl.x = this._gx * this.len;
        })
    }

    get gy () {
        return this._gy;
    }

    set gy (value) {
        this.grabItems.forEach((item)=>{
            if (item !== null) {
                item.gy += value - this._gy;
            }
        })
        this._gy = value;
        this.drawables.forEach((drbl)=>{
            drbl.y = this._gy * this.len;
        })
    }

    draw () {
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        for (var angle = this._startAngle % 8 / 4 * Math.PI , i = 0;
            i < 8;
            angle += Math.PI/4, i++){
            this.ctx.save();
            this.ctx.translate(this.len/2, this.len/2);
            this.ctx.rotate(angle);
            this.legs[this.grabItems[i]===null?0:1].draw();
            this.ctx.restore();
            this.ctx.save();
            if (this.grabItems[i] !== null) {
                this.grabItems[i].draw();
            }
            this.ctx.restore();
        }
        this.ctx.save();
        this.ctx.translate(this.len/2, this.len/2);
        this.body.draw();
        this.ctx.restore();
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
                        var [name, grab, pass] = itm
                        var item = new Item(
                            this.ctx, name, this.x, this.y,
                            this.len, c, r, grab, pass
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

    pop (r, c) {
        var cell = this.cells.get([r, c]);
        var ret = cell.pop();
        if (cell.length == 0) this.cells.set([r, c], undefined);
        return ret;
    }

    push (r, c, itm) {
        var cell = this.cells.get([r, c]);
        if (cell == undefined) {
            cell = []
            this.cells.set([r, c], cell);
        }
        itm.gx = c;
        itm.gy = r;
        return cell.push(itm);
    }

    // Check if the cell at the given position is grabbable
    grabbable (r, c) {
        var cell = this.cells.get([r, c]);
        if (cell === undefined) return false;
        return cell[cell.length - 1].grabbable;
    }

    // Check if the cell at the given position is passable
    passable (r, c) {
        var cell = this.cells.get([r, c]);
        if (cell === undefined) return false;
        return !(cell.some((item) => item.passable == false));
    }

    // Check if the player collides with anything that isn't passable
    collide (dx, dy, rot, player) {
        if (rot == 0 && !this.passable(player.gy+dy, player.gx+dx)) {
            return true;
        }
        var dirs = [
            [1,0], [1,1], [0,1], [-1,1], 
            [-1,0], [-1,-1], [0,-1], [1,-1]
        ], x, y;
        for (var i = 0; i < 8 ; i++) {
            if (player.grabItems[i] === null) continue;
            [x, y] = dirs[(8 + player.startAngle + i + rot) % 8];
            if (!this.passable(player.gy+y+dy, player.gx+x+dx)) {
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
        this.player = new Player(ctx, x, y, len, px, py);
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
                    var dirs = [
                        [1,0], [1,1], [0,1], [-1,1], 
                        [-1,0], [-1,-1], [0,-1], [1,-1]
                    ];
                    var [x,y] = dirs[i];
                    if (this.player.grabItems[ind] === null){
                        if (this.grid.grabbable(
                            this.player.gy + y,
                            this.player.gx + x
                        )){
                            this.player.grabItems[ind] = this.grid.pop(
                                this.player.gy + y,
                                this.player.gx + x
                            );
                        }
                    }
                    else {
                        this.grid.push(
                            this.player.gy + y,
                            this.player.gx + x,
                            this.player.grabItems[ind]
                        );
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
        "FL0", [
            ["Floor", false, true], 
            [
                ["P", (len)=>["M0 0h","v","h-","z"].join(len), "#aaa", null],
            ]
        ]
    ],
    [
        "FL1", [
            ["Floor", false, true], 
            [
                ["P", (len)=>["M0 0h","v","h-","z"].join(len), "#777", null],
            ]
        ]
    ],
    [
        "WL0", [
            ["Wall", false, false], 
            [
                ["P", (len)=>["m0 0h","v","h-","z"].join(len), "#aad", null],
                ["P", (len)=>["m10 10h","v","h-","z"].join(len-20), "#77a", null],
            ]
        ]
    ],
    [
        "CH0", [
            ["Chair", true, false], 
            [
                ["P", (len)=>`m15 10v${len-20}m0-${len/2-10}h40v${len/2-10}`, null, "#d47912"],
            ]
        ]
    ],
])
maps = [
    [ // Level 0
        [["FL1"], null   , ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["WL0"], ],
        [["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ],
        [["FL1"], null   , ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["WL0"], ],
        [["FL0"], ["FL1"], ["FL0","CH0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ],
    ]
]
levels.push(new Level(ctx,0,0,80,10,7,3,0));
levels[0].grid.register(maps[0],itemList);