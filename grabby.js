class Menu extends GameState {
    constructor (ctx, x, y, world, map, list) {
        super(ctx);
        this.x = x;
        this.y = y;
        this.grid = new Grid(ctx, 0, 0, 50, world);
        this.world = world;
        this.grid.register(map, list);
        this.cursor = 0;
        this.choices = [];
        this.drawables = [this.grid];
    }
    
    keydown (ev) {
        var mod = this.choices.length;
        if (ev.code == this.world.keys.confirm) {
            this.choices[this.cursor]();
        }
        else if (ev.code == this.world.keys.up) {
            this.cursor = (this.cursor + mod - 1) % mod;
        }
        else if (ev.code == this.world.keys.down) {
            this.cursor = (this.cursor + 1) % mod;
        }
        return false;
    }
}

class MainMenu extends Menu {
    constructor (ctx, world, map, list) {
        super(ctx, 0, 0, world, map, list);
        this.choices = [
            () => {
                setLevel(0, 3, 3, null, null, null, true);
            }
        ];
        this.drawables = [
            this.grid,
        ];
    }
}

class WinMenu extends Menu {
    constructor (ctx, world, map, list) {
        super(ctx, -25, -25, world, map, list);
        this.player = new Player(ctx, 0, 0, 50);
        this.player.gx = 8;
        this.player.gy = 5;
        this.choices = [
            () => {
                states.splice(1);
            }
        ];
        this.drawables = [
            this.grid,
            this.player,
        ];
    }
}

menuGrid = [
    [["FL0"], ],
];

winGrid = [
    [["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ],
    [["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ],
    [["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ],
    [["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ],
    [["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ],
    [["FL1"], ["FL0"], ["FL1"], ["FL0", ["###", 1]], ["FL1", ["###", 1]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", ["###", 1]], ["FL0", ["###", 1]], ["FL1"], ["FL0"], ["FL1"], ],
    [["FL0"], ["FL1"], ["FL0"], ["FL1", ["###", 1]], ["FL0", ["###", 1]], ["FL1", ["###", 1]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", ["###", 1]], ["FL0", ["###", 1]], ["FL1", ["###", 1]], ["FL0"], ["FL1"], ["FL0"], ],
    [["FL1"], ["FL0"], ["FL1"], ["FL0", ["###", 1]], ["FL1", ["###", 1]], ["FL0", ["###", 1]], ["FL1", ["###", 1]], ["FL0", ["###", 1]], ["FL1"], ["FL0", ["###", 1]], ["FL1", ["###", 1]], ["FL0", ["###", 1]], ["FL1", ["###", 1]], ["FL0", ["###", 1]], ["FL1"], ["FL0"], ["FL1"], ],
    [["FL0"], ["FL1"], ["FL0"], ["FL1", ["###", 1]], ["FL0", ["###", 1]], ["FL1", ["###", 1]], ["FL0", ["###", 1]], ["FL1", ["###", 1]], ["FL0", ["###", 1]], ["FL1", ["###", 1]], ["FL0", ["###", 1]], ["FL1", ["###", 1]], ["FL0", ["###", 1]], ["FL1", ["###", 1]], ["FL0"], ["FL1"], ["FL0"], ],
    [["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ],
];

winMenu = new WinMenu(ctx, world, winGrid, itemList);

let states = [new MainMenu(ctx, world, menuGrid, itemList)];

function main () {
    log = document.getElementById("debug");
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