declare global {
    interface Window {
        [key: string]: any;
    }
};

export class Point {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    toArray() {
        return [this.x,this.y];
    }

    static fromArray(array: number[]) {
        return new Point(array[0], array[1]);
    }
    
    static duplicate(p: Point): Point {
        return new Point(p.x, p.y);
    }
}