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