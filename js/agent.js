// helper functions
function randomInt(n) {
    return Math.floor(Math.random() * n);
};

function AgentBrain(gameEngine) {
    this.size = 4;
    this.previousState = gameEngine.grid.serialize();
    this.reset();
    this.score = 0;
};

AgentBrain.prototype.reset = function () {
    this.score = 0;
    this.grid = new Grid(this.previousState.size, this.previousState.cells);
};

// Adds a tile in a random position
AgentBrain.prototype.addRandomTile = function () {
    if (this.grid.cellsAvailable()) {
        var value = Math.random() < 0.9 ? 2 : 4;
        var tile = new Tile(this.grid.randomAvailableCell(), value);

        this.grid.insertTile(tile);
    }
};

AgentBrain.prototype.moveTile = function (tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
AgentBrain.prototype.move = function (direction) {
    // 0: up, 1: right, 2: down, 3: left
    var self = this;

    var cell, tile;

    var vector = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved = false;

    //console.log(vector);

    //console.log(traversals);

    // Traverse the grid in the right direction and move tiles
    traversals.x.forEach(function (x) {
        traversals.y.forEach(function (y) {
            cell = { x: x, y: y };
            tile = self.grid.cellContent(cell);

            if (tile) {
                var positions = self.findFarthestPosition(cell, vector);
                var next = self.grid.cellContent(positions.next);

                // Only one merger per row traversal?
                if (next && next.value === tile.value && !next.mergedFrom) {
                    var merged = new Tile(positions.next, tile.value * 2);
                    merged.mergedFrom = [tile, next];

                    self.grid.insertTile(merged);
                    self.grid.removeTile(tile);

                    // Converge the two tiles' positions
                    tile.updatePosition(positions.next);

                    // Update the score
                    self.score += merged.value;

                } else {
                    self.moveTile(tile, positions.farthest);
                }

                if (!self.positionsEqual(cell, tile)) {
                    moved = true; // The tile moved from its original cell!
                }
            }
        });
    });
    //console.log(moved);
    if (moved) {
        this.addRandomTile();
    }
    return moved;
};

// Get the vector representing the chosen direction
AgentBrain.prototype.getVector = function (direction) {
    // Vectors representing tile movement
    var map = {
        0: { x: 0, y: -1 }, // Up
        1: { x: 1, y: 0 },  // Right
        2: { x: 0, y: 1 },  // Down
        3: { x: -1, y: 0 }   // Left
    };

    return map[direction];
};

// Build a list of positions to traverse in the right order
AgentBrain.prototype.buildTraversals = function (vector) {
    var traversals = { x: [], y: [] };

    for (var pos = 0; pos < this.size; pos++) {
        traversals.x.push(pos);
        traversals.y.push(pos);
    }

    // Always traverse from the farthest cell in the chosen direction
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();

    return traversals;
};

AgentBrain.prototype.findFarthestPosition = function (cell, vector) {
    var previous;

    // Progress towards the vector direction until an obstacle is found
    do {
        previous = cell;
        cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) &&
             this.grid.cellAvailable(cell));

    return {
        farthest: previous,
        next: cell // Used to check if a merge is required
    };
};

AgentBrain.prototype.positionsEqual = function (first, second) {
    return first.x === second.x && first.y === second.y;
};

function Agent() {
};

Agent.prototype.selectMove = function (gameManager) {
    var brain = new AgentBrain(gameManager);

    // Use the brain to simulate moves
    // brain.move(i) 
    // i = 0: up, 1: right, 2: down, 3: left
    // brain.reset() resets the brain to the current game board

    if(gameManager.score < 256){
        if (brain.move(0)) return 0;
        if (brain.move(1)) return 1;
        if (brain.move(3)) return 3;
        if (brain.move(2)) return 2;
    }
    // Maximum level to end search for best state
    var maxLevel = 10;
    var expectiChance = false;
    //return this.expectiMiniMax(brain, expectiChance, maxLevel);
    console.log(brain.grid.cellAvailable());
};

Agent.prototype.evaluateGrid = function (gameManager) {
    // calculate a score for the current grid configuration
    //console.log(gameManager.grid.cells[3][1].value);

};

Agent.prototype.gridWeighted = function(grid){
    /**
     * 0    1   2   3
     * 1    2   3   4
     * 2    3   4   8
     * 3    4   8   16
     */
    var weightFactor = 16;
    var availableCells = grid.cellsAvailable();
    var bottomRightMax;
    if(grid.cellAvailable[3][3]){
        bottomRightMax = grid.cellContent[3][3].value;
    } else{
        bottomRightMax = 0;
    }
    var notOnBottomRight = false;
    for(var x = 0; x < 4; x++){
        for(var y = 0; y < 4; y++){
            // ...(y,x)
            if(grid.cellContent[y][x].value != null 
                && grid.cellContent[y][x].value > bottomRightMax 
                && (x != 3 && y != 3)){
                notOnBottomRight = true;
            }
        }
    }
    if(notOnBottomRight){
        var closeToBottomRight =  grid.cellContent[3][2].value;
        var notCloseToBottomRight = false;
        for(var x = 0; x < 4; x++){
            for(var y = 0; y < 4; y++){
                // ...(y,x)
                if(grid.cellContent[y][x].value > bottomRightMax && (x != 2 && y != 3)){
                    notCloseToBottomRight = true;
                }
            }
        }

    } else {
        return weightFactor;
    }
}

function expectiMiniMax(brain, chance, level){
    // Terminating condition
    if(level == 0){
        return this.evaluateGrid(brain);
    }
    // notChance = true, we calc prob..otherwise state
    chance = !chance;
    level--;
    if(chance){
        var maxScore = -1;
        var bestMove = -1;
        for(var i = 0; i < 4; i++){
            var conditionState = new AgentBrain(brain);
            if(conditionState.move(i)){
                var conditionScore = this.expectiMiniMax(conditionState, chance, level);
                if(conditionScore > maxScore) {
                    maxScore = conditionScore;
                    bestMove = i;
                }
            } 
        }
        return maxScore;
    } else {
        var openTiles = brain.availableCells();
        return calculateProbSum(brain, openTiles, chance, level); 
    }
}

function calculateProbSum(brain, openTiles, chance, level){
    var prob2 = 0, prob4 = 0;
    level--;
    for(var i = 0; i < openTiles.length; i++){
        var prob2Tile = new Tile(openTiles[i], 2);
        var prob4Tile = new Tile(openTiles[i], 4);
        var cloned2Brain = new AgentBrain(brain);
        var cloned4Brain = new AgentBrain(brain);
        cloned2Brain.insertTile(prob2Tile);
        cloned4Brain.insertTile(prob4Tile);
        prob2 += expectiMiniMax(cloned2Brain, chance, level);
        prob4 += expectiMiniMax(cloned4Brain, chance, level); 
    }
    return (prob2/openTiles.length) + (prob4/openTiles.length);
}