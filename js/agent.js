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
    // if (moved) {
    //     this.addRandomTile();
    // }
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
    this.depthLimit = 4;
    this.chance = true;
};

Agent.prototype.selectMove = function (gameManager) {
    var brain = new AgentBrain(gameManager);
    var bestMove;
    var bestScore = 0;
    var recentBest, otherMove;
    // Use the brain to simulate moves
    // brain.move(i) 
    // i = 0: up, 1: right, 2: down, 3: left
    // brain.reset() resets the brain to the current game board
    for(var i = 0; i < 4; i++){
        var clonedBrain = new AgentBrain(brain);
        var currentScore = 0;
        if(i==0 && clonedBrain.move(i)){
            otherMove = i;
        }
        if(clonedBrain.move(i)){
            currentScore = this.expectimax(clonedBrain, this.chance, this.depthLimit);
            recentBest = i;
            if(currentScore > bestScore){
                bestScore = currentScore;
                bestMove = i;
            }
        }
    }
    // console.log("Bad move bestMove: " + bestMove);
    // console.log("Bad move otherMove: " + otherMove);
    // console.log("Bad move recentBest: " + recentBest);
    return bestMove || recentBest;
};

/**
 * This returns teh value from the grid,
 * based on the weightMatrix, which is 
 * referrenced from:
 * http://cs229.stanford.edu/proj2016/report/NieHouAn-AIPlays2048-report.pdf
 */
Agent.prototype.evaluateGrid = function (brain) {
    var base = 2;
    var exponent = 16;
    var divisor = Math.pow(base, exponent+1);
    var weightedGrid2 = [[Math.pow(base, exponent-12)/divisor, Math.pow(base, exponent-13)/divisor, Math.pow(base, exponent-14)/divisor, Math.pow(base, exponent-15)/divisor],
                        [Math.pow(base, exponent-11)/divisor, Math.pow(base, exponent-10)/divisor, Math.pow(base, exponent-9)/divisor, Math.pow(base, exponent-8)/divisor],
                        [Math.pow(base, exponent-4)/divisor, Math.pow(base, exponent-5)/divisor, Math.pow(base, exponent-6)/divisor, Math.pow(base, exponent-7)/divisor],
                        [Math.pow(base, exponent-3)/divisor, Math.pow(base, exponent-2)/divisor, Math.pow(base, exponent-1)/divisor, Math.pow(base, exponent)/divisor]];
    
    var weightedGrid = [[0.135759, 0.121925, 0.102812, 0.099937],
                       [0.0997992, 0.08884805, 0.076711, 0.0724143],
                       [0.060654, 0.0562579, 0.037116, 0.0161889],
                       [0.0125498, 0.00992495, 0.00575871, 0.00335193]];

    var weightedGrid2 = [[0, 0, Math.pow(base, 1), Math.pow(base, 1)],
                        [0, Math.pow(base, 1), Math.pow(base, 3), Math.pow(base, 5)],
                        [Math.pow(base, 1), Math.pow(base, 3), Math.pow(base, 5), Math.pow(base, 7)],
                        [Math.pow(base, 3), Math.pow(base, 5), Math.pow(base, 7), Math.pow(base, 9)]];
    var cells = brain.grid.cells;
    var score = 0;
    var count = 0;
    for(var x = 0; x < 4; x++){
        for(var y = 0; y < 4; y++){
            if(cells[x][y] !== null){
                // console.log("Cell Values: " + brain.grid.cells[x][y].value);
                // console.log("Weighted Values: " + weightedGrid[x][y]);
                score += cells[x][y].value * weightedGrid[x][y];
                if(x > 0 && cells[x-1][y] !== null){
                    if(cells[x-1][y] == cells[x][y]){ // More Score for adjacent row tiles
                        score += cells[x][y].value / 2048;
                    }
                }
                if(y > 0 && cells[x][y-1] !== null){
                    if(cells[x][y-1] == cells[x][y]){ // More Score for adjacent row tiles
                        score += cells[x][y].value / 2048;
                    }
                }
            } else { 
                count++;
            }
        }
    }
    //     NEED BETTER HEURISTIC FOR FREE SPACES
    if(count < 8){
        score -= score * count / 16; 
    } else {
        score += score * count / 16;
    }
    // console.log(score);
    return score;
};

Agent.prototype.expectimax = function (brain, chance, depthLimit){
    // Terminating condition
    if(depthLimit == 0 || brain.over){
        return this.evaluateGrid(brain);
    }
    depthLimit--;
    if(chance){
        var openTiles = brain.grid.availableCells();
        var summation = 0;
        for(var i = 0; i < openTiles.length; i++){
            var p2 = new Tile(openTiles[i], 2);
            var b2 = new AgentBrain(brain);
            b2.grid.insertTile(p2);
            var p4 = new Tile(openTiles[i], 4);
            var b4 = new AgentBrain(brain);
            b4.grid.insertTile(p4);
            summation += (0.9 * this.expectimax(b2, chance, depthLimit) + 0.1 * this.expectimax(b4, chance, depthLimit)); 
        }
        return summation /= openTiles.length;
    } else {
        // console.log("No Chance 1: " + chance);
        var maxScore = 0;
        for(var i = 0; i < 4; i++){
            var clonedBrain = new AgentBrain(brain);
            // console.log("Here " + i);
            if(clonedBrain.move(i)){
                var evaluatedScore = this.expectimax(clonedBrain, !chance, depthLimit);
                if(evaluatedScore > maxScore) {
                    maxScore = evaluatedScore;
                }
            } 
        }
        return maxScore;
    } 
};
