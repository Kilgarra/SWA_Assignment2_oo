export type Generator<T> = { next: () => T }

export type Position = {
    row: number,
    col: number
}

export type Match<T> = {
    matched: T,
    positions: Position[]
}

export type BoardEvent<T> = {
    kind: string,
    match?: Match<T>
};

export type BoardListener<T> = (e: BoardEvent<T>) => any;

export class Board<T> {
    width: number;
    height: number;
    content: T[][];
    generator: Generator<T>
    listener: BoardListener<T>;

    constructor(generator: Generator<T>, width: number, height: number) {
        this.width = width;
        this.height = height;
        this.generator = generator;
        this.content = []
        for (let i = 0; i <= height - 1; i++) {
            this.content[i] = [];
            for (let j = 0; j <= width - 1; j++) {
                this.content[i][j] = generator.next()
            }
        }
    }

    addListener(listener: BoardListener<T>) {
        this.listener = listener;
    }

    piece(p: Position): T | undefined {
        return this.content[p.row] ? this.content[p.row][p.col] : undefined;
    }

    canMove(first: Position, second: Position): boolean {
        if (this.piece(second) && this.piece(first)) {
            if (first.col === second.col || first.row === second.row) {
                const newBoard: Board<T> = JSON.parse(JSON.stringify(this)) as Board<T>;
                newBoard.content[first.row][first.col] = this.piece(second);
                newBoard.content[second.row][second.col] = this.piece(first);
                if (this.getMatches(newBoard).length > 0) return true;
            }
        }
        return false;
    }

    move(first: Position, second: Position) {
        if (this.canMove(first, second)) {
            const z = this.piece(first);
            this.content[first.row][first.col] = this.piece(second);
            this.content[second.row][second.col] = z;
            this.handleMatches();
        }
    }

    private getMatches(board: Board<T>): Match<T>[] {
        const matches: Match<T>[] = [], match: Match<T> = {matched: undefined, positions: []};
        for (let i = 0; i < board.height; i++) {
            for (let j = 0; j < board.width - 1; j++) {
                if (board.content[i][j] === board.content[i][j + 1]) {
                    if (match.positions.length > 0 ? (!(JSON.stringify(match.positions[match.positions.length - 1]) === JSON.stringify({
                        row: i,
                        col: j
                    }))) : true) match.positions.push({row: i, col: j})
                    match.matched = board.content[i][j + 1];
                    match.positions.push({row: i, col: j + 1})
                } else match.positions.length < 3 ? match.positions = [] : (matches.push({...match}), match.positions = [])
            }
            match.positions.length < 3 ? match.positions = [] : (matches.push({...match}), match.positions = [])
        }
        for (let j = board.width - 1; j >= 0; j--) {
            for (let i = 0; i < board.height - 1; i++) {
                if (board.content[i][j] === board.content[i + 1][j]) {
                    if (match.positions.length > 0 ? (!(JSON.stringify(match.positions[match.positions.length - 1]) === JSON.stringify({
                        row: i,
                        col: j
                    }))) : true) match.positions.push({row: i, col: j})
                    match.matched = board.content[i + 1][j];
                    match.positions.push({row: i + 1, col: j})
                } else match.positions.length < 3 ? match.positions = [] : (matches.push({...match}), match.positions = [])
            }
            match.positions.length < 3 ? match.positions = [] : (matches.push({...match}), match.positions = [])
        }
        return matches;
    }

    private handleMatches<T>() {
        const matches = this.getMatches(this);
        matches.forEach(match => {
            if (this.listener) this.listener({kind: 'Match', match: match})
            match.positions.forEach(position => {
                this.content[position.row][position.col] = null;
            });

        });
        for (let i = this.height - 1; i >= 0; i--) {
            for (let j = 0; j < this.width; j++) {
                if (!this.content[i][j]) {
                    for (let k = i; k > 0; k--) {
                        this.content[i][j] = this.content[k - 1][j];
                        this.content[k - 1][j] = null;
                        if (this.content[i][j]) break;
                    }
                }
            }
        }
        for (let i = this.height - 1; i >= 0; i--) {
            for (let j = 0; j < this.width; j++) {
                if (!this.content[i][j]) this.content[i][j] = this.generator.next()
            }
        }
        if (this.listener) this.listener({kind: 'Refill'})
        if (this.getMatches(this).length !== 0) return this.handleMatches()
    }
}
