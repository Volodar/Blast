import { GameController } from './controller';
import { Tile } from './models';

export interface Booster {
    // Returns [toRemove, moved]
    action(controller: GameController, row: number, col: number): [Tile[], Tile[]];
}

export class BoosterChooseGroup implements Booster {
    action(controller: GameController, row: number, col: number): [Tile[], Tile[]] {
        return [controller.findMatch(row, col), []];
    }
}

export class BoosterSwapTile implements Booster {
    private row_0: number = -1;
    private col_0: number = -1;
    private row_1: number = -1;
    private col_1: number = -1;

    action(controller: GameController, row: number, col: number): [Tile[], Tile[]] {
        if (this.row_0 === -1 && this.col_0 === -1) {
            this.row_0 = row;
            this.col_0 = col;
            return [null, null];
        } else {
            this.row_1 = row;
            this.col_1 = col;

            const tile_0 = controller.model.board.grid[this.row_0][this.col_0];
            const tile_1 = controller.model.board.grid[this.row_1][this.col_1];

            controller.model.board.grid[this.row_0][this.col_0] = tile_1;
            controller.model.board.grid[this.row_1][this.col_1] = tile_0;

            tile_1.row = this.row_0;
            tile_1.col = this.col_0;
            tile_0.row = this.row_1;
            tile_0.col = this.col_1;

            this.row_0 = -1;
            this.col_0 = -1;
            this.row_1 = -1;
            this.col_1 = -1;

            return [[], [tile_0, tile_1]];
        }
    }
}


export class BoosterBomb implements Booster {
    private readonly radius: number;

    constructor(radius: number) {
        this.radius = radius;
    }

    action(controller: GameController, row: number, col: number): [Tile[], Tile[]] {
        const board = controller.model.board;
        const rows = board.rows;
        const cols = board.cols;

        const r0 = Math.max(0, row - this.radius);
        const r1 = Math.min(rows - 1, row + this.radius);
        const c0 = Math.max(0, col - this.radius);
        const c1 = Math.min(cols - 1, col + this.radius);

        const toRemove: Tile[] = [];
        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                const t = board.grid[r][c];
                if (t) {
                    toRemove.push(t);
                }
            }
        }

        if (toRemove.length === 0) {
            console.log('BoosterBomb toRemove.length is zero');
            return [null, null];
        }

        return [toRemove, []];
    }
}
