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

    grab (player, grid, state) {
        if (this.grabbable) {
            var cell = grid.cells.get([player.gy, player.gx]);
            var narrow = cell.some((el) => 
                el.name == "Narrow Shelf");
            if (narrow) {
                return false;
            }
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
            [8, 9],
            [8, 10],
            [9, 9],
            [9, 10],
            [10, 9],
            [10, 10],
            [11, 10],
            
            [10, 6],
            [11, 6],
            [10, 7],
            [11, 7],
            [10, 8],
            [11, 8],
            [11, 9],
            
            [8, 6],
            [9, 6],
            [8, 7],
            [9, 7],
            [8, 8],
            [9, 8],
        ];
        
        this.drawables[0].sx = 50 * this.coords[tag][0];
        this.drawables[0].sy = 50 * this.coords[tag][1];
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
}

class WallSwitch extends Switch {
    constructor (ctx, name, x, y, len, gx, gy) {
        super(ctx, name ?? "Wall Switch", x, y, len, gx, gy);
        this.hoverable = false;
        this.grabbable = true;
    }

    grab (player, grid, state) {
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
            gate.sx += 100 * (val % 5 % 3);
            if ((val % 5) >= 3) gate.sy += 100;
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
    ["WlN", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y, len, len]],
    ]]],
    ["WlE", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 0, len, len, x, y, len, len]],
    ]]],
    ["WlW", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 50, len, len, x, y, len, len]],
    ]]],
    ["WlS", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 50, len, len, x, y, len, len]],
    ]]],
    ["WNW", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[100, 0, len, len, x, y, len, len]],
    ]]],
    ["WNE", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[150, 0, len, len, x, y, len, len]],
    ]]],
    ["WSW", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[100, 50, len, len, x, y, len, len]],
    ]]],
    ["WSE", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[150, 50, len, len, x, y, len, len]],
    ]]],
    ["CNW", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[200, 0, len, len, x, y, len, len]],
    ]]],
    ["CNE", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[250, 0, len, len, x, y, len, len]],
    ]]],
    ["CSW", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[200, 50, len, len, x, y, len, len]],
    ]]],
    ["CSE", [[Wall], [
        ["S", "img/tileset.png", (x,y,len)=>[250, 50, len, len, x, y, len, len]],
    ]]],
    
    ["Bx1", [[Item, "Box", true, false, false], [
        ["S", "img/tileset.png", (x,y,len)=>[300, 0, len, len, x, y, len, len]],
    ]]],
    ["Bx2", [[Item, "Box", true, false, false], [
        ["S", "img/tileset.png", (x,y,len)=>[300, 50, len, len, x, y, len, len]],
    ]]],
    
    ["DrN", [[Floor, "Door"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[100, 100, len, len, x, y, len, len]],
    ]]],
    ["DrE", [[Floor, "Door"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 0, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[150, 100, len, len, x, y, len, len]],
    ]]],
    ["DrW", [[Floor, "Door"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 50, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[100, 150, len, len, x, y, len, len]],
    ]]],
    ["DrS", [[Floor, "Door"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 50, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[150, 150, len, len, x, y, len, len]],
    ]]],
    
    ["BdN", [[BoardedDoor], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[100, 100, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[200, 100, len, len, x, y, len, len]],
    ]]],
    ["BdE", [[BoardedDoor], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 0, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[150, 100, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[250, 100, len, len, x, y, len, len]],
    ]]],
    ["BdS", [[BoardedDoor], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 50, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[100, 150, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[250, 150, len, len, x, y, len, len]],
    ]]],
    ["BdW", [[BoardedDoor], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 50, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[150, 150, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[200, 150, len, len, x, y, len, len]],
    ]]],
    
    ["Sh0", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 300, len, len, x, y, len, len]],
    ]]],
    ["Sh1", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 300, len, len, x, y, len, len]],
    ]]],
    ["Sh2", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[100, 300, len, len, x, y, len, len]],
    ]]],
    ["Sh3", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[150, 300, len, len, x, y, len, len]],
    ]]],
    ["Sh4", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 350, len, len, x, y, len, len]],
    ]]],
    ["Sh5", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 350, len, len, x, y, len, len]],
    ]]],
    ["Sh6", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[100, 350, len, len, x, y, len, len]],
    ]]],
    ["Sh7", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[150, 350, len, len, x, y, len, len]],
    ]]],
    ["Sh8", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 400, len, len, x, y, len, len]],
    ]]],
    ["Sh9", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 400, len, len, x, y, len, len]],
    ]]],
    ["ShA", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[100, 400, len, len, x, y, len, len]],
    ]]],
    ["ShB", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[150, 400, len, len, x, y, len, len]],
    ]]],
    ["ShC", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 450, len, len, x, y, len, len]],
    ]]],
    ["ShD", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 450, len, len, x, y, len, len]],
    ]]],
    ["ShE", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[100, 450, len, len, x, y, len, len]],
    ]]],
    ["ShF", [[Wall, "Shelf"], [
        ["S", "img/tileset.png", (x,y,len)=>[150, 450, len, len, x, y, len, len]],
    ]]],
    
    ["Tb0", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[200, 300, len, len, x, y, len, len]],
    ]]],
    ["Tb1", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[250, 300, len, len, x, y, len, len]],
    ]]],
    ["Tb2", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[300, 300, len, len, x, y, len, len]],
    ]]],
    ["Tb3", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[350, 300, len, len, x, y, len, len]],
    ]]],
    ["Tb4", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[200, 350, len, len, x, y, len, len]],
    ]]],
    ["Tb5", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[250, 350, len, len, x, y, len, len]],
    ]]],
    ["Tb6", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[300, 350, len, len, x, y, len, len]],
    ]]],
    ["Tb7", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[350, 350, len, len, x, y, len, len]],
    ]]],
    ["Tb8", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[200, 400, len, len, x, y, len, len]],
    ]]],
    ["Tb9", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[250, 400, len, len, x, y, len, len]],
    ]]],
    ["TbA", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[300, 400, len, len, x, y, len, len]],
    ]]],
    ["TbB", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[350, 400, len, len, x, y, len, len]],
    ]]],
    ["TbC", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[200, 450, len, len, x, y, len, len]],
    ]]],
    ["TbD", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[250, 450, len, len, x, y, len, len]],
    ]]],
    ["TbE", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[300, 450, len, len, x, y, len, len]],
    ]]],
    ["TbF", [[Item, "Table"], [
        ["S", "img/tileset.png", (x,y,len)=>[350, 450, len, len, x, y, len, len]],
    ]]],
    
    ["NSW", [[Item, "Narrow Shelf", false, true, false], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 500, len, len, x, y, len, len]],
    ]]],
    ["NSE", [[Item, "Narrow Shelf", false, true, false], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 500, len, len, x, y, len, len]],
    ]]],
    ["NSN", [[Item, "Narrow Shelf", false, true, false], [
        ["S", "img/tileset.png", (x,y,len)=>[100, 500, len, len, x, y, len, len]],
    ]]],
    ["NSS", [[Item, "Narrow Shelf", false, true, false], [
        ["S", "img/tileset.png", (x,y,len)=>[150, 500, len, len, x, y, len, len]],
    ]]],
    
    ["Vt1", [[Item, "Vent", false, false, false], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[200, 500, len, len, x, y, len, len]],
    ]]],
    ["Vt2", [[Item, "Vent", false, false, false], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[250, 500, len, len, x, y, len, len]],
    ]]],
    ["Vt3", [[Item, "Vent", false, false, false], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[300, 500, len, len, x, y, len, len]],
    ]]],
    ["Vt4", [[Item, "Vent", false, false, false], [
        ["S", "img/tileset.png", (x,y,len)=>[350, 500, len, len, x, y, len, len]],
    ]]],
    
    ["Pud", [[Item, "Puddle"], [
        ["S", "img/tileset.png", (x,y,len)=>[350, 0, len, len, x, y, len, len]],
    ]]],
    ["Mes", [[Item, "Mess"], [
        ["S", "img/tileset.png", (x,y,len)=>[400, 0, len, len, x, y, len, len]],
    ]]],
    ["Wir", [[Item, "Wires"], [
        ["S", "img/tileset.png", (x,y,len)=>[450, 0, len, len, x, y, len, len]],
    ]]],
    ["Brm", [[Item, "Broom", true, true, true], [
        ["S", "img/tileset.png", (x,y,len)=>[350, 50, len, len, x, y, len, len]],
    ]]],
    ["Mop", [[Item, "Mop", true, true, true], [
        ["S", "img/tileset.png", (x,y,len)=>[400, 50, len, len, x, y, len, len]],
    ]]],
    
    ["Ldr", [[Item, "Ladder", true, true, true], [
        ["S", "img/tileset.png", (x,y,len)=>[450, 50, len, len, x, y, len, len]],
    ]]],
    ["Cbr", [[Item, "Crowbar", true, true, true], [
        ["S", "img/tileset.png", (x,y,len)=>[500, 0, len, len, x, y, len, len]],
    ]]],
    
    ["DrC", [[Item, "Drain Cover", false, true, true], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 200, len, len, x, y, len, len]],
    ]]],
    ["Drn", [[Item, "Drain", false, true, true], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 250, len, len, x, y, len, len]],
    ]]],
    
    ["WL1", [[Item, "Wall Ladder", false, true, true], [
        ["S", "img/tileset.png", (x,y,len)=>[350, 100, len, len, x, y, len, len]],
    ]]],
    ["WL2", [[Item, "Wall Ladder", false, true, true], [
        ["S", "img/tileset.png", (x,y,len)=>[350, 150, len, len, x, y, len, len]],
    ]]],
    
    ["XDN", [[EDoor], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 200, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[150, 200, len, len, x, y, len, len]],
    ]]],
    ["XDE", [[EDoor], [
        ["S", "img/tileset.png", (x,y,len)=>[100, 200, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[200, 200, len, len, x, y, len, len]],
    ]]],
    ["XDW", [[EDoor], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 250, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[150, 250, len, len, x, y, len, len]],
    ]]],
    ["XDS", [[EDoor], [
        ["S", "img/tileset.png", (x,y,len)=>[100, 250, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[200, 250, len, len, x, y, len, len]],
    ]]],
    
    ["M1E", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 0, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[250, 200, len, len, x, y, len, len]],
    ]]],
    ["M1W", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 50, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[250, 250, len, len, x, y, len, len]],
    ]]],
    ["M2N", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[300, 200, len, len, x, y, len, len]],
    ]]],
    ["M2S", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 50, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[300, 250, len, len, x, y, len, len]],
    ]]],
    ["M3E", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 0, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[350, 200, len, len, x, y, len, len]],
    ]]],
    ["M3W", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 50, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[350, 250, len, len, x, y, len, len]],
    ]]],
    ["M4E", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 0, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[400, 200, len, len, x, y, len, len]],
    ]]],
    ["M4W", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 50, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[400, 250, len, len, x, y, len, len]],
    ]]],
    ["M5N", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[450, 200, len, len, x, y, len, len]],
    ]]],
    ["M5E", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 0, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[500, 200, len, len, x, y, len, len]],
    ]]],
    ["M5W", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 50, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[450, 250, len, len, x, y, len, len]],
    ]]],
    ["M5S", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 50, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[500, 250, len, len, x, y, len, len]],
    ]]],
    ["M6N", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[0, 0, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[550, 200, len, len, x, y, len, len]],
    ]]],
    ["M6S", [[Floor, "E-Door Marker"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 50, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[550, 250, len, len, x, y, len, len]],
    ]]],
    
    ["EGN", [[EGate], [
        ["S", "img/tileset.png", (x,y,len)=>[500, 100, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[600, 100, len, len, x, y, len, len]],
    ]]],
    ["EGE", [[EGate], [
        ["S", "img/tileset.png", (x,y,len)=>[550, 100, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[650, 100, len, len, x, y, len, len]],
    ]]],
    ["EGW", [[EGate], [
        ["S", "img/tileset.png", (x,y,len)=>[500, 150, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[600, 150, len, len, x, y, len, len]],
    ]]],
    ["EGS", [[EGate], [
        ["S", "img/tileset.png", (x,y,len)=>[550, 150, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[650, 150, len, len, x, y, len, len]],
    ]]],
    
    ["S1W", [[SwitchGate], [
        ["S", "img/tileset.png", (x,y,len)=>[500, 150, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[800, 200, len, len, x, y, len, len]],
    ]]],
    ["S1E", [[SwitchGate], [
        ["S", "img/tileset.png", (x,y,len)=>[550, 100, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[850, 200, len, len, x, y, len, len]],
    ]]],
    ["S2N", [[SwitchGate], [
        ["S", "img/tileset.png", (x,y,len)=>[500, 100, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[800, 250, len, len, x, y, len, len]],
    ]]],
    ["S2S", [[SwitchGate], [
        ["S", "img/tileset.png", (x,y,len)=>[550, 150, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[850, 250, len, len, x, y, len, len]],
    ]]],
    ["S3N", [[SwitchGate], [
        ["S", "img/tileset.png", (x,y,len)=>[500, 100, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[800, 300, len, len, x, y, len, len]],
    ]]],
    ["S3S", [[SwitchGate], [
        ["S", "img/tileset.png", (x,y,len)=>[550, 150, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[850, 300, len, len, x, y, len, len]],
    ]]],
    ["S4N", [[SwitchGate], [
        ["S", "img/tileset.png", (x,y,len)=>[500, 100, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[800, 350, len, len, x, y, len, len]],
    ]]],
    ["S4E", [[SwitchGate], [
        ["S", "img/tileset.png", (x,y,len)=>[550, 100, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[850, 350, len, len, x, y, len, len]],
    ]]],
    ["S4W", [[SwitchGate], [
        ["S", "img/tileset.png", (x,y,len)=>[500, 150, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[800, 400, len, len, x, y, len, len]],
    ]]],
    ["S4S", [[SwitchGate], [
        ["S", "img/tileset.png", (x,y,len)=>[550, 150, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[850, 400, len, len, x, y, len, len]],
    ]]],
    ["S5N", [[SwitchGate], [
        ["S", "img/tileset.png", (x,y,len)=>[500, 100, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[800, 450, len, len, x, y, len, len]],
    ]]],
    ["S5S", [[SwitchGate], [
        ["S", "img/tileset.png", (x,y,len)=>[550, 150, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[850, 450, len, len, x, y, len, len]],
    ]]],
    
    ["KA1", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[450, 100, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[900, 450, len, len, x, y, len, len]],
    ]]],
    ["KA2", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[400, 150, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[900, 400, len, len, x, y, len, len]],
    ]]],
    ["KA3", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[450, 100, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[900, 350, len, len, x, y, len, len]],
    ]]],
    ["KA4", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[400, 150, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[900, 300, len, len, x, y, len, len]],
    ]]],
    ["KA5", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[450, 100, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[900, 250, len, len, x, y, len, len]],
    ]]],
    ["KA6", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[450, 100, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[900, 200, len, len, x, y, len, len]],
    ]]],
    ["KA7", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[450, 100, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[900, 150, len, len, x, y, len, len]],
    ]]],
    ["KB1", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[400, 150, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[950, 450, len, len, x, y, len, len]],
    ]]],
    ["KB2", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[400, 150, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[950, 400, len, len, x, y, len, len]],
    ]]],
    ["KB3", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[450, 150, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[950, 350, len, len, x, y, len, len]],
    ]]],
    ["KB4", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[400, 100, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[950, 300, len, len, x, y, len, len]],
    ]]],
    ["KB5", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[450, 150, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[950, 250, len, len, x, y, len, len]],
    ]]],
    ["KB6", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[450, 100, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[950, 200, len, len, x, y, len, len]],
    ]]],
    ["KB7", [[Gate, "Key Gate"], [
        ["S", "img/tileset.png", (x,y,len)=>[400, 100, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[950, 150, len, len, x, y, len, len]],
    ]]],
    
    ["Key", [[Key], [
        ["S", "img/tileset.png", (x,y,len)=>[400, 500, len, len, x, y, len, len]],
    ]]],
    ["WSw", [[WallSwitch], [
        ["S", "img/tileset.png", (x,y,len)=>[600, 300, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[650, 300, len, len, x, y, len, len]],
    ]]],
    ["FSw", [[FloorSwitch], [
        ["S", "img/tileset.png", (x,y,len)=>[700, 300, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[750, 300, len, len, x, y, len, len]],
    ]]],
    
    ["FL0", [[Floor], [
        ["P", (len)=>["M0 0h","v","h-","z"].join(len), "#aaa", null],
    ]]],
    ["FL1", [[Floor], [
        ["P", (len)=>["M0 0h","v","h-","z"].join(len), "#777", null],
    ]]],
    
    ["EXT", [[Exit], [
        ["P", (len)=>`M0 0L${[len,len]}M0 ${len}L${len} 0`, null, "red"],
    ]]],
    ["EX1", [[Exit, "Front Door"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 50, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[300, 100, len, len, x, y, len, len]],
    ]]],
    ["EX2", [[Exit, "Front Door"], [
        ["S", "img/tileset.png", (x,y,len)=>[50, 50, len, len, x, y, len, len]],
        ["S", "img/tileset.png", (x,y,len)=>[300, 150, len, len, x, y, len, len]],
    ]]],
])