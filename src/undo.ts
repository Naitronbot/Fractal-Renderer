export class UndoRedoQueue<T> {
    private queue: T[];
    private index: number;
    private maxSize: number;
    private amtBehind: number;
    private amtFront: number;
    
    constructor(size: number) {
        this.queue = [];
        this.maxSize = size;
        this.amtBehind = -1;
        this.amtFront = 0;
        this.index = size-1;
    }

    add(item: T) {
        this.index = (this.index+1)%this.maxSize;
        this.queue[this.index] = item;

        if (this.amtBehind < this.maxSize - 1) {
            this.amtBehind++;
        }
        this.amtFront = 0;
    }

    undo() {
        if (this.amtBehind === 0) {
            return null;
        }

        this.index--;
        if (this.index < 0) {
            this.index = this.maxSize + this.index;
        }
        this.amtBehind--;
        this.amtFront++;

        return clone(this.queue[this.index]);
    }

    redo() {
        if (this.amtFront === 0) {
            return null;
        }

        this.index = (this.index+1)%this.maxSize;

        const current = clone(this.queue[this.index]);

        this.amtBehind++;
        this.amtFront--;

        return current;
    }
}

function clone(obj: any) {
    if (structuredClone) {
        return structuredClone(obj);
    } else {
        return JSON.parse(JSON.stringify(obj));
    }
}