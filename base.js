function bisect (arr, el) {
    var a = 0, z = arr.length, m = 0;
    while (a < z) {
        m = (a+z)/2;
        if (arr[m] == el) break;
        if (arr[m] < el) a = m;
        else a = m;
    }
    return m;
}

class Trie {
    constructor () {
        this.data = undefined;
        this.keys = [];
        this.values = [];
    }

    set (key, data) {
        console.log("set",this,key,data);
        if (key.length == 0) {
            this.data = data;
        }
        else {
            var k, ey;
            [k, ...ey] = key;
            var ind = bisect(this.keys, k);
            if (this.keys[ind] != k || this.keys[ind] == undefined) {
                this.keys.splice(ind,0,k);
                this.values.splice(ind,0,new Trie());
            }
            console.log(ind,this.keys,this.values);
            this.values[ind].set(ey, data);
        }
    }

    get (key) {
        if (key.length == 0) {
            return this.data;
        }
        else {
            var k, ey;
            [k, ...ey] = key;
            var ind = bisect(this.keys, k);
            if (this.keys[ind] != k || this.keys[ind] == undefined) {
                return undefined;
            }
            return this.values[ind].get(ey);
        }
    }
}

class Animation {
    ;
}

const GameEventTarget = {
    constructor () {
        this.passKeyDown = false;
        this.passKeyUp = false;
        this.passKeyPress = false;
        this.passMouseDown = false;
        this.passMouseUp = false;
        this.passMousePress = false;
    },

    keydown (ev) {
        console.log("keydown", this, ...arguments);
        return this.passKeyDown;
    },

    keyup (ev) {
        console.log("keyup", this, ...arguments);
        return this.passKeyUp;
    },

    keypress (ev) {
        console.log("keypress", this, ...arguments);
        return this.passKeyPress;
    },
    
    mousedown (ev) {
        console.log("mousedown", this, ...arguments);
        return this.passMouseDown;
    },

    mouseup (ev) {
        console.log("mouseup", this, ...arguments);
        return this.passMouseUp;
    },

    mousepress (ev) {
        console.log("mousepress", this, ...arguments);
        return this.passMousePress;
    }
}

class Drawable {
    constructor (ctx, x, y, w, h) {
        this.ctx = ctx;
        this._x = x;
        this._y = y;
        this._w = w;
        this._h = h;
    }

    get x () {
        return this._x;
    }

    set x (value) {
        this._x = value;
    }

    get y () {
        return this._y;
    }

    set y (value) {
        this._y = value;
    }

    get w () {
        return this._w;
    }

    set w (value) {
        this._w = value;
    }

    get h () {
        return this._h;
    }

    set h (value) {
        this._h = value;
    }

    draw () {}
}

class DrawableGroup {
    constructor (ctx, x, y) {
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.drawables = [];
    }

    draw () {
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.drawables.forEach((drbl) => {
            drbl.draw();
        })
        this.ctx.restore();
    }
}

class Sprite extends Drawable {
    constructor (ctx, src, x, y, w, h, x_, y_, w_, h_) {
        if (x_ !== undefined){
            super(ctx, x_, y_, w_, h_);
            this._sx = x;
            this._sy = y;
            this._sw = w;
            this._sh = h;
        }
        else {
            if (w !== undefined){
                super(ctx, x, y, w, h);
            }
            else{
                super(ctx, x, y);
                this.w = this.h = undefined
            }
            this._sx = this._sy = this._sw = this._sh = undefined;
        }
        this.img = new Image();
        this.img.src = src;
    }

    get sx () {
        return this._sx;
    }

    set sx (value) {
        this._sx = value;
    }

    get sy () {
        return this._sy;
    }

    set sy (value) {
        this._sy = value;
    }

    get sw () {
        return this._sw;
    }

    set sw (value) {
        this._sw = value;
    }

    get sh () {
        return this._sh;
    }

    set sh (value) {
        this._sh = value;
    }

    draw () {
        // console.log("draw", this, ...arguments);
        this.ctx.save();
        if (this.sx !== undefined) {
            this.ctx.drawImage(
                this.img,
                this.sx, this.sy, this.sw, this.sh,
                this.x, this.y, this.w, this.h);
        }
        else if (this.w !== undefined) {
            this.ctx.drawImage(
                this.img,
                this.x, this.y, this.w, this.h);
        }
        else {
            this.ctx.drawImage(
                this.img,
                this.x, this.y);

        }
        this.ctx.restore();
    }
}

class Path extends Drawable {
    constructor (ctx, x, y, pathData, fill, stroke) {
        super(ctx, x, y);
        this.path = new Path2D(pathData);
        this.fill = fill;
        this.stroke = stroke;
    }

    draw () {
        // console.log("draw", this, ...arguments);
        var mat = this.ctx.getTransform();
        this.ctx.save();
        this.ctx.setTransform(
            1, 0, 0, 
            1, 0, 0
        );
        this.ctx.translate(this.x, this.y);
        this.ctx.transform(
            mat.a, mat.b, mat.c,
            mat.d, mat.e, mat.f
        );
        if (this.fill !== null){
            this.ctx.fillStyle = this.fill;
            this.ctx.fill(this.path);
        }
        if (this.stroke !== null){
            this.ctx.strokeStyle = this.stroke;
            this.ctx.stroke(this.path);
        }
        this.ctx.restore();
    }
}

class GameState extends DrawableGroup {
    constructor (ctx) {
        super();
        this.ctx = ctx;
        this.drawables = [];
        this.passDraw = false;
        this.passUpdate = false;
    }

    draw () {
        // console.log("draw", this, ...arguments);
        for (var i in this.drawables) {
            this.drawables[i].draw();
        }
    }

    update (t) {
        // console.log("update", this, ...arguments);
    }

    log () {
        // console.log("log", this, ...arguments);
    }
}
Object.assign(GameState.prototype, GameEventTarget);