export class Input {
    public keys: { [key: string]: boolean } = {};
    public mouse: { x: number; y: number; left: boolean; right: boolean } = { x: 0, y: 0, left: false, right: false };

    constructor() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.mouse.left = true;
            if (e.button === 2) this.mouse.right = true;
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.left = false;
            if (e.button === 2) this.mouse.right = false;
        });

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
    }

    public isPressed(code: string): boolean {
        return !!this.keys[code];
    }

    public isMoveForward(): boolean  { return this.isPressed('KeyW') || this.isPressed('ArrowUp'); }
    public isMoveBackward(): boolean { return this.isPressed('KeyS') || this.isPressed('ArrowDown'); }
    public isMoveLeft(): boolean     { return this.isPressed('KeyA') || this.isPressed('ArrowLeft'); }
    public isMoveRight(): boolean    { return this.isPressed('KeyD') || this.isPressed('ArrowRight'); }
}
