import { Board } from './models';
import { Model } from './models';
import { Tile } from './models';


export class GameController{

    private model: Model = null;

    constructor(rows: number, cols: number){
        this.createBoard(rows, cols);
    }

    getScore(): number{
        return this.model.score;
    }
    getGoalScore(): number{
        return this.model.goal_score;
    }
    setGoalScore(score: number){
        this.model.goal_score = score;
    }

    setMoves(moves: number){
        this.model.moves = moves;
    }
    getMoves(): number{
        return this.model.moves;
    }

    createBoard(rows: number, cols: number){
        this.model = new Model();
        this.model.board = new Board(rows, cols);

        if(!this.hasAnyGroup()){
            shuffle();
        }
    }

    public get board(): Board {
        return this.model.board;
    }

    public doMove(){
        this.model.moves -=1;
    }

    getTile(r: number, c: number): Tile | null {
        if (!this.model || !this.model.board) return null;
        if (!this.model.board.inBounds(r, c)) return null;
        return this.model.board.grid[r][c];
    }

    setTile(r: number, c: number, tile: Tile | null): void {
        if (!this.model || !this.model.board) return;
        if (!this.model.board.inBounds(r, c)) return;
        this.model.board.grid[r][c] = tile;
        if (tile) {
            tile.row = r;
            tile.col = c;
        }
    }

    getRows(): number {
        return this.model.board.rows;
    }
    getCols(): number {
        return this.model.board.cols;
    }

    removeGroup(group: Tile[]): number[] {
        this.model.score += this.getScoreOfGroup(group);

        const removed: number[] = [];
        group.forEach((tile) => {
            removed.push(tile.id);
            this.model.board.grid[tile.row][tile.col] = null;
        });
        return removed;
    }

    dropTiles(): Tile[] {
        const moved: Tile[] = [];
        const rows = this.model.board.rows;
        const cols = this.model.board.cols;
        for (let c = 0; c < cols; c++){
            let write = rows - 1;
            for (let r = rows - 1; r >= 0; r--){
                const t = this.model.board.grid[r][c];
                if (t !== null){
                    if (write !== r){
                        this.model.board.grid[write][c] = t;
                        t.row = write;
                        t.col = c;
                        this.model.board.grid[r][c] = null;
                        moved.push(t);
                    }
                    write--;
                }
            }
        }
        return moved;
    }

    findMatch(r: number, c: number): Tile[] {
        const start = this.model.board.grid[r][c];
        if (!start) 
            return [];
        const color = start.color;
        const visited = new Set<number>();
        const stack: [number, number][] = [[r, c]];
        const group: Tile[] = [];

        while (stack.length) {
            const [row, col] = stack.pop()!;
            
            const index = row * this.model.board.grid.length + col
            if (visited.has(index))
                continue;
            visited.add(index);
            
            group.push(this.model.board.grid[row][col]);

            const neighbors: [number, number][] = [[1,0],[-1,0],[0,1],[0,-1]];
            neighbors.forEach(([dr, dc]) => {
                const nr = row + dr, nc = col + dc;
                if (this.model.board.inBounds(nr, nc) && this.model.board.grid[nr][nc] && this.model.board.grid[nr][nc]!.color === color) {
                    stack.push([nr, nc]);
                }
            });
        }
        return group;
    }

    createNewTiles(): Tile[] {
        const created: Tile[] = [];
        for (let c = 0; c < this.model.board.cols; c++) {
            for (let r = 0; r < this.model.board.rows; r++) {
                if (this.model.board.grid[r][c] === null) {
                    const tile = this.model.board.newTile(r, c);
                    this.model.board.grid[r][c] = tile;
                    created.push(tile);
                }
            }
        }
        return created;
    }

    hasAnyGroup(): boolean {
        for (let r = 0; r < this.model.board.rows; r++) {
            for (let c = 0; c < this.model.board.cols; c++) {
                const t = this.model.board.grid[r][c];

                if (c + 1 < this.model.board.cols) {
                    if (this.model.board.grid[r][c + 1].color === t.color)
                        return true;
                }
                if (r + 1 < this.model.board.rows) {
                    if (this.model.board.grid[r + 1][c].color === t.color)
                        return true;
                }
            }
        }
        return false;
    }

    doShuffle(): Tile[] {
        this.model.shuffle_count -= 1;
        return this.shuffle();
    }
    
    private shuffle(): Tile[] {
        for (let r = 0; r < this.model.board.rows; r++) {
            for (let c = 0; c < this.model.board.cols; c++) {
                const tile = this.model.board.grid[r][c];

                const row = Math.floor(Math.random() * this.model.board.rows);
                const col = Math.floor(Math.random() * this.model.board.cols);

                const tmp = this.model.board.grid[row][col];
                this.model.board.grid[row][col] = tile;
                this.model.board.grid[r][c] = tmp;

                this.model.board.grid[row][col].row = row;
                this.model.board.grid[row][col].col = col;
                this.model.board.grid[r][c].row = r;
                this.model.board.grid[r][c].col = c;
            }
        }

        if (!this.hasAnyGroup()) {
            return this.shuffle();
        }

        const tiles: Tile[] = [];
        for (let r = 0; r < this.model.board.rows; r++) {
            for (let c = 0; c < this.model.board.cols; c++) {
                tiles.push(this.model.board.grid[r][c]);
            }
        }
        return tiles;
    }

    getScoreOfGroup(group: Tile[]){
        const n = group.length;
        const score = n * (n + 1) / 2;
        return score;
    }

    isGameOver(){
        if(this.model.moves <= 0 && this.model.score < this.model.goal_score){
            return true;
        }
        if(!this.hasAnyGroup() && this.model.shuffle_count == 0){
            return true;
        }
        return false;
    }
    isWin(){
        return this.model.moves > 0 && this.model.score >= this.model.goal_score;
    }

}
