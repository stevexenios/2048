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
    /**
     * The search for the optimal next moves ends at the given depth limit.
     */
    this.depthLimit = 4;
    /**
     * This tells the expectimax algorithm which state of the game, we
     * want a score for.
     */
    this.chance = true;
};

/**
 * Use the brain to simulate moves:
 * brain.move(i)
 * 
 * For i is: 
 * 0: up
 * 1: right
 * 2: down
 * 3: left
 * 
 * brain.reset() resets the brain to the current game board
 */
Agent.prototype.selectMove = function (gameManager) {
    var brain = new AgentBrain(gameManager);
    var twoMoves = this.initExpectiMax(brain);
    return twoMoves.move1 || twoMoves.move2;
};

/**
 * Function returning the two move object:
 * move1 based on expecti max
 * move2 based on possible moves
 */
Agent.prototype.initExpectiMax = function(brain){
    /**
     * These are variables to hold the most recent moves so
     * that we don't get bad moves. Also last var keeps score
     */
    var bestMove, recentMove, bestScore = 0;
    for(var i = 0; i < 4; i++){
        var clonedBrain = new AgentBrain(brain);
        if(clonedBrain.move(i)){
            var currentScore = this.expectimax(clonedBrain, this.chance, this.depthLimit);
            recentMove = i;
            if(currentScore > bestScore){
                bestScore = currentScore;
                bestMove = i;
            }
        }
    }
    // console.log("Bad move bestMove: " + bestMove);
    // console.log("Bad move recentMove: " + recentMove);
    return {move1: bestMove, move2:recentMove};
}

/**
 * This returns the value from the grid, based on the weightMatrix 
 * 
 * Referrences for the Weight Matrices are:
 * 1. https://codemyroad.wordpress.com/2014/05/14/2048-ai-the-intelligent-bot/
 * 2. http://cs229.stanford.edu/proj2016/report/NieHouAn-AIPlays2048-report.pdf
 * 3. https://stackoverflow.com/questions/22342854/what-is-the-optimal-algorithm-for-the-game-2048
 */
Agent.prototype.evaluateGrid = function (brain) {
    var base1 = 2;
    var base = 4;
    var exponent = 16;
    var divisor = Math.pow(base, exponent + 1);
    /**
     * All these weighted grids serve the purpose of Monotonicity, in which all 
     * the tiles are all either increasing or decreasing along both left/right 
     * and up/down directions.
     */
    var weightedGrid = [[Math.pow(base, exponent-12)/divisor, Math.pow(base, exponent-13)/divisor, Math.pow(base, exponent-14)/divisor, Math.pow(base, exponent-15)/divisor],
                        [Math.pow(base, exponent-11)/divisor, Math.pow(base, exponent-10)/divisor, Math.pow(base, exponent-9)/divisor, Math.pow(base, exponent-8)/divisor],
                        [Math.pow(base, exponent-4)/divisor, Math.pow(base, exponent-5)/divisor, Math.pow(base, exponent-6)/divisor, Math.pow(base, exponent-7)/divisor],
                        [Math.pow(base, exponent-3)/divisor, Math.pow(base, exponent-2)/divisor, Math.pow(base, exponent-1)/divisor, Math.pow(base, exponent)/divisor]];
    
    var weightedGrid2 = [[0.135759, 0.121925, 0.102812, 0.099937],
                       [0.0997992, 0.08884805, 0.076711, 0.0724143],
                       [0.060654, 0.0562579, 0.037116, 0.0161889],
                       [0.0125498, 0.00992495, 0.00575871, 0.00335193]];

    var weightedGrid3 = [[Math.pow(base, exponent-15), Math.pow(base, exponent-14), Math.pow(base, exponent-13), Math.pow(base, exponent-12)],
                        [Math.pow(base, exponent-8), Math.pow(base, exponent-9), Math.pow(base, exponent-10), Math.pow(base, exponent-11)],
                        [Math.pow(base, exponent-7), Math.pow(base, exponent-6), Math.pow(base, exponent-5), Math.pow(base, exponent-4)],
                        [Math.pow(base, exponent), Math.pow(base, exponent-1), Math.pow(base, exponent-2), Math.pow(base, exponent-3)]];
    var cells = brain.grid.cells;
    var score = 0;
    for(var x = 0; x < 4; x++){
        for(var y = 0; y < 4; y++){
            if(cells[x][y] !== null){
                // console.log("Cell Values: " + brain.grid.cells[x][y].value);
                // console.log("Weighted Values: " + weightedGrid[x][y]);
                score += (cells[x][y].value * weightedGrid[x][y]);
            }
        }
    }
    score += (0.1 * this.smoothingFactor(brain));
    /**
     * This is a heuristic to directly relate scores and free cells,
     * more free cells, more score.
     */
    score = this.freeCellPenalty(brain.grid, score);
    // // console.log(score);
    return score;
};

/**
 * This smoothness function I borrowed from the github account and repo linked below.
 * 
 * The previous smoothness function was not well predetermined, so the dummy values 
 * kept falling short of the 4096 tile. After implementing this smoothness function,
 * I was able to achieve a considerable improvement.
 * 
 * The function determines the paired difference between the tiles. A smoother grid
 * would have tiles with values that are the same, or immediate upper or lower values
 * as adjacent tiles. For instance, 2 4 8 are smoother compared to 2 256 2048 since
 * the difference between the pairs are comparatively lower.
 * 
 * https://github.com/rewajkale/2048-JS-Solver/blob/master/js/expectimax_ai.js
 */
Agent.prototype.smoothingFactor = function(brain){
    var cells = brain.grid.cells;
    var smoothingScore = 0;
    for(var x = 0; x < 4; x++){
        for(var y = 0; y < 4; y++){
            var value = 0;
            if(cells[x][y] != null){
                value = cells[x][y].value;
            }
            for(var dir = 1; dir <= 2; dir ++){
                var vector = brain.getVector(dir);
                var nextCell = brain.findFarthestPosition({x: x, y: y}, vector).next;
                if(brain.grid.cellOccupied(nextCell)){
                    var nextCell = brain.grid.cellContent(nextCell);
                    var scaledValue = Math.log(nextCell.value) / Math.log(2);
                    smoothingScore -= Math.abs(value - scaledValue);
                }
            }
        }
    }
    return smoothingScore;
}

Agent.prototype.freeCellPenalty = function(grid, score){
    var basePortion = 1;
    var penalty = 0;
    if(grid.availableCells().length < 8){
        penalty = score * (1-grid.availableCells().length / 16);
    }
    var reward = score + score * basePortion * grid.availableCells().length / 16;
    return reward - penalty; 
}

Agent.prototype.expectimax = function (brain, chance, depthLimit){
    // Terminating condition
    if(depthLimit == 0) { //  || brain.over){
        return this.evaluateGrid(brain);
    }
    depthLimit--;
    if(chance){
        var openTiles = brain.grid.availableCells();
        const probabTiles = 1 / openTiles.length;
        var summation = 0;
        for(var i = 0; i < openTiles.length; i++){
            var p2 = new Tile(openTiles[i], 2);
            var b2 = new AgentBrain(brain);
            b2.grid.insertTile(p2);
            var p4 = new Tile(openTiles[i], 4);
            var b4 = new AgentBrain(brain);
            b4.grid.insertTile(p4);
            summation += 0.9 * this.expectimax(b2, !chance, depthLimit);
            summation += 0.1 * this.expectimax(b4, !chance, depthLimit); 
        }
        return summation * probabTiles;
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
