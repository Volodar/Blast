const {ccclass, property} = cc._decorator;

// Fix import: controller exports a named class, not default
import { GameController } from './controller';
import { Tile } from './models';

@ccclass
export default class ViewBoard extends cc.Component {

    @property(cc.Node)
    root: cc.Node = null;

    @property(cc.SpriteAtlas)
    atlas: cc.SpriteAtlas = null!;

    @property(cc.Label)
    score_text_node: cc.Label = null;
    @property(cc.Label)
    moves_text_node: cc.Label = null;

    @property
    tileSize: number = 100;
    @property
    rows: number = 9;
    @property
    cols: number = 9;

    @property(cc.Node)
    window_lose: cc.Node = null;
    @property(cc.Node)
    window_win: cc.Node = null;

    @property
    moves: number = 20;
    @property
    goal_scores: number = 500;

    private controller: GameController = null;
    private tileNodes: Map<number, cc.Node> = new Map();
    private lock_touches: boolean = false;
    @property(cc.Font)
    popupFont: cc.Font = null;

    onLoad () {
    }
    start () {
        console.log('start:');
        this.controller = new GameController(this.rows, this.cols);
        this.controller.setGoalScore(this.goal_scores);
        this.controller.setMoves(this.moves);
        this.createTiles();
        this.showScore();
        this.showMoves();

        this.window_lose.active = false;
        this.window_win.active = false;
    }
    private createTiles(){
        const root = this.root || this.node;
        root.removeAllChildren();

        const controller = this.controller;
        if (!controller || !controller.model.board) {
            console.log('ViewBoard: controller or board is not ready');
            return;
        }

        const rows = this.controller.model.board.rows;
        const cols = this.controller.model.board.cols;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tile = controller.model.board.grid[r][c];
                if (!tile)
                    continue;
                const node = this.buildTileNode(tile);
                root.addChild(node, node.getPosition().y);
            }
        }
    }

    private onTileClick(r: number, c: number) {
        const group = this.controller.findMatch(this.controller.model.board, r, c);
        if (!group || group.length <= 1) 
            return;
        this.highlightTiles(group);
        // Show score popup at clicked tile position
        const points = (group.length * (group.length + 1)) / 2;
        this.scheduleOnce(() => this.removeTiles(group), 0.15);

        const add_score = this.controller.getScoreOfGroup(group);
        this.showScorePopupAt(add_score, r, c);

    }

    private highlightTiles(group: Tile[]) {
        group.forEach((tile) => {
            const tileNode = this.tileNodes.get(tile.id);
            if (!tileNode)
                return;
            cc.tween(tileNode)
                .to(0.1, { scale: 0.9 })
                .to(0.08, { scale: 1.0 })
                .start();
        });
    }

    private removeTiles(group: Tile[]) {
        const removedIds = this.controller.removeGroup(group);
        removedIds.forEach((id) => {
            const node = this.tileNodes.get(id);
            if (!node) return;
            this.tileNodes.delete(id);
            try {
                cc.tween(node)
                    .to(0.1, { opacity: 0, scale: 0.85 })
                    .call(() => node.removeFromParent())
                    .start();
            } catch (e) {
                node.removeFromParent();
            }
        });

        this.lock_touches = true;
        this.scheduleOnce(() => {
            const moved = this.controller.dropTiles();
            this.syncTilesToBoard(moved);
        }, 0.12);
        this.scheduleOnce(() => {
            const created = this.controller.createNewTiles();
            this.spawnNewTiles(created);
            this.lock_touches = false;
            this.showScore();
            this.showMoves();
            this.checkGameFinished();
        }, 0.24);
    }

    private spawnNewTiles(created: Tile[]) {
        if (!created || created.length === 0) return;
        const root = this.root || this.node;

        created.forEach((tile) => {
            const node = this.buildTileNode(tile);
            root.addChild(node, node.getPosition().y);
            node.opacity = 0;
            cc.tween(node).to(0.12, { opacity: 255 }).start();
        });
    }

    private buildTileNode(tile: Tile): cc.Node {
        const node = new cc.Node(`tile_${tile.row}_${tile.col}`);
        const sprite = node.addComponent(cc.Sprite);
        const frameName = String(tile.color);
        const frame = this.atlas.getSpriteFrame(frameName);
        if (!frame)
            console.log('SpriteFrame not found in atlas:', frameName);
        else
            sprite.spriteFrame = frame;

        const size = this.tileSize;
        node.setContentSize(size, size);

        const pos = this.getTilePosition(tile.row, tile.col);
        node.setPosition(pos);

        this.tileNodes.set(tile.id, node);
        node.on(cc.Node.EventType.TOUCH_END, () => this.onTileClickById(tile.id), this);
        return node;
    }

    private onTileClickById(id: number) {
        if(this.lock_touches)
            return;
        const pos = this.findTilePositionById(id);
        if (!pos)
            return;
        const [r, c] = pos;
        this.onTileClick(r, c);
    }

    private findTilePositionById(id: number): [number, number] | null {
        const board = this.controller.model.board;
        const rows = this.controller.model.board.rows;
        const cols = this.controller.model.board.cols;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const t = board.grid[r][c];
                if (t && t.id === id)
                    return [r, c];
            }
        }
        return null;
    }

    private syncTilesToBoard(moved: Tile[]) {
        const controller = this.controller;
        moved.forEach(tile => {
            const node = this.tileNodes.get(tile.id);
            if (!node)
                return;
            const target = this.getTilePosition(tile.row, tile.col);
            if (Math.abs(node.x - target.x) > 0.5 || Math.abs(node.y - target.y) > 0.5) {
                cc.tween(node).to(0.12, { position: target }).start();
            } else {
                node.setPosition(target);
            }
        });
    }

    private getTilePosition(row: number, col: number): cc.Vec2 {
        const rows = this.controller.model.board.rows;
        const cols = this.controller.model.board.cols;
        const size = this.tileSize;
        const totalW = cols * size;
        const totalH = rows * size;
        const originX = -totalW / 2 + size / 2;
        const originY = -totalH / 2 + size / 2;
        const x = originX + col * size;
        const y = originY + (rows - 1 - row) * size;
        return cc.v2(x, y);
    }

    private showScore(){
        if(this.score_text_node)
            this.score_text_node.string = `${this.controller.model.score}/${this.controller.model.goal_score}`
    }

    private showMoves(){
        if(this.moves_text_node)
            this.moves_text_node.string = `${this.controller.model.moves}`
    }


    private showScorePopupAt(score: number, row: number, col: number) {
        const root = this.root || this.node;
        const pos = this.getTilePosition(row, col);
        const node = new cc.Node('score_popup');

        const label = node.addComponent(cc.Label);
        label.string = `+${score}`;
        label.fontSize = 50;
        label.lineHeight = 100;
        label.font = this.popupFont;

        node.setPosition(pos);
        node.opacity = 0;
        root.addChild(node, 99999);

        cc.tween(node)
            .to(0.05, { opacity: 255 })
            .by(0.35, { position: cc.v2(0, this.tileSize) }, { easing: 'sineInOut' })
            .to(0.2, { opacity: 0 })
            .call(() => node.removeFromParent())
            .start();
    }

    private checkGameFinished(){
        var window: cc.Node = null;
        if(this.controller.isGameOver()){
            window = this.window_lose;
        }
        if(this.controller.isWin()){
            window = this.window_win;
        }
        if(!window && !this.controller.hasAnyGroup()){
            const tiles = this.controller.shuffle();
            this.controller.model.shuffle_count -= 1;
            this.syncTilesToBoard(tiles);
        }

        if(window){
            window.active = true;
            const btn = cc.find('button_restart', window) || window.getChildByName('button_restart');
            if (btn) {
                btn.off('click', this.onRestart, this);
                btn.on('click', this.onRestart, this);
            }
        }
    }

    private onRestart() {
        const scene = cc.director.getScene();
        if (scene) {
            cc.director.loadScene(scene.name);
        }
    }

    // update (dt) {}
}
