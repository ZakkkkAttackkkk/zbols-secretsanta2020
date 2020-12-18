class Grid extends DrawableGroup {
    constructor (ctx, x, y, len, world) {
        super(ctx, x, y);
        this.len = len;
        this.world = world;
        this.cells = new Trie();
        this.saveState = null;
        this.drawables = this.cells;
        this.dynamic = [];
    }

    register (map, list) {
        var switches = new Trie();
        for (var r = 0; r < map.length; r++) {
            var row = map[r];
            for (var c = 0; c < row.length; c++) {
                if (row[c] != null){
                    var cell = [];
                    row[c].forEach((el)=>{
                        var spec = [];
                        if (typeof el !== "string") [el, ...spec] = el;
                        var [itm, drbls] = list.get(el);
                        var [cls, name, ...attrs] = itm;
                        var item = new (cls)(
                            this.ctx, name, this.x, this.y,
                            this.len, c, r, ...attrs
                        );
                        item.world = this.world;
                        if (spec.length > 0) item.spec(...spec);
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
                        if (item.dynamic) {
                            this.dynamic.push(item);
                        }
                        cell.push(item);
                    })
                    this.cells.set([r, c], cell);
                }
            }
        }
    }

    save () {
        this.saveState = new Trie();
        this.cells.forEach((cell, key) => {
            var stack = [];
            cell.forEach((item, ind) => {
                item.save(ind);
                stack.push(item);
            });
            this.saveState.set(key, stack);
        });
    }

    reset () {
        this.cells = new Trie();
        this.saveState.forEach((cell, key) => {
            var stack = [];
            cell.forEach((item) => {
                item.reset();
                stack.push(item);
            });
            this.cells.set(key, stack);
        });
    }

    peek (r, c) {
        var cell = this.cells.get([r, c]);
        return cell != null ? cell[cell.length - 1] : cell;
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

    // Check if the cell at the given position is hoverable
    hoverable (r, c) {
        var cell = this.cells.get([r, c]);
        if (cell === undefined) return false;
        return cell[cell.length - 1].hoverable;
    }

    // Check if the cell at the given position is passable
    passable (r, c) {
        var cell = this.cells.get([r, c]);
        if (cell === undefined) return false;
        return !(cell.some((item) => item.passable == false));
    }

    // Check if the player collides with anything that isn't passable
    collide (dx, dy, rot, player) {
        // console.log("1");
        if (rot == 0 && !this.passable(player.gy+dy, player.gx+dx)) {
            // console.log("1x");
            return true;
        }
        // console.log("2");
        var dirs = [
            [1,0], [1,1], [0,1], [-1,1], 
            [-1,0], [-1,-1], [0,-1], [1,-1]
        ], x, y;
        for (var i = 0; i < 8 ; i++) {
            // console.log("3",i);
            if (player.grabItems[i] === null) continue;
            [x, y] = dirs[(8 + player.startAngle + i + rot) % 8];
            if (!this.hoverable(player.gy+y+dy, player.gx+x+dx)) {
                // console.log("3x",i);
                return true;
            }
            // console.log("4",i);
        }
        // console.log("5",i);
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
    constructor (ctx, x, y, len, world, map, list, tests) {
        super(ctx);
        this.grid = new Grid(ctx, x, y, len, world);
        this.world = world;
        this.map = map;
        this.list = list;
        this.grid.register(map, list);
        this.player = new Player(ctx, x, y, len);
        this.drawables = [this.grid, this.player];
        this.tests = tests
        this.elapsed = 0;
    }

    save () {
        this.player.save();
        this.grid.save();
    }

    reset () {
        this.player.reset();
        this.grid.reset();
    }

    update (t) {
        if (this.lastTime == undefined) {
            this.elapsed = 0;
        }
        else {
            this.elapsed += t - this.lastTime;
            if (this.elapsed >= .2) {
                var callbacks = [];
                this.elapsed -= .2;
                this.grid.cells.forEach((cell, pos) => {
                    for (var i = cell.length - 1, item = cell[i]; i >= 0; i--) {
                        for (var j = 0; j < this.tests.length; j++) {
                            var ret = this.tests[j](item, pos, this);
                            if (ret != null) {
                                var [skip, func, args] = ret;
                                callbacks.push([func, args]);
                                if (skip == "cell") {
                                    i = -1;
                                    break;
                                }
                            }
                        }
                    }
                });
                // if (callbacks.length) console.log(callbacks);
                callbacks.forEach((cbck) => {
                    var [fn, args] = cbck;
                    fn(...args);
                });
            }
        }
        this.lastTime = t;
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
        else if (ev.code === "KeyR") {
            this.reset();
        }
        else {
            for (var i = 0; i < 8; i++){
                if (ev.code === "Key" + "DCXZAQWE"[i]) {
                    var ind = (8 + i - this.player.startAngle) % 8;
                    var [x,y] = this.player.dirs[i];
                    if (this.player.grabItems[ind] === null){
                        if (this.grid.grabbable(
                            this.player.gy + y,
                            this.player.gx + x
                        )){
                            if (this.grid.peek(
                                this.player.gy + y,
                                this.player.gx + x
                            ).grab(this.player, true)) {
                                this.player.grabItems[ind] = this.grid.pop(
                                    this.player.gy + y,
                                    this.player.gx + x
                                );
                            }
                        }
                    }
                    else if (this.player.grabItems[ind].grab(this.playe, false)) {
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

function exitTest (item, pos, level) {
    if (item.name == "Exit" &&
        pos[0] == level.player.gy &&
        pos[1] == level.player.gx) {
        var count = level.player.grabItems.filter((el)=> el!=null).length;
        if (count <= (item.tangle == null ? 0 : 1)) {
            var grab = null;
            if (count > 0) {
                for (var i = 7; i >= 0; i--) {
                    if (level.player.grabItems[i] != null) {
                        grab = level.player.grabItems[i];
                        level.player.grabItems[i] = null;
                        break;
                    }
                }
            }
            level.player.gx = level.player.gy = null;
            return[
                null,
                setLevel, 
                [item.target, item.tx, item.ty, pos, item.tangle, grab]
            ];
        }
    }
}

function soakTest (item, pos, level) {
    if (item.name == "Puddle") {
        if (level.player.grabItems.some((grab) => 
            (grab != null && grab.name == "Sponge" &&
            pos[0] == grab.gy && pos[1] == grab.gx)
        )) {
            return [
                "cell",
                (grid, pos) => grid.pop(...pos), 
                [level.grid, pos]
            ];
        }
    }
}

function floorSwitchTest (item, pos, level) {
    if (item.name == "Floor Switch") {
        var cell = level.grid.cells.get(pos);
        if (cell[cell.length-1] != item || (
                pos[1] == level.player.gx &&
                pos[0] == level.player.gy
            ) || level.player.grabItems.some((item) => 
                item != null && item.gx == pos[1] && item.gy == pos[0]
            )) {
            return [
                null,
                (level, item) => {
                    level.world.states.add(item.tag);
                    item.state = true;
                }, 
                [level, item]
            ];
        }
        else {
            return [
                null,
                (level, item) => {
                    level.world.states.remove(item.tag);
                    item.state = false;
                },
                [level, item]
            ];
        }
    }
}

function eGateTest (item, pos, level) {
    if (item.name == "EGate") {
        var cell = level.grid.cells.get(pos);
        if (cell[cell.length-1] != item ||
            (level.player.gx == pos[1] && level.player.gy == pos[0]) ||
            level.player.grabItems.some((item) => 
                item != null && item.gx == pos[1] && item.gy == pos[0]
            ))
            return [
                null,
                (itm) => itm.force(),
                [item]
            ];
        else return [
            null,
            (item, state) => {item.state = state},
            [item,level.world.states.has(item.tag)]
        ];
    }
}

world = {
    states: new OptSet(),
}
maps = [
    [ // Level 0
        [["FL1","SPN"], ["WL0"], ["FL1"], ["FL0"], ["FL1",["EGT",true,2]], ["FL0",["EGT",false,2]], ["WL0"], ["FL0",["WSW",false,2]], ],
        [["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ],
        [["WL0"], ["WL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["WL0"], ["FL0"], ],
        [["FL0",["EXT",1,3,0,2]], ["FL1","PUD"], ["FL0","BOX"], ["FL1"], ["FL0",["FSW",false,1]], ["FL1",["EGT",false,1]], ["FL0",["EGT",true,1]], ["FL1"], ],
    ],
    [ // Level 1
        [["FL1"], null   , ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["WL0"], ],
        [["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ],
        [["FL1",["EXT",0,3,0,2]], null   , ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["WL0"], ],
        [["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ],
        [["FL1"], null   , ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["WL0"], ],
        [["FL0"], ["FL1"], ["FL0","BOX"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ],
    ]
]

levels.push(new Level(ctx,0,0,80,world,maps[0],itemList,
    [exitTest,soakTest,floorSwitchTest,eGateTest]));
levels.push(new Level(ctx,0,0,80,world,maps[1],itemList,
    [exitTest]));

function setLevel(level, x, y, srcpos, angle, grab) {
    console.log("setting level to",level,"at",x,y,"with",grab,"at",angle);
    states.pop();
    levels[level].player.gx = x;
    levels[level].player.gy = y;
    if (grab != null) {
        levels[level].player.startAngle = angle;
        levels[level].player.grabItems[0] = grab;
        var [dx, dy] = levels[level].player.dirs[angle];
        grab.gx = x + dx;
        grab.gy = y + dy;
    }
    levels[level].save();
    states.push(levels[level]);
}