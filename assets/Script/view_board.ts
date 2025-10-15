const {ccclass, property} = cc._decorator;

// Fix import: controller exports a named class, not default
import { GameController } from './controller';
import { Tile } from './models';
import { Booster, BoosterChooseGroup, BoosterSwapTile, BoosterBomb } from './boosters';

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

    @property(cc.Node)
    button_booster_swap: cc.Node = null;
    @property(cc.Node)
    button_booster_bomb: cc.Node = null;

    @property(cc.Label)
    boosters_count_swap: cc.Label = null;
    @property(cc.Label)
    boosters_count_bomb: cc.Label = null;

    @property
    moves: number = 20;
    @property
    goal_scores: number = 500;

    private controller: GameController = null;
    private tileNodes: Map<number, cc.Node> = new Map();
    private lock_touches: boolean = false;
    private booster: Booster = null;

    @property(cc.Font)
    popupFont: cc.Font = null;

    onLoad () {
        this.button_booster_swap.on('click', this.chooseBoosterSwap, this);
        this.button_booster_bomb.on('click', this.chooseBoosterBomb, this);
    }
    start () {
        console.log('start:');
        this.controller = new GameController(this.rows, this.cols);
        this.controller.setGoalScore(this.goal_scores);
        this.controller.setMoves(this.moves);
        this.createTiles();
        this.showScore();
        this.showMoves();
        this.resetBooster();

        this.window_lose.active = false;
        this.window_win.active = false;

        this.showBoostersLeft();
    }
    private createTiles(){
        const root = this.root || this.node;
        root.removeAllChildren();

        const rows = this.controller.getRows();
        const cols = this.controller.getCols();
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tile = this.controller.getTile(r, c);
                if (!tile)
                    continue;
                const node = this.buildTileNode(tile);
                root.addChild(node, node.getPosition().y);
            }
        }
    }

    private onTileClick(r: number, c: number) {
        const [toRemove, moved] = this.booster.action(this.controller, r, c);
        if(toRemove == null && moved == null){
            console.log('Exit from click');
            return;
        }


        if (moved.length > 0) {
            console.log('Swap');
            this.syncTilesToBoard(moved);
        } else {
            if (toRemove.length <= 1){
                console.log('remove len <= 1. result');
                return;
            }
            console.log('remove tiles');
            this.highlightTiles(toRemove);
            this.scheduleOnce(() => this.removeTiles(toRemove), 0.15);
            this.showScorePopupAt(this.controller.getScoreOfGroup(toRemove), r, c);
        }
        console.log('do move');

        this.controller.doMove();
        this.showMoves();
        this.resetBooster();

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
            this.checkGameFinished();
        }, 0.24);
    }

    private spawnNewTiles(created: Tile[]) {
        if (!created || created.length === 0)
            return;

        created.forEach((tile) => {
            const node = this.buildTileNode(tile);
            this.root.addChild(node, node.getPosition().y);
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
        const rows = this.controller.getRows();
        const cols = this.controller.getCols();
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const t = this.controller.getTile(r, c);
                if (t && t.id === id)
                    return [r, c];
            }
        }
        return null;
    }

    private syncTilesToBoard(moved: Tile[]) {
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
            node.zIndex = target.y;
        });
        this.root.sortAllChildren();
    }

    private getTilePosition(row: number, col: number): cc.Vec2 {
        const rows = this.controller.getRows();
        const cols = this.controller.getCols();
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
            this.score_text_node.string = `${this.controller.getScore()}/${this.controller.getGoalScore()}`
    }

    private showMoves(){
        if(this.moves_text_node)
            this.moves_text_node.string = `${this.controller.getMoves()}`
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
            const tiles = this.controller.doShuffle();
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

    private showBoostersLeft(){
        this.boosters_count_swap.string = String(this.controller.model.booster_count_swap);
        this.boosters_count_bomb.string = String(this.controller.model.booster_count_bomb);
    }

    private chooseBoosterSwap(){
        if(this.booster instanceof BoosterSwapTile){
            return;
        }
        if(this.controller.model.booster_count_swap > 0){
            this.booster = new BoosterSwapTile();
            this.controller.model.booster_count_swap -= 1;
            this.showBoostersLeft();
            //TODO: show selected booster in UI
        }
    }

    private chooseBoosterBomb(){
        if(this.booster instanceof BoosterBomb){
            return;
        }
        if(this.controller.model.booster_count_bomb > 0){
            this.booster = new BoosterBomb(1);
            this.controller.model.booster_count_bomb -= 1;
            this.showBoostersLeft();
            //TODO: show selected booster in UI
        }
    }

    private resetBooster(){
        if(this.booster instanceof BoosterChooseGroup){
            return;
        }
        this.booster = new BoosterChooseGroup();
    }

}