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
        this.world = null;
        this.sx = this.sy = this.sz = null;
        this.grabbed = false;
    }

    save (z) {
        this.sx = this._gx;
        this.sy = this._gy;
        this.sz = z;
    }

    reset () {
        this.gx = this.sx;
        this.gy = this.sy;
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

    grab (player, state) {
        if (this.grabbable) {
            this.grabbed = state;
        }
        return this.grabbable;
    }
}

class Exit extends Item {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Exit", x, y, len, gx, gy);
        this.passable = true;
        this.dynamic = true;
    }

    spec (tlvl, tx, ty, tang) {
        this.target = tlvl;
        this.tx = tx;
        this.ty = ty;
        this.tangle = tang
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

class Gate extends Item {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Gate", x, y, len, gx, gy);
        this.hoverable = false;
        this._state = null;
    }

    spec (state) {
        this.state = state;
    }

    save () {
        this.saveState = this._state;
    }

    reset () {
        this.state = this.saveState;
    }

    get state() {
        return this._state;
    }

    set state(val) {
        this._state = this.passable = this.hoverable = val;
    }

    draw () {
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.drawables[this._state ? 1 : 0].draw();
        this.ctx.restore();
    }
}

class Switch extends Item {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Switch", x, y, len, gx, gy);
        this._state = false;
        this.saveState = this.tag = null;
    }

    spec (state, tag) {
        this.state = state;
        this.tag = tag;
    }

    save () {
        this.saveState = this._state;
    }

    reset () {
        this.state = this.saveState;
    }

    get state() {
        return this._state;
    }

    set state(val) {
        this._state = val;
        if (val) {
            this.world.states.add(this.tag);
        }
        else {
            this.world.states.remove(this.tag);
        }
    }

    draw () {
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.drawables[this._state ? 1 : 0].draw();
        this.ctx.restore();
    }
}

class FloorSwitch extends Switch {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Floor Switch", x, y, len, gx, gy);
        this.passable = true;
    }
}

class WallSwitch extends Switch {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Wall Switch", x, y, len, gx, gy);
        this.hoverable = false;
        this.grabbable = true;
    }

    grab (player, state) {
        this.state = !(this.state);
        return false;
    }
}

class EGate extends Gate {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "EGate", x, y, len, gx, gy);
        this.tag = null;
        this.inv = false;
        this.state = false;
    }

    spec (inv, tag) {
        this.inv = inv;
        this.tag = tag;
    }

    save () {
        this.saveState = this._state;
    }

    reset () {
        this.state = this.saveState;
    }

    get state() {
        return this._state;
    }

    set state(val) {
        this._state = this.passable = this.hoverable = val ^ this.inv;
    }

    force () {
        this.state = !(this.inv);
    }

    draw () {
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.drawables[this._state ? 1 : 0].draw();
        this.ctx.restore();
    }
}

class Player extends Item {
    constructor (ctx, x, y, len) {
        super(ctx, "Player", x, y, len);
        this.passable = true;
        var path = "m0-30a30 30 0 1 1 0 60a30 30 0 1 1 0-60";
        this.body = new Path(ctx, null, null, path, "purple", null);
        this.legs = [
            new Path(ctx, null, null, "m0 0h50", null, "purple"),
            new Path(ctx, null, null, "m0 0h130", null, "purple"),
            new Path(ctx, null, null, "m0 30l80 30M0 60L80 30", null, "purple"),
        ];
        this.grabItems = [null, null, null, null, null, null, null, null];
        this.saveItems = null;
        this._startAngle = 5;
        this.saveAngle = null;
        this.drawables = [this.body, ...this.legs];
        this.dirs = [
            [1,0], [1,1], [0,1], [-1,1], 
            [-1,0], [-1,-1], [0,-1], [1,-1]
        ];
    }

    save () {
        this.sx = this._gx;
        this.sy = this._gy;
        this.saveItems = this.grabItems.slice();
        this.saveAngle = this._startAngle;
    }

    reset () {
        this.gx = this.sx;
        this.gy = this.sy;
        this._startAngle = this.saveAngle;
        this.grabItems = this.saveItems.slice();
    }

    get startAngle () {
        return this._startAngle;
    }

    set startAngle (value) {
        var x, y, x_, y_, item;
        for (var i = 0; i < 8; i++) {
            item = this.grabItems[i];
            if (item !== null) {
                [x, y] = this.dirs[(this._startAngle + i) % 8];
                [x_, y_] = this.dirs[(value + i) % 8];
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
        for (var angle = this._startAngle % 8 / 4 * Math.PI, i = 0,
            item = this.grabItems[i];
            i < 8;
            angle += Math.PI/4, i++, item = this.grabItems[i]){
            this.ctx.save();
            this.ctx.translate(this.len/2, this.len/2);
            this.ctx.rotate(angle);
            this.legs[item===null?0:1].draw();
            this.ctx.restore();
            if (item !== null) {
                this.ctx.save();
                item.draw();
                this.ctx.translate(
                    this.len * (item.gx - this.gx),
                    this.len * (item.gy - this.gy)
                )
                this.legs[2].draw();
                this.ctx.restore();
            }
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
        "BOX", [
            [Item, "Box", true, false, false], 
            [
                ["P", (len)=>`m10 10h${len-20}v${len-20}H10z`, "#d47912", null],
                ["P", (len)=>`m30 20h${len-50}v${len-50}zM20 30v${len-50}h${len-50}z`, "#f89c67", null],
                ["P", (len)=>`m20 20h${len-40}v${len-40}H20z`, null, "#f89c67"],
            ]
        ]
    ],
    [
        "WSW", [
            [WallSwitch], 
            [
                ["P", (len)=>["M15 15H","V","H15Z"].join(len-15), "#9a9a9b", null],
                ["P", (len)=>["M0 0H","V","H0Z"].join(len), "#12ef13", null],
            ]
        ]
    ],
    [
        "FSW", [
            [FloorSwitch], 
            [
                ["P", (len)=>["M15 15H","V","H15Z"].join(len-15), "#9a9a9b", null],
                ["P", (len)=>["M0 0H","V","H0Z"].join(len), "#12ef13", null],
            ]
        ]
    ],
    [
        "EGT", [
            [EGate], 
            [
                ["P", (len)=>["M15 15H","V","H15Z"].join(len-15), "red", null],
                // ["P", (len)=>["M5 5L"," ","M"," 5L5 ",""].join(len-5), null, "red"],
                ["P", ()=>"", null, null],
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