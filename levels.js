class Grid  {
    constructor (h, w) {
        this.h = h;
        this.w = w;
    }

    draw () {
        
    }
}

class Level extends GameState {
    constructor (h, w) {
        super();
        this.grid = new Grid(h, w);
    }

    draw () {
        this.grid.draw();
    }
}

var levels = [];

levels.push(new Level(5,5));