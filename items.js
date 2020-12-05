class Item extends DrawableGroup {
    constructor (ctx, name, x, y, len, gx, gy, grab, pass, hov, dyn) {
        super(ctx, x, y);
        this.name = name;
        this.len = len;
        this._gx = gx;
        this._gy = gy;
        this.drawables = [];
        this.grabbable = grab ?? false;
        this.passable = pass ?? false;
        this.hoverable = hov ?? true;
        this.dynamic = dyn ?? false;
    }

    spec (...specs) {
        ;
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

class Exit extends Item {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Exit", x, y, len, gx, gy);
        this.passable = true;
        this.dynamic = true;
    }

    spec (dest) {
        this.destination = dest;
    }
}

class Floor extends Item {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Floor", x, y, len, gx, gy);
        this.passable = true;
    }
}

class Wall extends Item {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Wall", x, y, len, gx, gy);
        this.hoverable = false;
    }
}

class Player extends Item {
    constructor (ctx, x, y, len, gx, gy) {
        super(ctx, "Player", x, y, len, gx, gy);
        this.passable = true;
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

itemList = new Map([
    [
        "FL0", [
            [Floor], 
            [
                ["P", (len)=>["M0 0h","v","h-","z"].join(len), "#aaa", null],
            ]
        ]
    ],
    [
        "FL1", [
            [Floor], 
            [
                ["P", (len)=>["M0 0h","v","h-","z"].join(len), "#777", null],
            ]
        ]
    ],
    [
        "WL0", [
            [Wall], 
            [
                ["P", (len)=>["m0 0h","v","h-","z"].join(len), "#aad", null],
                ["P", (len)=>["m10 10h","v","h-","z"].join(len-20), "#77a", null],
            ]
        ]
    ],
    [
        "PUD", [
            [Item, "Puddle", false, false, true], 
            [
                ["P", (len)=>"M39 28A21 10 0 1 1 47 25M28 52A29 15 0 1 1 41 55M50 71A24 12 0 1 1 52 70", "aqua", null],
            ]
        ]
    ],
    [
        "SPN", [
            [Item, "Sponge", true, false, false], 
            [
                ["P", (len)=>"M15 15A21 10 0 1 1 65 15C55 20 55 60 65 65A21 10 0 1 1 15 65C25 60 25 20 15 15", "orange", null],
            ]
        ]
    ],
    [
        "CH0", [
            [Item, "Chair", true, false, false], 
            [
                ["P", (len)=>`m15 10v${len-20}m0-${len/2-10}h40v${len/2-10}`, null, "#d47912"],
            ]
        ]
    ],
    [
        "EXT", [
            [Exit], 
            [
                ["P", (len)=>["M5 5L"," ","M"," 5L5 ",""].join(len-5), null, "red"],
            ]
        ]
    ],
])