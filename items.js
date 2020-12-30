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
        this.grabLeg = null;
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

    grab (level, leg, state) {
        if (this.grabbable) {
            var cell = level.grid.cells.get([level.player.gy, level.player.gx]);
            var narrow = cell.some((el) => 
                el.name == "Narrow Shelf");
            if (narrow) {
                return false;
            }
            this.grabLeg = state ? leg : null;
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

    spec (tlvl, tx, ty, tang, drop) {
        this.target = tlvl;
        this.tx = tx;
        this.ty = ty;
        this.tangle = tang
        this.drop = drop
    }
    
    test (level) {
        if (this.gx == level.player.gx &&
            this.gy == level.player.gy) {
            var count = level.player.grabItems.filter((el)=> el!=null).length;
            if (count <= (this.tangle == null ? 0 : 1)) {
                var grab = null, i;
                if (count > 0) {
                    for (i = 7; i >= 0; i--) {
                        if (level.player.grabItems[i] != null) {
                            grab = level.player.grabItems[i];
                            break;
                        }
                    }
                }
                return [
                    "grid",
                    (level, i, a, b, c, d, e, grab) => {
                        if (i != null) {
                            grab.grab(level, i, false);
                            level.player.grabItems[i] = null;
                        }
                        level.player.gx = level.player.gy = null;
                        setLevel(a, b, c, d, e, grab);
                    },
                    [
                        level, i, 
                        this.target, this.tx, this.ty,
                        [this.gy, this.gx], this.tangle, grab
                    ]
                ];
            }
        }
    }
}

class FrontDoor extends Item {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Front Door", x, y, len, gx, gy);
        this.passable = true;
        this.dynamic = true;
    }
    
    test (level) {
        if (level.world.fetch == 1) { // fetching rescues
            this.passable = false;
            if (level.world.rescues.values.length == 31) {
                return [
                    null,
                    (gate) => {
                        say("That's everyone!");
                        level.world.fetch = 2;
                    },
                    [this]
                ];
            }
        }
        else if (level.world.fetch == 2) { // all rescued
            this.passable = true;
            if (level.player.gx == this.gx &&
                level.player.gy == this.gy) {
                return [
                    null,
                    () => {
                        document.getElementById("saved").classList.add("hide");
                        states.push(winMenu);
                    },
                    []
                ];
            }
        }
        else {
            if (level.player.gx == this.gx &&
                level.player.gy == this.gy) {
                return [
                    null,
                    (level, gate) => {
                        say("<q>Aren't you taking everyone else with you?</q>");
                        level.world.fetch = 1;
                        var sec = document.getElementById("saved");
                        sec.classList.remove("hide");
                        sec.children[0].innerHTML = "00/31"
                        gate.passable = false;
                    },
                    [level, this]
                ];
            }
        }
    }
}

class Floor extends Item {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Floor", x, y, len, gx, gy);
        this.passable = true;
    }
}

class Tile extends Floor {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Tile", x, y, len, gx, gy);
        this.hoverable = null;
        this.passable = null;
    }

    spec (x, y) {
        this.drawables[0].sx = x;
        this.drawables[0].sy = y;
    }
}

class Wall extends Item {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Wall", x, y, len, gx, gy);
        this.hoverable = false;
    }
}

class Mess extends Item {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Mess", x, y, len, gx, gy);
        this.cleaner = "Cleaner";
    }
    
    test (level) {
        var has = level.player.grabItems.some((grab) => 
            grab != null && grab.name == this.cleaner &&
            grab.gx == this.gx && grab.gy == this.gy,
            this);
        var set = level.grid.cells.get([this.gy, this.gx]).some((item) => 
            item.name == "Ladder");
        var held = level.player.grabItems.some((item) => 
            item != null && item.name == "Ladder" &&
            item.gx == this.gx && item.gy == this.gy,
            this);
        if (has || set || held) {
            return [
                null,
                (grid, x, y, pop, item, pass) => {
                    if (pop) grid.pop(y, x);
                    item.passable = pass;
                },
                [level.grid, this.gx, this.gy, has, this, set || held]
            ]
        }
    }
}

class Puddle extends Mess {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Puddle", x, y, len, gx, gy);
        this.cleaner = "Mop";
    }
}

class Trash extends Mess {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Trash", x, y, len, gx, gy);
        this.cleaner = "Broom";
    }
}

class Wires extends Mess {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Live Wires", x, y, len, gx, gy);
        this.cleaner = "";
    }
}

class Gate extends Item {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Gate", x, y, len, gx, gy);
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
        this.drawables[0].draw();
        if (!this._state) {
            this.drawables[1].draw();
        }
        this.ctx.restore();
    }
}

class BoardedDoor extends Gate {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Boarded Door", x, y, len, gx, gy);
    }
    
    draw () {
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.drawables[0].draw();
        this.drawables[1].draw();
        if (!this._state) {
            this.drawables[2].draw();
        }
        this.ctx.restore();
    }
    
    test (level) {
        return [
            null,
            (item, state) => item.state = state,
            [this, level.world.states.has(this.tag)]
        ];
    }
}

class EDoor extends Gate {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "E-Door", x, y, len, gx, gy);
    }

    draw () {
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.drawables[this._state ? 1 : 0].draw();
        this.ctx.restore();
    }
    
    test (level) {
        return [
            null,
            (item, state) => {item.state = state},
            [this, level.world.states.has(this.tag)]
        ];
    }
}

class Vent extends Item {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Vent", x, y, len, gx, gy);
        this.hoverable = false;
    }
    
    test (level) {
        return [
            null,
            (item, state) => {
                item.passable = state;
            },
            [this, level.grid.peek(this.gy+1, this.gx).name == "Ladder"]
        ];
    }
}

class DrainCover extends Item {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Drain Cover", x, y, len, gx, gy);
        this.passable = true;
        this.tag = 90;
    }
    
    test (level) {
        if (level.world.states.has(this.tag)) {
            return [
                "grid",
                (grid, x, y) => grid.pop(y, x),
                [level.grid, this.gx, this.gy]
            ];
        }
        else return ["cell",()=>{},[]];
    }
}

class Crowbar extends Item {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Crowbar", x, y, len, gx, gy);
        this.grabbable = true;
        this.passable = true;
    }
    
    test (level) {
        var cell = level.grid.cells.get([this.gy, this.gx]);
        var gate = cell.find((item) => 
            item.name == "Drain Cover" || item.name == "Boarded Door"
        );
        if (gate != null) {
            return [
                "cell",
                (world, tag) => world.states.add(tag), 
                [level.world, gate.tag]
            ]
        }
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
        this.coords = [
            [8, 9], [8, 10], [9, 9], [9, 10],
            [10, 9], [10, 10], [11, 10],
            
            [10, 6], [11, 6], [10, 7], [11, 7],
            [10, 8], [11, 8], [11, 9],
            
            [8, 6], [9, 6], [8, 7],
            [9, 7], [8, 8], [9, 8],
        ];
        
        this.drawables[0].sx = 50 * this.coords[tag][0];
        this.drawables[0].sy = 50 * this.coords[tag][1];
    }
    
    test (level) {
        var cell = level.grid.cells.get([this.gy, this.gx]);
        var gate = cell.find((item) => 
            (item.name == "Key Gate" || item.name == "E-Door") &&
            Math.floor(item.tag) == this.tag &&
            !item.state,
            this);
        if (gate != null) {
            return [
                null,
                (gate, item, player, states) => {
                    gate.state = true;
                    player.grabItems[item.grabLeg] = null;
                    states.add(gate.tag);
                },
                [gate, this, level.player, level.world.states]
            ]
        }
    }
}

class Switch extends Item {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Switch", x, y, len, gx, gy);
        this._state = false;
        this.saveState = this.tag = null;
    }

    spec (tag) {
        this.tag = tag;
        this.drawables.forEach((drbl) => {
            drbl.sy += 50 * (tag % 5);
        });
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
    
    test (level) {
        var cell = level.grid.cells.get([this.gy, this.gx]);
        if (cell[cell.length-1] != this || (
                this.gx == level.player.gx &&
                this.gy == level.player.gy
            ) || level.player.grabItems.some((item) => 
                item != null && item.gx == this.gx && item.gy == this.gy
            , this)) {
            return [
                null,
                (level, item) => {
                    level.world.states.add(item.tag);
                    item.state = true;
                }, 
                [level, this]
            ];
        }
        else {
            return [
                null,
                (level, item) => {
                    level.world.states.remove(item.tag);
                    item.state = false;
                },
                [level, this]
            ];
        }
    }
}

class WallSwitch extends Switch {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Wall Switch", x, y, len, gx, gy);
        this.hoverable = false;
        this.grabbable = true;
    }

    grab (level, leg, state) {
        this.state = !(this.state);
        return false;
    }
}

class EGate extends Gate {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "E-Gate", x, y, len, gx, gy);
        this.inv = false;
        this.state = false;
    }

    spec (inv, tag) {
        this.inv = !!inv;
        this.tag = tag;
    }

    save () {
        this.saveState = this._state;
    }

    reset () {
        this.state = this.saveState;
    }
    
    get tag () {
        return this._tag;
    }
    
    set tag (val) {
        this._tag = val;
        if (this.drawables.length) {
            var gate = this.drawables[1];
            gate.sy += 100 * (val % 5 % 4);
            if ((val % 5) >= 4) gate.sx += 100;
        }
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
    
    test (level) {
        var cell = level.grid.cells.get([this.gy, this.gx]);
        if (cell[cell.length-1] != this ||
            (level.player.gx == this.gx && 
            level.player.gy == this.gy) ||
            level.player.grabItems.some((item) => 
                item != null && item.gx == this.gx && item.gy == this.gy
            , this))
            return [
                null,
                (itm) => itm.force(),
                [this]
            ];
        else return [
            null,
            (item, state) => {item.state = state},
            [this,level.world.states.has(this.tag)]
        ];
    }
}

class SwitchGate extends EGate {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Switch Gate", x, y, len, gx, gy);
    }
    
    get tag () {
        return this._tag;
    }
    
    set tag (val) {
        this._tag = val;
    }
}

class Rescue extends Item {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Rescue", x, y, len, gx, gy);
        this.grabbable = true;
        this.hoverable = null;
        this.passable = null;
        this.msgs = [
            "Please don't grab me!",
            "I would much prefer to be left alone here.",
            "No grabby!",
            "Let me be.",
        ]
    }
    
    spec (id) {
        this.id = id;
        var inds = [
            1, 2, 3, 4, 10, 13, 7,
            6, 7, 9, 6, 14, 11, 12, 5, 
            16, 21, 2, 15, 22, 14, 13, 20,
            11, 3, 17, 18, 19, 23, 4, 8,
        ];
        this.drawables[0].sx = 400 + 50 * (inds[id-1] % 12);
        this.drawables[0].sy = 50 * Math.floor((inds[id-1] / 12));
    }

    grab (level, leg, state) {
        if (level.world.fetch) {
            this.grabLeg = state ? leg : null;
            return true;
        }
        else {
            var ind = Math.floor(Math.random() * this.msgs.length);
            say(`<q>${this.msgs[ind]}</q>`);
            return false;
        }
    }
    
    test (level) {
        var cell = level.grid.cells.get([this.gy, this.gx]);
        var gate = cell.find((item) => 
            item.name == "Front Door" ||
            (item.name == "Exit" && item.drop)
        );
        if (gate?.name == "Front Door") {
            return [
                null,
                (level, item) => {
                    level.world.rescues.add(item.id);
                    var p = document.getElementById("saved").children[0];
                    var count = (100 + level.world.rescues.values.length).toString();
                    p.innerHTML = count.slice(1) + "/31";
                    var leg = item.grabLeg;
                    item.grab(level, leg, false);
                    level.player.grabItems[leg] = null;
                }, 
                [level, this]
            ]
        }
        else if (gate?.name == "Exit") {
            return [
                null,
                (level, gate, item) => {
                    var leg = item.grabLeg;
                    item.grab(level, leg, false);
                    level.player.grabItems[leg] = null;
                    levels[gate.target].grid.push(gate.ty, gate.tx, item);
                }, 
                [level, gate, this]
            ]
        }
    }
}

class Player extends Item {
    constructor (ctx, x, y, len) {
        super(ctx, "Player", x, y, len);
        this.passable = true;
        this.body = new Sprite(ctx, "img/tileset.png", 250, 150, len, len, null, null);
        this.legs = [
            new Sprite(ctx, "img/tileset.png", 250, 100, 0, 15, 0, 0),
            new Sprite(ctx, "img/tileset.png", 300, 150, len, len, 0, 0),
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
        this.grabItems.forEach((grab) => grab?.save());
        this.saveItems = this.grabItems.slice();
        this.saveAngle = this._startAngle;
    }

    reset () {
        this.gx = this.sx;
        this.gy = this.sy;
        this._startAngle = this.saveAngle;
        this.grabItems = this.saveItems.slice();
        this.grabItems.forEach((grab) => grab?.reset());
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
                this.legs[0].sx = 250;
            }
            else {
                this.legs[0].sw = this.legs[0].w = 75;
                this.legs[0].sx = 200;
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
    ["---", [[Tile], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y]],
    ]]],
    
    ["###", [[Rescue], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y]],
    ]]],
    
    ["WlN", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y]],
    ]]],
    ["WlE", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 0, len, len, x, y]],
    ]]],
    ["WlW", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 50, len, len, x, y]],
    ]]],
    ["WlS", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 50, len, len, x, y]],
    ]]],
    ["WNW", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[100, 0, len, len, x, y]],
    ]]],
    ["WNE", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[150, 0, len, len, x, y]],
    ]]],
    ["WSW", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[100, 50, len, len, x, y]],
    ]]],
    ["WSE", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[150, 50, len, len, x, y]],
    ]]],
    ["CNW", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[200, 0, len, len, x, y]],
    ]]],
    ["CNE", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[250, 0, len, len, x, y]],
    ]]],
    ["CSW", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[200, 50, len, len, x, y]],
    ]]],
    ["CSE", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[250, 50, len, len, x, y]],
    ]]],
    
    ["Bx1", [[Item, "Box", true, false, false], [
        ["S", "img/tileset.png", (x,y,len)=>[300, 500, len, len, x, y]],
    ]]],
    ["Bx2", [[Item, "Box", true, false, false], [
        ["S", "img/tileset.png", (x,y,len)=>[350, 500, len, len, x, y]],
    ]]],
    
    ["DrN", [[Floor, "Door"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[0, 100, len, len, x, y]],
    ]]],
    ["DrE", [[Floor, "Door"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 0, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[50, 100, len, len, x, y]],
    ]]],
    ["DrW", [[Floor, "Door"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 50, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[0, 150, len, len, x, y]],
    ]]],
    ["DrS", [[Floor, "Door"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 50, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[50, 150, len, len, x, y]],
    ]]],
    
    ["BdN", [[BoardedDoor], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[0, 100, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[100, 100, len, len, x, y]],
    ]]],
    ["BdE", [[BoardedDoor], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 0, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[50, 100, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[150, 100, len, len, x, y]],
    ]]],
    ["BdW", [[BoardedDoor], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 50, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[0, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[100, 150, len, len, x, y]],
    ]]],
    ["BdS", [[BoardedDoor], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 50, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[50, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[150, 150, len, len, x, y]],
    ]]],
    
    ["Sh0", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[100, 400, len, len, x, y]],
    ]]],
    ["Sh1", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 300, len, len, x, y]],
    ]]],
    ["Sh2", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[100, 300, len, len, x, y]],
    ]]],
    ["Sh3", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[150, 300, len, len, x, y]],
    ]]],
    ["Sh4", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 350, len, len, x, y]],
    ]]],
    ["Sh5", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 350, len, len, x, y]],
    ]]],
    ["Sh6", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[100, 350, len, len, x, y]],
    ]]],
    ["Sh7", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[150, 350, len, len, x, y]],
    ]]],
    ["Sh8", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 400, len, len, x, y]],
    ]]],
    ["Sh9", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 400, len, len, x, y]],
    ]]],
    ["ShB", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[150, 400, len, len, x, y]],
    ]]],
    ["ShC", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 450, len, len, x, y]],
    ]]],
    ["ShD", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 450, len, len, x, y]],
    ]]],
    ["ShE", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[100, 450, len, len, x, y]],
    ]]],
    ["ShF", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[150, 450, len, len, x, y]],
    ]]],
    
    ["Tb0", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[300, 400, len, len, x, y]],
    ]]],
    ["Tb1", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[250, 300, len, len, x, y]],
    ]]],
    ["Tb2", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[300, 300, len, len, x, y]],
    ]]],
    ["Tb3", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[350, 300, len, len, x, y]],
    ]]],
    ["Tb4", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[200, 350, len, len, x, y]],
    ]]],
    ["Tb5", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[250, 350, len, len, x, y]],
    ]]],
    ["Tb6", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[300, 350, len, len, x, y]],
    ]]],
    ["Tb7", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[350, 350, len, len, x, y]],
    ]]],
    ["Tb8", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[200, 400, len, len, x, y]],
    ]]],
    ["Tb9", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[250, 400, len, len, x, y]],
    ]]],
    ["TbB", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[350, 400, len, len, x, y]],
    ]]],
    ["TbC", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[200, 450, len, len, x, y]],
    ]]],
    ["TbD", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[250, 450, len, len, x, y]],
    ]]],
    ["TbE", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[300, 450, len, len, x, y]],
    ]]],
    ["TbF", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[350, 450, len, len, x, y]],
    ]]],
    
    ["NSW", [[Item, "Narrow Shelf", false, true, false], [
        ["S", "img/tileset.png", (x,y,len)=>[301, 100, len, len, x, y]],
    ]]],
    ["NSE", [[Item, "Narrow Shelf", false, true, false], [
        ["S", "img/tileset.png", (x,y,len)=>[276, 100, len, len, x, y]],
    ]]],
    ["NSN", [[Item, "Narrow Shelf", false, true, false], [
        ["S", "img/tileset.png", (x,y,len)=>[200, 150, len, len, x, y]],
    ]]],
    ["NSS", [[Item, "Narrow Shelf", false, true, false], [
        ["S", "img/tileset.png", (x,y,len)=>[200, 132, len, len, x, y]],
    ]]],
    
    ["Vt1", [[Vent], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[500, 100, len, len, x, y]],
    ]]],
    ["Vt2", [[Vent], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[550, 100, len, len, x, y]],
    ]]],
    ["Vt3", [[Vent], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[600, 100, len, len, x, y]],
    ]]],
    ["Vt4", [[Vent], [
        ["S", "img/tileset.png", (x,y,len)=>[650, 100, len, len, x, y]],
    ]]],
    
    ["Pud", [[Puddle], [
        ["S", "img/tileset.png", (x,y,len)=>[300, 0, len, len, x, y]],
    ]]],
    ["Tra", [[Trash], [
        ["S", "img/tileset.png", (x,y,len)=>[350, 0, len, len, x, y]],
    ]]],
    ["Wir", [[Wires], [
        ["S", "img/tileset.png", (x,y,len)=>[400, 0, len, len, x, y]],
    ]]],
    ["Brm", [[Item, "Broom", true, true, true], [
        ["S", "img/tileset.png", (x,y,len)=>[300, 50, len, len, x, y]],
    ]]],
    ["Mop", [[Item, "Mop", true, true, true], [
        ["S", "img/tileset.png", (x,y,len)=>[350, 50, len, len, x, y]],
    ]]],
    
    ["Ldr", [[Item, "Ladder", true, true, true], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 300, len, len, x, y]],
    ]]],
    ["Cbr", [[Crowbar], [
        ["S", "img/tileset.png", (x,y,len)=>[200, 300, len, len, x, y]],
    ]]],
    
    ["DrC", [[DrainCover], [
        ["S", "img/tileset.png", (x,y,len)=>[700, 100, len, len, x, y]],
    ]]],
    ["Drn", [[Item, "Drain", false, true, true], [
        ["S", "img/tileset.png", (x,y,len)=>[750, 100, len, len, x, y]],
    ]]],
    
    ["WL1", [[Item, "Wall Ladder", false, true, true], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 50, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[350, 150, len, len, x, y]],
    ]]],
    ["WL2", [[Item, "Wall Ladder", false, true, true], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 50, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[350, 100, len, len, x, y]],
    ]]],
    
    ["XDN", [[EDoor], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 200, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[100, 200, len, len, x, y]],
    ]]],
    ["XDE", [[EDoor], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 200, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[150, 200, len, len, x, y]],
    ]]],
    ["XDW", [[EDoor], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 250, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[100, 250, len, len, x, y]],
    ]]],
    ["XDS", [[EDoor], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 250, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[150, 250, len, len, x, y]],
    ]]],
    
    ["M1E", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 0, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[250, 200, len, len, x, y]],
    ]]],
    ["M1W", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 50, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[250, 250, len, len, x, y]],
    ]]],
    ["M2N", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[300, 200, len, len, x, y]],
    ]]],
    ["M2S", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 50, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[300, 250, len, len, x, y]],
    ]]],
    ["M3E", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 0, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[350, 200, len, len, x, y]],
    ]]],
    ["M3W", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 50, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[350, 250, len, len, x, y]],
    ]]],
    ["M4E", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 0, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[400, 200, len, len, x, y]],
    ]]],
    ["M4W", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 50, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[400, 250, len, len, x, y]],
    ]]],
    ["M5N", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[450, 200, len, len, x, y]],
    ]]],
    ["M5E", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 0, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[500, 200, len, len, x, y]],
    ]]],
    ["M5W", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 50, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[450, 250, len, len, x, y]],
    ]]],
    ["M5S", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 50, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[500, 250, len, len, x, y]],
    ]]],
    ["M6N", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[550, 200, len, len, x, y]],
    ]]],
    ["M6S", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 50, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[550, 250, len, len, x, y]],
    ]]],
    
    ["EGN", [[EGate], [
        ["S", "img/tileset.png", (x,y,len)=>[850, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[800, 100, len, len, x, y]],
    ]]],
    ["EGE", [[EGate], [
        ["S", "img/tileset.png", (x,y,len)=>[850, 450, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[850, 100, len, len, x, y]],
    ]]],
    ["EGW", [[EGate], [
        ["S", "img/tileset.png", (x,y,len)=>[850, 350, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[800, 150, len, len, x, y]],
    ]]],
    ["EGS", [[EGate], [
        ["S", "img/tileset.png", (x,y,len)=>[950, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[850, 150, len, len, x, y]],
    ]]],
    
    ["S1N", [[SwitchGate], [
        ["S", "img/tileset.png", (x,y,len)=>[850, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[700, 150, len, len, x, y]],
    ]]],
    ["S2N", [[SwitchGate], [
        ["S", "img/tileset.png", (x,y,len)=>[850, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[750, 150, len, len, x, y]],
    ]]],
    ["S3W", [[SwitchGate], [
        ["S", "img/tileset.png", (x,y,len)=>[850, 350, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[700, 200, len, len, x, y]],
    ]]],
    ["S3E", [[SwitchGate], [
        ["S", "img/tileset.png", (x,y,len)=>[850, 450, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[750, 200, len, len, x, y]],
    ]]],
    ["S4N", [[SwitchGate], [
        ["S", "img/tileset.png", (x,y,len)=>[850, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[700, 250, len, len, x, y]],
    ]]],
    ["S5N", [[SwitchGate], [
        ["S", "img/tileset.png", (x,y,len)=>[850, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[750, 250, len, len, x, y]],
    ]]],
    
    ["KA1", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[650, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[900, 500, len, len, x, y]],
    ]]],
    ["KA2", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[650, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[900, 450, len, len, x, y]],
    ]]],
    ["KA3", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[650, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[900, 400, len, len, x, y]],
    ]]],
    ["KA4", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[650, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[900, 350, len, len, x, y]],
    ]]],
    ["KA5", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[650, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[900, 300, len, len, x, y]],
    ]]],
    ["KA6", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[650, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[900, 250, len, len, x, y]],
    ]]],
    ["KA7", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[650, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[900, 200, len, len, x, y]],
    ]]],
    ["KB1", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[650, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[950, 500, len, len, x, y]],
    ]]],
    ["KB2", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[650, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[950, 450, len, len, x, y]],
    ]]],
    ["KB3", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[650, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[950, 400, len, len, x, y]],
    ]]],
    ["KB4", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[650, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[950, 350, len, len, x, y]],
    ]]],
    ["KB5", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[650, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[950, 300, len, len, x, y]],
    ]]],
    ["KB6", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[650, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[950, 250, len, len, x, y]],
    ]]],
    ["KB7", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[650, 150, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[950, 200, len, len, x, y]],
    ]]],
    
    ["Key", [[Key], [
        ["S", "img/tileset.png", (x,y,len)=>[400, 500, len, len, x, y]],
    ]]],
    ["WSw", [[WallSwitch], [
        ["S", "img/tileset.png", (x,y,len)=>[600, 300, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[650, 300, len, len, x, y]],
    ]]],
    ["FSw", [[FloorSwitch], [
        ["S", "img/tileset.png", (x,y,len)=>[700, 300, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[750, 300, len, len, x, y]],
    ]]],
    
    ["FL0", [[Floor], [
        ["P", (len)=>["M0 0h","v","h-","z"].join(len), "#aaa", null],
    ]]],
    ["FL1", [[Floor], [
        ["P", (len)=>["M0 0h","v","h-","z"].join(len), "#777", null],
    ]]],
    ["___", [[Wall], [
        ["P", (len)=>["M0 0h","v","h-","z"].join(len), "#0009", null],
    ]]],
    
    ["EXT", [[Exit], []]],
    ["EX1", [[FrontDoor], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 0, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[200, 200, len, len, x, y]],
    ]]],
    ["EX2", [[FrontDoor], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 0, len, len, x, y]],
        ["S", "img/tileset.png", (x,y,len)=>[200, 250, len, len, x, y]],
    ]]],
])