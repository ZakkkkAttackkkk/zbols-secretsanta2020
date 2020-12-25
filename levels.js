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
                        // console.log(el);
                        var [itm, drbls] = list.get(el);
                        var [cls, name, ...attrs] = itm;
                        var item = new (cls)(
                            this.ctx, name, this.x, this.y,
                            this.len, c, r, ...attrs
                        );
                        item.world = this.world;
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
                                    this.ctx, spec, ...args[0](
                                        this.len * c, this.len * r, this.len
                                    )
                                ));
                            }
                        })
                        if (spec.length > 0) item.spec(...spec);
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
    constructor (ctx, x, y, len, world, n, map, list, tests) {
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
        this.n = n;
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
            log.innerHTML = "";
            if (this.elapsed >= .5) {
                var callbacks = [];
                this.elapsed -= .5;
                var end;
                for (var [pos, cell] of this.grid.cells.entries()){
                    end = false;
                    // if (pos[0]==6&&pos[1]==8&world.debug) debugger;
                    for (var i = cell.length - 1; i >= 0; i--) {
                        var item = cell[i];
                        for (var j = 0; j < this.tests.length; j++) {
                            var ret = this.tests[j](item, pos, this);
                            if (ret != null) {
                                var [skip, func, args] = ret;
                                callbacks.push([func, args]);
                                if (skip != null) {
                                    i = -1;
                                    if (skip == "grid") {
                                        i--;
                                        end = true;
                                    }
                                    console.log(`skipping ${skip} at ${pos}`,item);
                                    break;
                                }
                            }
                        }
                    }
                    if (end) break;
                }
                // if (callbacks.length) console.log(callbacks);
                callbacks.forEach((cbck) => {
                    var [fn, args] = cbck;
                    fn(...args);
                });
            }
            log.innerHTML += `Level ${Math.floor(this.n/8)+1}-${this.n%8+1}: (${[this.player.gx,this.player.gy]})`;
        }
        this.lastTime = t;
    }
    
    grab (angle) {
        var ind = (8 + angle - this.player.startAngle) % 8;
        var [x,y] = this.player.dirs[angle];
        if (this.player.grabItems[ind] === null){
            if (this.grid.grabbable(
                this.player.gy + y,
                this.player.gx + x
            )){
                if (this.grid.peek(
                    this.player.gy + y,
                    this.player.gx + x
                ).grab(this.player, this.grid, true)) {
                    this.player.grabItems[ind] = this.grid.pop(
                        this.player.gy + y,
                        this.player.gx + x
                    );
                }
            }
        }
        else if (this.player.grabItems[ind].grab(this.player, this.grid, false)) {
            this.grid.push(
                this.player.gy + y,
                this.player.gx + x,
                this.player.grabItems[ind]
            );
            this.player.grabItems[ind] = null;
        }
    }

    keydown (ev) {
        if (ev.code === this.world.keys.left) {
            if (!this.grid.collide(-1, 0, 0, this.player)){
                this.player.gx--;
            }
        }
        else if (ev.code === this.world.keys.right) {
            if (!this.grid.collide(1, 0, 0, this.player)){
                this.player.gx++;
            }
        }
        else if (ev.code === this.world.keys.up) {
            if (!this.grid.collide(0, -1, 0, this.player)){
                this.player.gy--;
            }
        }
        else if (ev.code === this.world.keys.down) {
            if (!this.grid.collide(0, 1, 0, this.player)){
                this.player.gy++;
            }
        }
        else if (ev.code === this.world.keys.spinCC) {
            if (!this.grid.collide(0, 0, -1, this.player)){
                this.player.startAngle = (this.player.startAngle + 7) % 8
            }
        }
        else if (ev.code === this.world.keys.spinACC) {
            if (!this.grid.collide(0, 0, 1, this.player)){
                this.player.startAngle = (this.player.startAngle + 1) % 8
            }
        }
        else if (ev.code === this.world.keys.reset) {
            this.reset();
        }
        else if (ev.code === this.world.keys.legE) {
            this.grab(0);
        }
        else if (ev.code === this.world.keys.legSE) {
            this.grab(1);
        }
        else if (ev.code === this.world.keys.legS) {
            this.grab(2);
        }
        else if (ev.code === this.world.keys.legSW) {
            this.grab(3);
        }
        else if (ev.code === this.world.keys.legW) {
            this.grab(4);
        }
        else if (ev.code === this.world.keys.legNW) {
            this.grab(5);
        }
        else if (ev.code === this.world.keys.legN) {
            this.grab(6);
        }
        else if (ev.code === this.world.keys.legNE) {
            this.grab(7);
        }
        console.log(this.player.startAngle, this.player.grabItems);
        return false;
    }
}

cnv = document.getElementById("cnv-main");
ctx = cnv.getContext("2d");

function exitTest (item, pos, level) {
    if (item.name == "Exit") {
        log.innerHTML += `${pos} != ${[level.player.gy,level.player.gx]}\n`;
    }
    if (pos[0] == 6 && pos[1] == 8) {
        log.innerHTML += `${item.name}\n`;
    }
    if (item.name == "Exit" &&
        pos[0] == level.player.gy &&
        pos[1] == level.player.gx) {
        console.log("on exit");
        var count = level.player.grabItems.filter((el)=> el!=null).length;
        if (count <= (item.tangle == null ? 0 : 1)) {
            var grab = null, i;
            if (count > 0) {
                for (i = 7; i >= 0; i--) {
                    if (level.player.grabItems[i] != null) {
                        grab = level.player.grabItems[i];
                        break;
                    }
                }
            }
            return[
                "grid",
                (player, i, a, b, c, d, e, grab) => {
                    player.grabItems[i] = player.gx = player.gy = null;
                    setLevel(a, b, c, d, e, grab);
                },
                [level.player, i, item.target, item.tx, item.ty, pos, item.tangle, grab]
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

function boardedDoorTest (item, pos, level) {
    if (item.name == "Boarded Door") {
        return [
            null,
            (item, state) => item.state = state,
            [item, world.states.has(item.tag)]
        ];
    }
}

function crowbarTest (item, pos, level) {
    if (item.name == "Drain Cover" || item.name == "Boarded Door") {
        var has = level.player.grabItems.some((grab) => 
            (grab != null && grab.name == "Crowbar" &&
            pos[0] == grab.gy && pos[1] == grab.gx)
        );
        if (item.name == "Boarded Door") {
            if (has) {
                return [
                    "cell",
                    (world, item) => world.states.add(item.tag), 
                    [level.world, item]
                ];
            }
        }
        else {
            return [
                "cell",
                (pop, grid, pos) => {if (pop) grid.pop(...pos)},
                [has, level.grid, pos]
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
    if (item.name == "E-Gate" || item.name == "Switch Gate") {
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

function gateTest (item, pos, level) {
    if (item.name == "Key Gate" || item.name == "E-Door") {
        for (var i = 0; i < 8; i++) {
            var grab = level.player.grabItems[i];
            if (grab != null &&
                grab.name == "Key" && grab.tag == item.tag &&
                grab.gx == pos[1] && grab.gy == pos[0]) {
                return [
                    null,
                    (item, player, i) => {
                        item.state = true;
                        player.grabItems[i] = null;
                    },
                    [item, level.player, i]
                ]
            }
        }
    }
}

function ventTest (item, pos, level) {
    if (item.name == "Vent") {
        log.innerHTML += "vent\n";
        return [
            null,
            (item, state) => {
                item.passable = state;
            },
            [item, level.grid.peek(pos[0]+1, pos[1]).name == "Ladder"]
        ];
    }
}

world = {
    states: new OptSet(),
    keys: {
        confirm: "Space",
        back: "Escape",
        up: "ArrowUp",
        down: "ArrowDown",
        left: "ArrowLeft",
        right: "ArrowRight",
        legN: "KeyW",
        legNE: "KeyE",
        legE: "KeyD",
        legSE: "KeyC",
        legS: "KeyX",
        legSW: "KeyZ",
        legW: "KeyA",
        legNW: "KeyQ",
        spinCC: "KeyS",
        spinACC: "KeyF",
        reset: "KeyR",
    },
    debug: false,
}
// maps = [
//     [ // Level 0
//         [["FL1","SPN"], ["WL0"], ["FL1"], ["FL0"], ["FL1",["EGT",true,2]], ["FL0",["EGT",false,2]], ["WL0"], ["FL0",["WSW",false,2]], ],
//         [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
//         [["WL0"], ["WL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["WL0"], ["FL0", "WlE"], ],
//         [["FL0","DrW",["EXT",1,3,0,2]], ["FL1","PUD"], ["FL0","BOX"], ["FL1"], ["FL0",["FSW",false,1]], ["FL1",["EGT",false,1]], ["FL0",["EGT",true,1]], ["FL1", "WlE"], ],
//     ],
//     [ // Level 1
//         [["FL1", "WlW"], null   , ["FL1", "WSW"], ["FL0", "CNE"], ["FL1"], ["FL0"], ["WL0"], ],
//         [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
//         [["FL1",["EXT",0,3,0,2]], null   , ["FL1", "WSW"], ["FL0", "CNE"], ["FL1"], ["FL0"], ["WL0"], ],
//         [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
//         [["FL1", "WlW"], null   , ["FL1", "WSW"], ["FL0", "CNE"], ["FL1"], ["FL0"], ["WL0"], ],
//         [["FL0",["KEY",100]], ["FL1"], ["FL0","BOX"], ["FL1"], ["FL0"], ["FL1",["GAT",100]], ["FL0", "WlE"], ],
//     ]
// ]

// levels = [
//     new Level(ctx,0,0,50,world,maps[0],itemList,[exitTest,soakTest,floorSwitchTest,eGateTest]),
//     new Level(ctx,0,0,50,world,maps[1],itemList,[exitTest, gateTest]),
// ];

maps = [
    [ // 0
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Sh4"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0", "Bx1"], ["FL1", "Bx2"], ["FL0", "Bx1"], ["FL1"], ["FL0"], ["FL1", "ShC"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1", "Bx2"], ["FL0"], ["FL1", "Bx1"], ["FL0"], ["FL1"], ["FL0", "Bx2"], ["FL1"], ["FL0", "DrE", ["EXT",1,1,3,0]], ],
        [["FL0", "WlW"], ["FL1"], ["FL0", "Bx1"], ["FL1", "Bx2"], ["FL0", "Bx2"], ["FL1"], ["FL0"], ["FL1", "Sh4"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "ShC"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ],
    [ // 1
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL0", "WlW"], ["FL1", ["Key", 13]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh2"], ["FL1", "Sh3"], ["FL0", ["FSw", 101]], ["FL1", "Sh0"], ["FL0", "WlE"], ],
        [["FL0", "DrW", ["EXT",0,8,3,4]], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Bx1"], ["FL0", ["EGE", 0, 101]], ["FL1", "DrE", ["EXT",2,1,3,0]], ],
        [["FL1", "WlW"], ["FL0", "Sh0"], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh3"], ["FL0", "Bx2"], ["FL1", "Sh0"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", ["BdS", 30], ["EXT",8,8,1,2]], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ],
    [ // 2
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL1", "WlW"], ["FL0","Bx1"], ["FL1","Bx2"], ["FL0","Bx2"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh3"], ["FL1", "WlE"], ],
        [["FL1", "DrW", ["EXT",1,6,3,4]], ["FL0"], ["FL1"], ["FL0"], ["FL1", ["KA1", 0]], ["FL0"], ["FL1", ["EGE", 0, 201]], ["FL0", "DrE", ["EXT",10,1,1,0]], ],
        [["FL0", "WlW"], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh3"], ["FL0", "Sh4"], ["FL1"], ["FL0", "Sh0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0", ["Key", 0]], ["FL1", "ShC"], ["FL0"], ["FL1", ["FSw", 201]], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", ["EXT",9,7,1,2], "M6S", ["XDS", 19]], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ],
    [ // 3
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", ["EXT",4,1,4,0], "M3E", ["XDE", 16]], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ],
    [ // 4
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN", "Vt4"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], null, null, ["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL1", "WlW"], ["FL0", "Tb4"], ["FL1", "Bx1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "CSW"], ["FL1", "WlN"], ["FL0", "WlN", ["WSw", 20]], ["FL1", "CSE"], ["FL0", "Sh4"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "TbC"], ["FL0", "Bx2"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Sh4"], ["FL0", "Bx2"], ["FL1"], ["FL0"], ["FL1", "Sh8"], ["FL0"], ["FL1", ["EXT",5,1,2,0], "DrE"], ],
        [["FL1", "WlW"], ["FL0", "Sh0"], ["FL1", "Sh4"], ["FL0"], ["FL1", "Tb0", "Bx1"], ["FL0", "Tb0"], ["FL1"], ["FL0", "Sh8"], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh3"], ["FL0", "Sh8"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", ["EXT",3,10,4,4], "M3W", ["XDW", 16]], ["FL1", "Bx1"], ["FL0", "ShC"], ["FL1"], ["FL0", "Tb0"], ["FL1", "Sh0"], ["FL0"], ["FL1", "ShC"], ["FL0"], ["FL1", "Tb1"], ["FL0", "Tb3"], ["FL1", "ShC"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1", ["S1W", 1,  20]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", ["S1E", 0, 20]], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ],
    [ // 5
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL0", "WlW"], ["FL1", "Tb1"], ["FL0", "Tb2"], ["FL1", "Tb3"], ["FL0", "Sh4"], ["FL1", "Sh1"], ["FL0", "Sh3"], ["FL1", "Sh4"], ["FL0", "Sh1"], ["FL1", "Sh3"], ["FL0", "Sh4"], ["FL1", "Tb0", ["Key", 16]], ["FL0", "WlE"], ],
        [["FL1", "DrW", ["EXT",4,12,2,2]], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Sh8"], ["FL0", "Tb1"], ["FL1", "Tb3"], ["FL0", "Sh8"], ["FL1", "Tb1"], ["FL0", "Tb3"], ["FL1", "Sh8"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "ShC"], ["FL1"], ["FL0"], ["FL1", "ShC"], ["FL0"], ["FL1"], ["FL0", "ShC"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Bx1"], ["FL0", "Bx1"], ["FL1", "Sh4"], ["FL0"], ["FL1", ["EXT",13,6,4], "Drn", "DrC"], ["FL0"], ["FL1", "Sh4"], ["FL0", "Sh1"], ["FL1", "Sh3"], ["FL0", "Bx1"], ["FL1", "Bx2"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "Bx1"], ["FL1", "Bx2"], ["FL0", "ShC"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "ShC"], ["FL1", "Cbr"], ["FL0", "Bx2"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ],
    [ // 6
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", ["EXT",7,1,3,0]], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", ["EXT",14,6,1,4]], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ],
    [ // 7
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", ["EXT",6,9,2,4]], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", ["EXT",15,4,1,4]], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ],
    
    [ // 8
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", ["EXT",1,3,5,6]], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ],
    [ // 9
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", ["EXT",2,5,5,6]], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ],
    [ // 10
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], null   , null   , null   , null   , ],
        [["FL0", "DrW", ["EXT",2,6,3,4]], ["FL1"], ["FL0"], ["FL1", "Sh0"], ["FL0", "WlE"], null   , null   , null   , null   , ],
        [["FL1", "WlW"], ["FL0", "Bx1"], ["FL1"], ["FL0"], ["FL1", "CSW"], ["FL0", "WNE"], null   , null   , null   , ],
        [["FL0", "WlW"], ["FL1", ["Key",14]], ["FL0", "Bx2"], ["FL1"], ["FL0"], ["FL1", "CSW"], ["FL0", "WNE"], null   , null   , ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "CNE"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "CSW"], ["FL0", "WNE"], null   , ],
        [null   , null   , ["FL0", "WSW"], ["FL1", "CNE"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "CSW"], ["FL0", "WNE"], ],
        [null   , null   , null   , ["FL0", "WSW"], ["FL1", "CNE"], ["FL0", ["FSw", 1000]], ["FL1"], ["FL0", ["EGE", 0, 1001]], ["FL1", ["EXT",11,1,3,0], "M1E", ["XDE",14]], ],
        [null   , null   , null   , null   , ["FL0", "WSW"], ["FL1", "CNE"], ["FL0", ["EGN", 0, 1000]], ["FL1", ["FSw", 1001]], ["FL0", "WlE"], ],
        [null   , null   , null   , null   , null   , ["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ],
    [ // 11
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Sh4"], ["FL0", ["EGN", 0, 1101]], ["FL1", ["FSw", 1103]], ["FL0", ["Key", 2]], ["FL1", "Sh0"], ["FL0", "Bx1"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0", "Bx2"], ["FL1"], ["FL0", "ShC"], ["FL1", ["EGN", 0, 1100]], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh3"], ["FL1", ["FSw", 1102]], ["FL0", "WlE"], ],
        [["FL1", ["EXT",10,7,6,4], "M1W", ["XDW", 14]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Bx1"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1", ["EGN", 0, 1102]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Sh1"], ["FL0", "Sh2"], ["FL1", "Sh3"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0", ["FSw", 1101]], ["FL1", "Tb4"], ["FL0"], ["FL1", "Tb1"], ["FL0", "Tb3"], ["FL1"], ["FL0", ["KA3", 2]], ["FL1", ["EGE", 0, 1103]], ["FL0"], ["FL1", ["EXT",12,1,5,0], "DrE"], ],
        [["FL0", "WlW"], ["FL1", ["FSw", 1100]], ["FL0", "TbC"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Sh0"], ["FL0", "Sh0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ],
    [ // 12
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "Vt1"], ["FL0", "Vt2"], ["FL1", "Vt2"], ["FL0", ["EXT",4,4,1], "Vt2", "Vt4"], ["FL1", "Vt2"], ["FL0", "Vt3"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL1", "WlW"], ["FL0", ["FSw", 1200]], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh3"], ["FL1"], ["FL0", "Sh0"], ["FL1", "Sh4"], ["FL0", ["Key", 15]], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1", ["FSw", 1202]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Sh8"], ["FL1", ["EGN", 0, 1204]], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0", ["FSw", 1204]], ["FL1"], ["FL0", "Tb1"], ["FL1", "Tb3"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "ShC"], ["FL0", ["EGN", 0, 1202]], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", ["EGN", 0, 1200]], ["FL0", "WlE"], ],
        [["FL1", "DrW", ["EXT",11,9,5,4]], ["FL0"], ["FL1"], ["FL0", "Sh4"], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh3"], ["FL1"], ["FL0"], ["FL1", ["BdE", 40], ["EXT",13,1,4,0]], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1", "ShC"], ["FL0"], ["FL1", "Bx2"], ["FL0", "Ldr"], ["FL1", "Sh0"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", ["EXT",20,1,1,2], "M2S", ["XDS", 15]], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ],
    [ // 13
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", ["EXT",14,1,3,0]], ],
        [["FL1", ["EXT",12,9,5,4]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ],
    [ // 14
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", ["EXT",6,6,5,6]], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", ["EXT",15,1,3,0]], ],
        [["FL1", ["EXT",13,12,3,4]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ],
    [ // 15
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", ["EXT",7,5,5,6]], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", ["EXT",14,10,2,4]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", ["EXT",23,6,1,2]], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ],
    
    [ // 16
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL0", "WNE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL0", ["EXT",17,1,4,0]], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL1", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", ["EXT",24,4,1,2]], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL0", "WSE"], ],
    ],
    [ // 17
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", ["EXT",18,1,2,0]], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", ["EXT",16,11,4,4]], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", ["EXT",25,4,1,2]], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ],
    [ // 18
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], null, null, null, null, null, null, ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", ["EXT",17,9,2,4]], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", ["EXT",18,1,3,0]], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ],
    [ // 19
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", ["EXT",18,8,3,4]], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", ["EXT",20,1,5,0]], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ],
    [ // 20
        [["FL0", "WNW"], ["FL1", ["EXT",12,2,6,6]], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", ["EXT",19,10,5,4]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ],
    [ // 21
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], null],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", ["EXT",22,1,2,0]], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", ["EXT",29,4,1,2]], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ],
    [ // 22
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", ["EXT",21,12,3,4]], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", ["EXT",30,4,1,2]], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ],
    [ // 23
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", ["EXT",15,6,6,6]], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ],
    
    [ // 24
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", ["EXT",16,4,7,6]], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ],
    [ // 25
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", ["EXT",17,3,7,6]], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", ["EXT",26,1,4,0]], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ],
    [ // 26
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", ["EXT",27,1,3,0]], ],
        [["FL0", ["EXT",25,10,4,4]], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ],
    [ // 27
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", ["EXT",28,1,2,0]], ],
        [["FL0", ["EXT",26,10,3,4]], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ],
    [ // 28
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", ["EXT",27,10,2,4]], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", ["EXT",29,1,3,0]], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ],
    [ // 29
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", ["EXT",21,7,7,6]], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", ["EXT",28,10,3,4]], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", ["EXT",30,1,3,0]], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ],
    [ // 30
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", ["EXT",22,5,6,6]], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", ["EXT",29,10,3,4]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", ["EXT",31,1,3,0]], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ],
    [ // 31
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", ["EXT",30,8,3,4]], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "EX1"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "EX2"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ],
    
    [ // n
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [[], ],
    ]
];

levels = [
    new Level(ctx, 0, 0, 50, world, 0, maps[0], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 1, maps[1], itemList, [
        exitTest, floorSwitchTest, eGateTest, boardedDoorTest]),
    new Level(ctx, 0, 0, 50, world, 2, maps[2], itemList, [
        exitTest, floorSwitchTest, eGateTest, gateTest]),
    new Level(ctx, 0, 0, 50, world, 3, maps[3], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 4, maps[4], itemList, [
        exitTest, eGateTest]),
    new Level(ctx, 0, 0, 50, world, 5, maps[5], itemList, [
        exitTest, crowbarTest]),
    new Level(ctx, 0, 0, 50, world, 6, maps[6], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 7, maps[7], itemList, [
        exitTest]),
    
    new Level(ctx, 0, 0, 50, world, 8, maps[8], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 9, maps[9], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 10, maps[10], itemList, [
        exitTest, floorSwitchTest, eGateTest, gateTest]),
    new Level(ctx, 0, 0, 50, world, 11, maps[11], itemList, [
        exitTest, floorSwitchTest, eGateTest, gateTest]),
    new Level(ctx, 0, 0, 50, world, 12, maps[12], itemList, [
        exitTest, floorSwitchTest, eGateTest, ventTest, boardedDoorTest]),
    new Level(ctx, 0, 0, 50, world, 13, maps[13], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 14, maps[14], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 15, maps[15], itemList, [
        exitTest]),
    
    new Level(ctx, 0, 0, 50, world, 16, maps[16], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 17, maps[17], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 18, maps[18], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 19, maps[19], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 20, maps[20], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 21, maps[21], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 22, maps[22], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 23, maps[23], itemList, [
        exitTest]),
    
    new Level(ctx, 0, 0, 50, world, 24, maps[24], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 25, maps[25], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 26, maps[26], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 27, maps[27], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 28, maps[28], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 29, maps[29], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 30, maps[30], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 31, maps[31], itemList, [
        exitTest]),
    new Level(ctx, 0, 0, 50, world, 32, maps[maps.length-1], itemList, []),
];

function setLevel(level, x, y, srcpos, angle, grab, nopop) {
    if (nopop !== true) {
        states.pop();
    }
    console.log("setting level to",level,"at",x,y,"with",grab,"at",angle);
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
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height)
    states.push(levels[level]);
}