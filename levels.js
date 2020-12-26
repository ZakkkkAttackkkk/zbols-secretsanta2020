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
        // var switches = new Trie();
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
    constructor (ctx, x, y, len, world, n, map, list) {
        super(ctx);
        this.grid = new Grid(ctx, x, y, len, world);
        this.world = world;
        this.map = map;
        this.list = list;
        this.grid.register(map, list);
        this.player = new Player(ctx, x, y, len);
        this.drawables = [this.grid, this.player];
        this.elapsed = 0;
        this.n = n;
        this.states = [];
    }

    save () {
        this.player.save();
        this.grid.save();
        this.states = this.world.states.values.slice();
    }

    reset () {
        this.player.reset();
        this.world.states.values = this.states.slice();
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
                    if (end) break;
                    end = false;
                    for (var i = cell.length - 1; i >= 0; i--) {
                        var ret = cell[i].test?.(this);
                        if (ret != null) {
                            var [skip, func, args] = ret;
                            callbacks.push([func, args]);
                            if (skip != null) {
                                i = -1;
                                if (skip == "grid") {
                                    i--;
                                    end = true;
                                }
                                console.log(`skipping ${skip} at ${pos}`,cell[i]);
                                break;
                            }
                        }
                    }
                }
                for (var item of this.player.grabItems.values()) {
                    if (end) break;
                    var ret = item?.test?.(this);
                    if (ret != null) {
                        var [skip, func, args] = ret;
                        callbacks.push([func, args]);
                        if (skip == "grid") break;
                    }
                }
                // if (callbacks.length) console.log(callbacks);
                callbacks.forEach((cbck) => {
                    var [fn, args] = cbck;
                    fn(...args);
                });
            }
            log.innerHTML += 
            `{${this.world.states.values.join(",")}}\n` +
            `Level ${Math.floor(this.n/8)+1}-${this.n%8+1} (#${this.n}): (${[this.player.gx,this.player.gy]})`;
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
                ).grab(this.player, ind, this.grid, true)) {
                    this.player.grabItems[ind] = this.grid.pop(
                        this.player.gy + y,
                        this.player.gx + x
                    );
                }
            }
        }
        else if (this.player.grabItems[ind].grab(
            this.player, ind, this.grid, false
        )) {
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

maps = [
    [0, 0, [ // 0
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Sh4"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0", "Bx1"], ["FL1", "Bx2"], ["FL0", "Bx1"], ["FL1"], ["FL0"], ["FL1", "ShC"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1", "Bx2"], ["FL0"], ["FL1", "Bx1"], ["FL0"], ["FL1"], ["FL0", "Bx2"], ["FL1"], ["FL0", "DrE", ["EXT",1,1,3,0]], ],
        [["FL0", "WlW"], ["FL1"], ["FL0", "Bx1"], ["FL1", "Bx2"], ["FL0", "Bx2"], ["FL1"], ["FL0"], ["FL1", "Sh4"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "ShC"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ]],
    [0, 0, [ // 1
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL0", "WlW"], ["FL1", ["Key", 13]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh2"], ["FL1", "Sh3"], ["FL0", ["FSw", 101]], ["FL1", "Sh0"], ["FL0", "WlE"], ],
        [["FL0", "DrW", ["EXT",0,8,3,4]], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Bx1"], ["FL0", ["EGE", 0, 101]], ["FL1", "DrE", ["EXT",2,1,3,0]], ],
        [["FL1", "WlW"], ["FL0", "Sh0"], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh3"], ["FL0", "Bx2"], ["FL1", "Sh0"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", ["BdS", 30], ["EXT",8,8,1,2]], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ]],
    [0, 0, [ // 2
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL1", "WlW"], ["FL0","Bx1"], ["FL1","Bx2"], ["FL0","Bx2"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh3"], ["FL1", "WlE"], ],
        [["FL1", "DrW", ["EXT",1,6,3,4]], ["FL0"], ["FL1"], ["FL0"], ["FL1", ["KA1", 0]], ["FL0"], ["FL1", ["EGE", 0, 201]], ["FL0", "DrE", ["EXT",10,1,1,0]], ],
        [["FL0", "WlW"], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh3"], ["FL0", "Sh4"], ["FL1"], ["FL0", "Sh0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0", ["Key", 0]], ["FL1", "ShC"], ["FL0"], ["FL1", ["FSw", 201]], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", ["EXT",9,7,1,2], "M6S", ["XDS", 19]], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ]],
    [0, 0, [ // 3
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0", "Tb1"], ["FL1", "Tb3"], ["FL0", ["FSw", 304]], ["FL1", "Tb0"], ["FL0"], ["FL1", ["Key", 12]], ["FL0", "Sh4"], ["FL1", "Tb4"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Sh8"], ["FL0", "Tb8"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1", ["EGS", 0, 304]], ["FL0", "Sh4"], ["FL1", ["FSw", 303]], ["FL0", "Sh4"], ["FL1", "Sh1"], ["FL0", "Sh3"], ["FL1"], ["FL0", "Sh8"], ["FL1", "Tb8"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", ["KB6", 12]], ["FL1", "Sh8"], ["FL0", ["EGN", 0, 303]], ["FL1", "ShC"], ["FL0", "Bx2"], ["FL1", "Sh0"], ["FL0"], ["FL1", "ShC"], ["FL0", "TbC"], ["FL1"], ["FL0", ["EXT",4,1,4,0], "M3E", ["XDE", 16]], ],
        [["FL0", "WlW", ["WSw", 21]], ["FL1"], ["FL0", "ShC"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "NSN"], ["FL1"], ["FL0", "NSN"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ]],
    [0, 0, [ // 4
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN", "Vt4"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], null, null, ["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL1", "WlW"], ["FL0", "Tb4"], ["FL1", "Bx1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "CSW"], ["FL1", "WlN"], ["FL0", "WlN", ["WSw", 20]], ["FL1", "CSE"], ["FL0", "Sh4"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "TbC"], ["FL0", "Bx2"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Sh4"], ["FL0", "Bx2"], ["FL1"], ["FL0"], ["FL1", "Sh8"], ["FL0"], ["FL1", ["EXT",5,1,2,0], "DrE"], ],
        [["FL1", "WlW"], ["FL0", "Sh1"], ["FL1", "Sh7"], ["FL0"], ["FL1", "Tb0", "Bx1"], ["FL0", "Tb0"], ["FL1"], ["FL0", "Sh8"], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh3"], ["FL0", "Sh8"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", ["EXT",3,10,4,4], "M3W", ["XDW", 16]], ["FL1", "Bx1"], ["FL0", "ShF"], ["FL1"], ["FL0", "Tb0"], ["FL1", "Sh0"], ["FL0"], ["FL1", "ShC"], ["FL0"], ["FL1", "Tb1"], ["FL0", "Tb3"], ["FL1", "ShC"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1", ["S1W", 1, 20]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", ["S1E", 0, 20]], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ]],
    [0, 0, [ // 5
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL0", "WlW"], ["FL1", "Tb1"], ["FL0", "Tb2"], ["FL1", "Tb3"], ["FL0", "Sh4"], ["FL1", "Sh1"], ["FL0", "Sh3"], ["FL1", "Sh4"], ["FL0", "Sh1"], ["FL1", "Sh3"], ["FL0", "Sh4"], ["FL1", "Tb0", ["Key", 16]], ["FL0", "WlE"], ],
        [["FL1", "DrW", ["EXT",4,12,2,2]], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Sh8"], ["FL0", "Tb1"], ["FL1", "Tb3"], ["FL0", "Sh8"], ["FL1", "Tb1"], ["FL0", "Tb3"], ["FL1", "Sh8"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "ShC"], ["FL1"], ["FL0"], ["FL1", "ShC"], ["FL0"], ["FL1"], ["FL0", "ShC"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Bx1"], ["FL0", "Bx1"], ["FL1", "Sh4"], ["FL0"], ["FL1", ["EXT",13,6,4], "Drn", "DrC"], ["FL0"], ["FL1", "Sh4"], ["FL0", "Sh1"], ["FL1", "Sh3"], ["FL0", "Bx1"], ["FL1", "Bx2"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "Bx1"], ["FL1", "Bx2"], ["FL0", "ShC"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "ShC"], ["FL1", "Cbr"], ["FL0", "Bx2"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ]],
    [0, 0, [ // 6
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL1", "WlW"], ["FL0", ["FSw", 702]], ["FL1", "Sh4"], ["FL0", "Tb4"], ["FL1", "Bx2"], ["FL0", "Bx2"], ["FL1"], ["FL0", "NSN"], ["FL1"], ["FL0", "Sh4"], ["FL1", "Sh0"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0", "ShC"], ["FL1", "TbC"], ["FL0", "Sh0"], ["FL1", "Tb0"], ["FL0", "Sh1"], ["FL1", "Sh3"], ["FL0"], ["FL1", "Sh8"], ["FL0"], ["FL1", "M5E", ["XDE", 18.4], ["EXT",7,1,3,0]], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "ShC"], ["FL1", ["EGN", 0, 702]], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Bx1"], ["FL0", "Sh4"], ["FL1"], ["FL0", "Tb1"], ["FL1", "Tb2"], ["FL0", "Tb3"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", ["Key", 18]], ["FL1", "ShC"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Tb1"], ["FL0", "Tb2"], ["FL1", "Tb3"], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "M5S", ["XDS", 18.1], ["EXT",14,6,1,4]], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ]],
    [0, 0, [ // 7
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL1", "WlW"], ["FL0", "Tb0", "Bx1"], ["FL1", "Bx2"], ["FL0"], ["FL1", "Bx1"], ["FL0", "Tb0", "Bx2"], ["FL1", "Bx2"], ["FL0"], ["FL1", "Bx2"], ["FL0", "Tb0", "Bx1"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Bx2"], ["FL0", "Bx1"], ["FL1"], ["FL0", "Bx1"], ["FL1", "Bx2"], ["FL0", "Bx1"], ["FL1"], ["FL0", "Bx2"], ["FL1", ["Key", 18], "Bx1"], ["FL0", "WlE"], ],
        [["FL1", "M5W", ["XDW", 18.4], ["EXT",6,10,2,4]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Bx2"], ["FL0", "Bx1"], ["FL1"], ["FL0", "Bx1"], ["FL1", "Bx1"], ["FL0", "Bx2"], ["FL1"], ["FL0", "Bx2"], ["FL1", "Bx2"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "Tb1"], ["FL1", "Tb3"], ["FL0"], ["FL1", "Bx1"], ["FL0", "Tb0", "Bx2"], ["FL1", "Bx1"], ["FL0"], ["FL1", "Bx2"], ["FL0", "Tb0", "Bx1"], ["FL1", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "M5S", ["XDS", 18.3], ["EXT",15,3,1,2]], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ]],
    
    [0, 0, [ // 8
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", ["BdN", 30], ["EXT",1,3,5,0]], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Sh1"], ["FL0", "Sh3"], ["FL1"], ["FL0"], ["FL1"], ["FL0", ["FSw", 800]], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Pud"], ["FL0", "Pud"], ["FL1"], ["FL0", ["EGW", 0, 800]], ["FL1", ["EGN", 0, 801]], ["FL0"], ["FL1"], ["FL0"], ["FL1", ["FSw", 801]], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "Tb1"], ["FL1", "Tb2"], ["FL0", "Tb2"], ["FL1", "Tb3"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Pud"], ["FL0", "Pud"], ["FL1"], ["FL0", ["EGW", 0, 802]], ["FL1", ["EGN", 0, 803]], ["FL0"], ["FL1"], ["FL0"], ["FL1", ["FSw", 802]], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Sh1"], ["FL0", "Sh3"], ["FL1"], ["FL0"], ["FL1"], ["FL0", ["FSw", 803]], ["FL1", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ]],
    [0, 0, [ // 9
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", ["EXT",2,5,5,6], "M6N", ["XDN", 19]], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL1", "WlW"], ["FL0", "Tb4"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "NSN"], ["FL0"], ["FL1", ["FSw", 900]], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "TbC"], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh2"], ["FL1", "Sh2"], ["FL0", "Sh3"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", ["EGN", 0, 900]], ["FL1", "Sh4"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1", ["KB7", 13]], ["FL0", "ShC"], ["FL1"], ["FL0", "Tb1"], ["FL1", "Tb2"], ["FL0", "Tb3"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", ["EGN", 0, 901]], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", ["FSw", 901]], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ]],
    [0, 0, [ // 10
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], null   , null   , null   , null   , ],
        [["FL0", "DrW", ["EXT",2,6,3,4]], ["FL1"], ["FL0"], ["FL1", "Sh0"], ["FL0", "WlE"], null   , null   , null   , null   , ],
        [["FL1", "WlW"], ["FL0", "Bx1"], ["FL1"], ["FL0"], ["FL1", "CSW"], ["FL0", "WNE"], null   , null   , null   , ],
        [["FL0", "WlW"], ["FL1", ["Key",14]], ["FL0", "Bx2"], ["FL1"], ["FL0"], ["FL1", "CSW"], ["FL0", "WNE"], null   , null   , ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "CNE"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "CSW"], ["FL0", "WNE"], null   , ],
        [null   , null   , ["FL0", "WSW"], ["FL1", "CNE"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "CSW"], ["FL0", "WNE"], ],
        [null   , null   , null   , ["FL0", "WSW"], ["FL1", "CNE"], ["FL0", ["FSw", 1000]], ["FL1"], ["FL0", ["EGE", 0, 1001]], ["FL1", ["EXT",11,1,3,0], "M1E", ["XDE",14]], ],
        [null   , null   , null   , null   , ["FL0", "WSW"], ["FL1", "CNE"], ["FL0", ["EGN", 0, 1000]], ["FL1", ["FSw", 1001]], ["FL0", "WlE"], ],
        [null   , null   , null   , null   , null   , ["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ]],
    [0, 0, [ // 11
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Sh4"], ["FL0", ["EGN", 0, 1101]], ["FL1", ["FSw", 1103]], ["FL0", ["Key", 2]], ["FL1", "Sh0"], ["FL0", "Bx1"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0", "Bx2"], ["FL1"], ["FL0", "ShC"], ["FL1", ["EGN", 0, 1100]], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh3"], ["FL1", ["FSw", 1102]], ["FL0", "WlE"], ],
        [["FL1", ["EXT",10,7,6,4], "M1W", ["XDW", 14]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Bx1"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1", ["EGN", 0, 1102]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Sh1"], ["FL0", "Sh2"], ["FL1", "Sh3"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0", ["FSw", 1101]], ["FL1", "Tb4"], ["FL0"], ["FL1", "Tb1"], ["FL0", "Tb3"], ["FL1"], ["FL0", ["KA3", 2]], ["FL1", ["EGE", 0, 1103]], ["FL0"], ["FL1", ["EXT",12,1,5,0], "DrE"], ],
        [["FL0", "WlW"], ["FL1", ["FSw", 1100]], ["FL0", "TbC"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Sh1"], ["FL0", "Sh3"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ]],
    [0, 0, [ // 12
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "Vt1"], ["FL0", "Vt2"], ["FL1", "Vt2"], ["FL0", ["EXT",4,4,1], "Vt2", "Vt4"], ["FL1", "Vt2"], ["FL0", "Vt3"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL1", "WlW"], ["FL0", ["FSw", 1200]], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh3"], ["FL1"], ["FL0", "Sh0"], ["FL1", "Sh4"], ["FL0", ["Key", 15]], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1", ["FSw", 1202]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Sh8"], ["FL1", ["EGN", 0, 1204]], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0", ["FSw", 1204]], ["FL1"], ["FL0", "Tb1"], ["FL1", "Tb3"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "ShC"], ["FL0", ["EGN", 0, 1202]], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", ["EGN", 0, 1200]], ["FL0", "WlE"], ],
        [["FL1", "DrW", ["EXT",11,9,5,4]], ["FL0"], ["FL1"], ["FL0", "Sh4"], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh3"], ["FL1"], ["FL0"], ["FL1", ["BdE", 40], ["EXT",13,1,4,0]], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1", "ShC"], ["FL0"], ["FL1"], ["FL0", "Ldr"], ["FL1", "Sh0"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", ["EXT",20,1,1,0], "M2S", ["XDS", 15]], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ]],
    [0, 0, [ // 13
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL0", "WlW"], ["FL1", "Bx1"], ["FL0", "Sh4"], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh3"], ["FL1", "Tb1", "Cbr"], ["FL0", "Tb3"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", ["EGN", 0, 1300]], ["FL1", "ShC"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Tb4"], ["FL1", ["S2N", 0, 21]], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1", ["FSw", 1300]], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Tb0"], ["FL0"], ["FL1", "Tb0"], ["FL0"], ["FL1", "Sh4"], ["FL0", "Wir"], ["FL1", "ShC"], ["FL0"], ["FL1", ["EXT",14,1,3,0], "DrE"], ],
        [["FL1", ["BdW", 40], ["EXT",12,9,5,6]], ["FL0", ["EGN", 0, 1300]], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Sh8"], ["FL1"], ["FL0"], ["FL1", "Sh0"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Tb1"], ["FL1", "Tb3"], ["FL0", "Sh1"], ["FL1", "Sh3"], ["FL0"], ["FL1", "ShC"], ["FL0", "Sh0"], ["FL1"], ["FL0", ["Key", 18]], ["FL1", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ]],
    [0, 0, [ // 14
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "M5N", ["XDN", 18.1], ["EXT",6,6,5,6]], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL1", "WlW"], ["FL0", "Sh0"], ["FL1", "Tb1"], ["FL0", "Tb2"], ["FL1", "Tb2"], ["FL0", "Tb3"], ["FL1"], ["FL0"], ["FL1", "Tb1"], ["FL0", "Tb3"], ["FL1", "Sh0"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "M5E", ["XDE", 18.2], ["EXT",15,1,3,0]], ],
        [["FL1", "DrW", ["EXT",13,12,3,4]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Tb5"], ["FL1", "Tb7"], ["FL0"], ["FL1"], ["FL0", "Bx1"], ["FL1", "Bx2"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Bx1"], ["FL0", "Tb4"], ["FL1", "Bx2"], ["FL0"], ["FL1", "TbD"], ["FL0", "TbF"], ["FL1"], ["FL0"], ["FL1", "Bx2"], ["FL0", "Bx2"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", ["FSw", 1402], "Bx2"], ["FL1", "Tb8", ["Key", 11]], ["FL0", "Bx2"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Sh1"], ["FL0", "Sh2"], ["FL1", "Sh3"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Bx2"], ["FL0", "TbC"], ["FL1", "Bx1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", ["EGE", 1, 1402]], ["FL0", ["KB5", 11]], ["FL1"], ["FL0", "Tb0"], ["FL1", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ]],
    [0, 0, [ // 15
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "M5N", ["XDN", 18.3], ["EXT",7,3,5,6]], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL1", "WlW"], ["FL0", "Tb4"], ["FL1", ["EGW", 0, 1504]], ["FL0"], ["FL1"], ["FL0", "Tb1"], ["FL1", "Tb3"], ["FL0", ["FSw", 1500]], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "TbD"], ["FL0", "TbF"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", ["FSw", 1501]], ["FL0", "WlE"], ],
        [["FL1", "M5W", ["XDW", 18.2], ["EXT",14,10,2,4]], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Sh1"], ["FL0", "Sh3"], ["FL1"], ["FL0", ["FSw", 1502]], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "NSE"], ["FL1", "Sh4"], ["FL0"], ["FL1", ["FSw", 1503]], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "Sh0"], ["FL1", "Tb0"], ["FL0", "Sh0"], ["FL1", ["EGN", 0, 1503]], ["FL0", "Sh8"], ["FL1"], ["FL0", ["FSw", 1504]], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Tb0", ["Key", 18]], ["FL0", ["EGW", 0, 1500]], ["FL1", ["EGW", 0, 1501]], ["FL0", ["EGN", 0, 1502]], ["FL1", "ShC"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "DrS", ["EXT",23,6,1,2]], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ]],
    
    [0, 0, [ // 16
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "CSE"], ["FL0", "WNW"], ],
        [["FL0", "WlW"], ["FL1", ["Key", 8]], ["FL0", ["EGN", 0, 1601]], ["FL1"], ["FL0", ["FSw", 1601]], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Bx2"], ["FL1", "WlW"], ],
        [["FL1", "WlW"], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh2"], ["FL1", "Sh3"], ["FL0"], ["FL1"], ["FL0", "Tb5"], ["FL1", "Tb6"], ["FL0", "Tb7"], ["FL1"], ["FL0"], ["FL0", "WlW"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "TbD"], ["FL0", "TbE"], ["FL1", "TbF"], ["FL0"], ["FL1"], ["FL1", "WlW"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL0", "WL1", ["EXT",17,1,4,0]], ],
        [["FL0", "WlW"], ["FL1", ["EGS", 0, 1603]], ["FL0", "Sh4"], ["FL1", "Tra"], ["FL0", "Sh0"], ["FL1", "Tra"], ["FL0", "Sh4"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL1", "WlW"], ],
        [["FL1", "WlW"], ["FL0", ["KB3", 8]], ["FL1", "Sh8"], ["FL0", "Bx1"], ["FL1", "Bx2"], ["FL0", "Bx1"], ["FL1", "Sh8"], ["FL0"], ["FL1", "Tb5"], ["FL0", "Tb3"], ["FL1"], ["FL0", "Sh0"], ["FL0", "WlW"], ],
        [["FL0", "WlW"], ["FL1", "Brm"], ["FL0", "ShC"], ["FL1", "Bx1"], ["FL0", "Bx2"], ["FL1", "Bx2"], ["FL0", "ShC"], ["FL1"], ["FL0", "TbD"], ["FL1", "Sh0"], ["FL0"], ["FL1", ["FSw", 1603]], ["FL1", "WlW"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WL2", ["EXT",24,4,1,2]], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL0", "WSW"], ],
    ]],
    [0, 0, [ // 17
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0", ["FSw", 1701]], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Sh4"], ["FL0"], ["FL1", "Sh1"], ["FL0", "Sh2"], ["FL1", "Sh3"], ["FL0", "Tb0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "DrE", ["EXT",18,1,2,0]], ],
        [["FL1", "WlW"], ["FL0", "ShC"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WL1", ["EXT",16,11,4,4]], ["FL1", ["KB1", 7]], ["FL0"], ["FL1"], ["FL0", "Tb1"], ["FL1", "Tb3"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Tb4"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "Sh4"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Tb8"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "ShC"], ["FL0"], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh3"], ["FL0", "Sh4"], ["FL1"], ["FL0"], ["FL1", "Tb8"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Bx1"], ["FL1", "ShC"], ["FL0"], ["FL1"], ["FL0", "TbC"], ["FL1", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", ["EXT",25,4,1,2], ["EGS", 0, 1701]], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ]],
    [0, 0, [ // 18
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], null, null, null, null, null, null, ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0", "CSW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL0", "DrW", ["EXT",17,9,2,4]], ["FL1"], ["FL0", "Pud"], ["FL1", "Pud"], ["FL0"], ["FL1", "Pud"], ["FL0", "Pud"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1", "Pud"], ["FL0", "Pud"], ["FL1"], ["FL0"], ["FL1", "Pud"], ["FL0"], ["FL1"], ["FL0", "DrE", ["EXT",19,1,3,0]], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1", "Pud"], ["FL0", "Pud"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0", "Pud"], ["FL1", "Pud"], ["FL0", "Pud"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Pud"], ["FL1", "Pud"], ["FL0", "Pud"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "Sh0"], ["FL1", "Tb0"], ["FL0", "CNW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ],
    ]],
    [0, 0, [ // 19
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh3"], ["FL1", "Bx1"], ["FL0", "Bx2"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "Sh1"], ["FL1", "Sh3"], ["FL0"], ["FL1", "Bx1"], ["FL0", "Tb0"], ["FL1", ["FSw", 1900], "Bx2"], ["FL0", "Bx1"], ["FL1", "Sh0"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", ["EXT",18,8,3,4], "DrW"], ["FL1", ["EGW", 1, 1900]], ["FL0", ["EGW", 1, 1901]], ["FL1", ["EGW", 1, 1902]], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "Sh1"], ["FL1", "Sh3"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Bx2"], ["FL1", "Bx1"], ["FL0", "Tb1"], ["FL1", "Tb3"], ["FL0", "Bx1"], ["FL1"], ["FL0", ["FSw", 1902]], ["FL1", ["EXT",20,1,5,0], "M4E", ["XDE", 17]], ],
        [["FL1", "WlW"], ["FL0", "Bx2"], ["FL1", "Bx1"], ["FL0", "Bx2"], ["FL1", "Sh4"], ["FL0", "Bx2"], ["FL1", "Tb0", "Bx1"], ["FL0", "Bx1"], ["FL1", "Bx2"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Sh0"], ["FL0", "Tb0"], ["FL1", "Bx1"], ["FL0", "ShC"], ["FL1", "Bx2"], ["FL0", "Sh0"], ["FL1", ["FSw", 1901], "Bx2"], ["FL0", "Sh0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ]],
    [0, 0, [ // 20
        [["FL0", "WNW"], ["FL1", "M2N", ["XDN", 15], ["EXT",12,2,6,6]], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Mop"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Sh0"], ["FL0", "Tb0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Bx2"], ["FL1", "Sh4"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "Bx1"], ["FL1"], ["FL0"], ["FL1", "Bx1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Bx1"], ["FL0", "Sh8"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0", "Bx2"], ["FL1", "Sh4"], ["FL0", "Pud"], ["FL1", "Pud"], ["FL0"], ["FL1"], ["FL0", "Bx1"], ["FL1", "ShC"], ["FL0", "WlE"], ],
        [["FL1", ["EXT",19,10,5,4], "M4W", ["XDW", 17]], ["FL0"], ["FL1", "Bx1"], ["FL0", "Sh8"], ["FL1", "Pud"], ["FL0", "Pud"], ["FL1", "Tb0"], ["FL0"], ["FL1", "Bx2"], ["FL0", "ShC"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1", "Sh8"], ["FL0"], ["FL1", "Sh4"], ["FL0", "Sh0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0", "ShC"], ["FL1", ["Key", 17]], ["FL0", "ShC"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ]],
    [0, 0, [ // 21
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], null],
        [["FL1", "WlW"], ["FL0", "Mop"], ["FL1", ["EGN", 0, 2101]], ["FL0", ["EGN", 0, 2102]], ["FL1", "Tb4"], ["FL0", "Sh4"], ["FL1", "Bx2"], ["FL0", "Sh4"], ["FL1", "Bx1"], ["FL0", "Sh4"], ["FL1", "Tb1"], ["FL0", "Tb3"], ["FL1", "CSW"], ["FL0", "WNE"], ],
        [["FL0", "WlW"], ["FL1", "Sh0"], ["FL0", "Tb0"], ["FL1", ["KB4", 10]], ["FL0", "TbC"], ["FL1", "Sh8"], ["FL0", "Bx1"], ["FL1", "Sh8"], ["FL0", "Bx2"], ["FL1", "Sh8"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "ShC"], ["FL1", ["S5N", 1, 24]], ["FL0", "ShC"], ["FL1", ["S5N", 0, 24]], ["FL0", "ShC"], ["FL1"], ["FL0"], ["FL1"], ["FL0", ["EXT",22,1,2,0], "DrE"], ],
        [["FL0", "WlW"], ["FL1", "Sh4"], ["FL0", ["S5N", 0, 24]], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", ["S5N", 1, 24]], ["FL0", "Sh4"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "ShC"], ["FL1", ["S5N", 0, 24]], ["FL0", "Sh0"], ["FL1"], ["FL0", "Tb5"], ["FL1", "Tb6"], ["FL0", "Tb6"], ["FL1", "Tb7"], ["FL0"], ["FL1", "Sh0"], ["FL0", ["S5N", 1, 24]], ["FL1", "ShC"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Tb0"], ["FL0"], ["FL1", "NSN"], ["FL0"], ["FL1", "TbD"], ["FL0", "TbE"], ["FL1", "TbE"], ["FL0", "TbF"], ["FL1"], ["FL0", "NSN"], ["FL1"], ["FL0", "Tb0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", ["FSw", 2102]], ["FL1", "Sh1"], ["FL0", "Sh3"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Sh1"], ["FL0", "Sh3"], ["FL1", ["FSw", 2101]], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", ["EXT",29,4,1,2], ["BdS", 50]], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ]],
    [0, 0, [ // 22
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1", "Sh0"], ["FL0", "Tb0"], ["FL1"], ["FL0", ["EGE", 0, 2203]], ["FL1", "Pud"], ["FL0", ["KA5", 4]], ["FL1", "Pud"], ["FL0", "Brm"], ["FL1", "WlE"], ],
        [["FL0", ["EXT",21,12,3,4], "DrW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Sh0"], ["FL0", "Tb1"], ["FL1", "Tb2"], ["FL0", "Tb3"], ["FL1", "Sh0"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "NSW"], ["FL0", "Sh4"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Tb0"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1", "ShC"], ["FL0"], ["FL1", "Tb1"], ["FL0", "Tb3"], ["FL1", "Sh4"], ["FL0"], ["FL1"], ["FL0", ["FSw", 2203]], ["FL1", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Tb1", ["Key", 4]], ["FL0", "Tb3"], ["FL1"], ["FL0", "Tra"], ["FL1", "Tra"], ["FL0", "ShC"], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh3"], ["FL0", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", ["EXT",30,4,1,4], "DrS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ]],
    [0, 0, [ // 23
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "DrN", ["EXT",15,6,6,6]], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "Sh0"], ["FL1", "Tb0"], ["FL0", "Sh0"], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh3"], ["FL0", "Tb0"], ["FL1", "Sh4"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Bx2"], ["FL0", "Bx1"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Tb0"], ["FL1", "NSE"], ["FL0", "Sh8"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "Tb0"], ["FL1", "Sh0"], ["FL0"], ["FL1", "Sh4"], ["FL0", "Bx2"], ["FL1", "Sh0"], ["FL0"], ["FL1", "Sh0"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Bx1"], ["FL0", "Bx1"], ["FL1"], ["FL0", "Sh8"], ["FL1", "Bx1"], ["FL0"], ["FL1", "Bx1"], ["FL0", "Bx2"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "Tb0"], ["FL1"], ["FL0", "Sh4"], ["FL1", "ShC"], ["FL0", "Tb0"], ["FL1", "Sh0"], ["FL0"], ["FL1", "Sh0"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1", "ShC"], ["FL0"], ["FL1", ["Key", 19]], ["FL0"], ["FL1", "NSS"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ]],
    
    [0, 0, [ // 24
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WL2", ["EXT",16,4,7,6]], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSW"], ],
        [["FL1", "CNE"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Sh0"], ["FL0", "Tb0"], ["FL1", "Sh0"], ["FL0"], ["FL1"], ["FL0", "CNW"], ],
        [["FL0", "WlW"], ["FL1", "Sh4"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Tb0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "Sh8"], ["FL1"], ["FL0", "Tb1"], ["FL1", "Tb2"], ["FL0", "Tb2"], ["FL1", "Tb2"], ["FL0", "Tb3"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE", ["WSw", 22]], ],
        [["FL0", "WlW"], ["FL1", "Sh8"], ["FL0"], ["FL1"], ["FL0", "Bx2"], ["FL1", "Bx1"], ["FL0"], ["FL1", "Bx1"], ["FL0"], ["FL1"], ["FL0", "Tb0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "ShC"], ["FL1"], ["FL0", "Tb1"], ["FL1", "Tb2"], ["FL0", "Tb2"], ["FL1", "Tb2"], ["FL0", "Tb3"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1", "Bx1"], ["FL0", "Bx1"], ["FL1"], ["FL0", "Bx1"], ["FL1", "Bx2"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ]],
    [0, 0, [ // 25
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", ["EXT",17,3,7,6], ["EGN", 0, 1701]], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh2"], ["FL1", "Sh3"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Tb5"], ["FL1", "Tb6"], ["FL0", "Tb7"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "Bx1"], ["FL1", "Bx2"], ["FL0", "Sh4"], ["FL1"], ["FL0"], ["FL1", "TbD"], ["FL0", "TbE"], ["FL1", "TbF"], ["FL0"], ["FL1"], ["FL0", ["EXT",26,1,4,0], ["S3E", 0, 22]], ],
        [["FL0", "WlW"], ["FL1", "Bx2"], ["FL0", "Bx1"], ["FL1", "Sh8"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", ["Key", 7]], ["FL1", "Bx1"], ["FL0", "ShC"], ["FL1"], ["FL0"], ["FL1", "Tb0"], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh3"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ]],
    [0, 0, [ // 26
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL1", "WlW"], ["FL0", "Tb1"], ["FL1", "Tb3", ["Key", 1]], ["FL0", "Tb4"], ["FL1"], ["FL0", "Sh0"], ["FL1"], ["FL0", "Sh4"], ["FL1"], ["FL0"], ["FL1", "Bx2"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Bx1"], ["FL0", "Bx2"], ["FL1", "TbC"], ["FL0"], ["FL1", "Bx2"], ["FL0"], ["FL1", "Sh8"], ["FL0"], ["FL1", "Sh1"], ["FL0", "Sh3"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0", "Sh4"], ["FL1", "NSW"], ["FL0", "Tb4", "Bx1"], ["FL1", "NSE"], ["FL0", "Sh8"], ["FL1", "Bx1"], ["FL0"], ["FL1"], ["FL0", "DrE", ["EXT",27,1,3,0]], ],
        [["FL0", ["EXT",25,10,4,4], ["S3W", 0, 22]], ["FL1"], ["FL0"], ["FL1", "ShC"], ["FL0"], ["FL1", "TbC"], ["FL0"], ["FL1", "ShC"], ["FL0", "Bx1"], ["FL1", "Sh1"], ["FL0", "Sh3"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0", ["KA2", 1]], ["FL1"], ["FL0", "Sh4"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1", "Sh0"], ["FL0"], ["FL1", "ShC"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Tb0"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ]],
    [0, 0, [ // 27
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WNE"], ],
        [["FL0", "WlW"], ["FL1", ["FSw", 2701]], ["FL0", ["KA4", 3]], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Bx2"], ["FL1", "Sh4"], ["FL0", ["Key", 9]], ["FL1", "Sh4"], ["FL0", "Tb0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "Sh1"], ["FL1", "Sh3"], ["FL0"], ["FL1"], ["FL0", "Tb5"], ["FL1", "Tb7"], ["FL0", "ShC"], ["FL1", ["S4N", 1, 23]], ["FL0", "ShC"], ["FL1"], ["FL0", ["EXT",28,1,2,0], ["EGE", 0, 2700]], ],
        [["FL0", ["EXT",26,10,3,4], "DrW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "Tb9"], ["FL0", "TbB"], ["FL1"], ["FL0"], ["FL1", "Tb0"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "TbD"], ["FL1", "TbF"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Sh1"], ["FL0", "Sh2"], ["FL1", "Sh3"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Tb4"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0", ["FSw", 2700]], ["FL1", ["KB2", 9]], ["FL0", ["S4W", 0, 23]], ["FL1", "Bx1"], ["FL0"], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh3"], ["FL1", "TbC"], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS", ["WSw", 23]], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ]],
    [0, 0, [ // 28
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0", "Sh0"], ["FL1", ["FSw", 2802], "Bx2"], ["FL0", "Bx1"], ["FL1", "Bx2"], ["FL0"], ["FL1", "Sh1"], ["FL0", "Sh3"], ["FL1", "Tb0", ["Key", 10]], ["FL0", "WlE"], ],
        [["FL0", ["EXT",27,10,2,2], ["EGW", 0, 2700]], ["FL1"], ["FL0"], ["FL1", "Bx1"], ["FL0", "Bx1"], ["FL1", "Sh0"], ["FL0", "Tb0"], ["FL1"], ["FL0", "Tb1"], ["FL1", "Tb3"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", ["EXT",29,1,3,0], ["EGE", 0, 2701]], ],
        [["FL0", "WlW"], ["FL1"], ["FL0", "Tb5"], ["FL1", "Tb7"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1", "TbD"], ["FL0", "TbF"], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh3"], ["FL1", ["S4N", 0, 23]], ["FL0", "Sh1"], ["FL1", "Sh3"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", ["EGE", 1, 2802]], ["FL0", ["FSw", 2803]], ["FL1", ["EGE", 0, 2803]], ["FL0"], ["FL1", ["S4E", 1, 23]], ["FL0", "Tb0", ["Key", 3]], ["FL1", "WlE"], ],
        [["FL1", "WSW"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ]],
    [0, 0, [ // 29
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", ["EXT",21,7,7,6], ["BdN", 50]], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN", ["WSw", 24]], ["FL0", "WNE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0", "Tb1"], ["FL1", "Tb3"], ["FL0"], ["FL1", "Tb1"], ["FL0", "Tb3"], ["FL1", "Sh1"], ["FL0", "Sh3"], ["FL1", "Tb0"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", ["EXT",28,10,3,4], ["EGW", 0, 2701]], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", ["EXT",30,1,3,0], "DrE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh2"], ["FL1", "Sh3"], ["FL0", "Tb0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1", ["KA7", 6]], ["FL0", "Tb0"], ["FL1"], ["FL0"], ["FL1", "NSS"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1", "Tb0"], ["FL0", "Sh1"], ["FL1", "Sh2"], ["FL0", "Sh2"], ["FL1", "Sh2"], ["FL0", "Sh3"], ["FL1", "Tb0"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ]],
    [0, 0, [ // 30
        [["FL0", "WNW"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", ["EXT",22,5,6,6], "DrN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Sh0"], ["FL1"], ["FL0", "Tb1"], ["FL1", "Tb3"], ["FL0", "WlE"], ],
        [["FL0", "WlW"], ["FL1", "Sh0"], ["FL0", "Pud"], ["FL1", "Tra"], ["FL0", "Sh0"], ["FL1", "Tb0"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL1", ["EXT",29,10,3,4], "DrW"], ["FL0"], ["FL1", "Tra"], ["FL0", "Pud"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", ["EXT",31,1,3,0], "DrE"], ],
        [["FL0", "WlW"], ["FL1", "Sh0"], ["FL0", "Cbr"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "Tb0"], ["FL1", "Sh0"], ["FL0", "Sh4"], ["FL1", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0", "Tb1"], ["FL1", "Tb3"], ["FL0"], ["FL1", ["KA6", 5]], ["FL0"], ["FL1", "ShC"], ["FL0", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WSE"], ],
    ]],
    [0, 0, [ // 31
        [["FL1", "WNW"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WlN"], ["FL0", "WlN"], ["FL1", "WNE"], ],
        [["FL0", "WlW"], ["FL1", "Sh0"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", ["Key", 5]], ["FL1", "Tb7"], ["FL0"], ["FL1", "Sh0"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0", "Tb1"], ["FL1", "Tb2"], ["FL0", "Tb2"], ["FL1", "Tb2"], ["FL0", "TbF"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
        [["FL0", ["EXT",30,8,3,4], "DrW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "EX1"], ],
        [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "EX2"], ],
        [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1", "Tb1"], ["FL0", "Tb2"], ["FL1", "Tb2"], ["FL0", "Tb2"], ["FL1", "Tb7"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
        [["FL1", "WlW"], ["FL0", "Sh0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", ["Key", 6]], ["FL0", "TbF"], ["FL1"], ["FL0", "Sh0"], ["FL1", "WlE"], ],
        [["FL0", "WSW"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WlS"], ["FL1", "WlS"], ["FL0", "WSE"], ],
    ]],
    
    // [ // n
    //     [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
    //     [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
    //     [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
    //     [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
    //     [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
    //     [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
    //     [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
    //     [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
    //     [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
    //     [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
    //     [["FL0", "WlW"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1", "WlE"], ],
    //     [["FL1", "WlW"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0"], ["FL1"], ["FL0", "WlE"], ],
    //     [[], ],
    // ]
];

levels = maps.map((el, i) => {
    var [r, c, map] = el;
    return new Level(ctx, r, c, 50, world, i, map, itemList);
})

function setLevel(level, x, y, srcpos, angle, grab, nopop) {
    if (nopop !== true) {
        states.pop();
    }
    console.log("setting level to",level,"at",x,y,"with",grab,"at",angle);
    var target = levels[level];
    target.player.gx = x;
    target.player.gy = y;
    if (grab != null) {
        target.player.startAngle = angle;
        var [dx, dy] = target.player.dirs[angle];
        grab.gx = x + dx;
        grab.gy = y + dy;
        grab.grab(target.player, 0, target.grid, true);
        target.player.grabItems[0] = grab;
    }
    target.save();
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height)
    states.push(target);
}