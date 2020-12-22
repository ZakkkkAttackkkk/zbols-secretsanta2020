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
        this.hoverable = true;
        this.state = false;
        this.tag = null;
    }

    spec (tag) {
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
        this._state = this.passable = val;
    }

    draw () {
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.drawables[this._state ? 1 : 0].draw();
        this.ctx.restore();
    }
}

class Key extends Item {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Key", x, y, len, gx, gy);
        this.grabbable = true;
        this.passable = true;
        this.hoverable = true;
        this.tag = null;
    }

    spec (tag) {
        this.tag = tag;
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
        this.body = new Sprite(ctx, "img/tileset.png", 0, 100, len, len, null, null, len, len);
        this.legs = [
            new Sprite(ctx, "img/tileset.png", 0, 150, 0, 10, 0, 0, 0, 10),
            new Sprite(ctx, "img/tileset.png", 50, 100, 50, 50, 0, 0, len, len),
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
            if (item == null) {
                this.legs[0].sw = this.legs[0].w = 25;
                this.legs[0].sx = 50;
            }
            else {
                this.legs[0].sw = this.legs[0].w = 75;
                this.legs[0].sx = 0;
            }
            this.legs[0].draw();
            this.ctx.restore();
            if (item !== null) {
                this.ctx.save();
                item.draw();
                this.ctx.translate(
                    this.len * (item.gx - this.gx),
                    this.len * (item.gy - this.gy)
                )
                this.legs[1].draw();
                this.ctx.restore();
            }
        }
        this.ctx.save();
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
                ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y, len, len]],
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
                ["S", "img/tileset.png", (x,y,len)=>[300, 0, len, len, x, y, len, len]],
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
                ["P", ()=>"", null, null],
            ]
        ]
    ],
    [
        "GAT", [
            [Gate], 
            [
                ["P", (len)=>`M0 20H20V${len-20}H0M0 ${len/2}H20M${len} 20h-20V${len-20}h20M${[len,len/2]}h-20M20 20L${[len-20,len-20]}M20 ${len-20}L${len-20} 20`, null, "brown"],
                ["P", (len)=>`M0 20H20V${len-20}H0M0 ${len/2}H20M${len} 20h-20V${len-20}h20M${[len,len/2]}h-20`, null, "brown"],
            ]
        ]
    ],
    [
        "KEY", [
            [Key], 
            [
                ["P", ()=>"M30 45L40 55M30 65L20 55L45 30A5 5 0 1 1 60 15A5 5 0 1 1 45 30", null, "gold"],
            ]
        ]
    ],
    [
        "EXT", [
            [Exit], 
            []
        ]
    ],
    [
        "DrN", [
            [Floor], 
            [
                ["S", "img/tileset.png", (x,y,len)=>[100, 100, len, len, x, y, len, len]],
            ]
        ]
    ],
    [
        "DrE", [
            [Floor], 
            [
                ["S", "img/tileset.png", (x,y,len)=>[150, 100, len, len, x, y, len, len]],
            ]
        ]
    ],
    [
        "DrW", [
            [Floor], 
            [
                ["S", "img/tileset.png", (x,y,len)=>[100, 150, len, len, x, y, len, len]],
            ]
        ]
    ],
    [
        "DrS", [
            [Floor], 
            [
                ["S", "img/tileset.png", (x,y,len)=>[150, 150, len, len, x, y, len, len]],
            ]
        ]
    ],
])