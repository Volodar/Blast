export enum Color {
    red = 'block_red', 
    green = 'block_green', 
    blue = 'block_blue', 
    yellow = 'block_yellow',
    purple = 'block_purpure'
}

export interface Tile {
    id: number;
    color: Color;
    row: number;
    col: number;
}

export type Grid = (Tile | null)[][];


const randomEnumValue = (enumeration) => {
    const values = Object.keys(enumeration);
    const enumKey = values[Math.floor(Math.random() * values.length)];
    return enumeration[enumKey];
}

export class Board {
    public rows: number = 0;
    public cols: number = 0;
    grid: Grid;

    constructor(rows: number, cols: number) {
        this.rows = rows;
        this.cols = cols;

        this.grid = Array.from({ length: rows }, () => Array.from<Tile | null>({ length: cols } as any, () => null));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this.grid[r][c] = this.newTile(r, c);
            }
        }
    }

    newTile(r: number, c: number): Tile {
        return { 
            id: ++this._id, 
            color: this.getRandomColor(),
            row: r,
            col: c,
        };
    }
    private _id = 0;

    inBounds(r: number, c: number) {
        return r >= 0 && c >= 0 && r < this.rows && c < this.cols;
    }

    getRandomColor(): Color {
        return randomEnumValue(Color);
    }
}

export class Model {
    public moves: number = 0;
    public score: number = 0;
    public goal_score: number = 0;
    public shuffle_count: number = 3;
    public board: Board = null;
}
