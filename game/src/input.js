// Keyboard and mouse input
export class Input {
  constructor(canvas) {
    this.keys = {};
    this.mouse = { x: 0, y: 0, down: false, clicked: false };
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener('mousedown', () => { this.mouse.down = true; this.mouse.clicked = true; });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
    this._pressed = {};
  }
  down(code) { return !!this.keys[code]; }
  pressed(code) {
    const now = !!this.keys[code];
    const was = !!this._pressed[code];
    this._pressed[code] = now;
    return now && !was;
  }
  axisX() { return (this.down('KeyD') || this.down('ArrowRight') ? 1 : 0) - (this.down('KeyA') || this.down('ArrowLeft') ? 1 : 0); }
  axisY() { return (this.down('KeyS') || this.down('ArrowDown') ? 1 : 0) - (this.down('KeyW') || this.down('ArrowUp') ? 1 : 0); }
  endFrame() { this.mouse.clicked = false; }
}
