class Grid {
    constructor (h, w) {
        this.h = h;
        this.w = w;
    }
}

class Level extends GameState {
    constructor (h, w) {
        super();
        this.grid = new Grid(h, w);
    }
}

var levels = [];

