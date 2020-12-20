class Menu extends GameState {
    constructor (ctx, world, map, list) {
        super(ctx);
        this.grid = new Grid(ctx, 0, 0, 50, world);
        this.world = world;
        this.grid.register(map, list);
        this.cursor = 0;
        this.choices = [];
        this.drawables = [this.grid];
    }
    
    keydown (ev) {
        if (ev.code == this.world.keys.confirm) {
            this.choices[this.cursor]();
        }
    }
}

class MainMenu extends Menu {
    constructor (ctx, world, map, list) {
        super(ctx, world, map, list);
        this.choices = [
            () => {
                setLevel(0, 3, 0, null, null, null, true);
            }
        ];
        this.drawables = [
            this.grid,
        ];
    }
}

menuGrid = [
    [["FL0"], ],
]

let states = [new MainMenu(ctx, world, menuGrid, itemList)];

function main () {
    var keys = window.localStorage.getItem("grabby-keys");
    if (keys == null) {
        window.localStorage.setItem("grabby-keys", JSON.stringify(this.world.keys))
    }
    else {
        this.world.keys = JSON.parse(keys);
    }
    run();
}

function run (t) {
    n = states.length;
    if (n) {
        var start;
        for (start = n - 1; start >= 0; start--) {
            if (states[start].passUpdate == false)
                break;
        }
        for (; start < n; start++){
            states[start].update(t);
        }
        for (start = n - 1; start >= 0; start--) {
            if (states[start].passDraw == false){
                break;
            }
        }
        for (; start < n; start++){
            states[start].draw();
        }
        window.requestAnimationFrame(run);
    }
    else {
        // window.close();
    }
}

document.body.onkeydown = function keydown (ev) {
    for (start = states.length - 1; start >= 0; start--) {
        if (states[start].keydown(ev) == false)
            break;
    }
}

document.body.onkeyup = function keyup (ev) {
    for (start = states.length - 1; start >= 0; start--) {
        if (states[start].keyup(ev) == false)
            break;
    }
}

document.body.onkeypress = function keypress (ev) {
    for (start = states.length - 1; start >= 0; start--) {
        if (states[start].keypress(ev) == false)
            break;
    }
}

cnv.onmousedown = function mousedown (ev) {
    for (start = states.length - 1; start >= 0; start--) {
        if (states[start].mousedown(ev) == false)
            break;
    }
}

cnv.onmouseup = function mouseup (ev) {
    for (start = states.length - 1; start >= 0; start--) {
        if (states[start].mouseup(ev) == false)
            break;
    }
}

cnv.onmousepress = function mousepress (ev) {
    for (start = states.length - 1; start >= 0; start--) {
        if (states[start].mousepress(ev) == false)
            break;
    }
}