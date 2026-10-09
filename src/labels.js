// Callout labels with leader lines, laid out in two columns either side of the model.

const SVG = 'http://www.w3.org/2000/svg';
const GAP = 38;

export class Labels {
  constructor(container, svg) {
    this.container = container;
    this.svg = svg;
    this.items = [];
  }

  setParts(parts) {
    this.container.replaceChildren();
    this.svg.replaceChildren();
    this.items = parts.map((p) => {
      const el = document.createElement('div');
      el.className = 'label';
      el.innerHTML = '<b></b><span></span>';
      el.firstChild.textContent = p.name;
      el.lastChild.textContent = p.desc;
      this.container.append(el);
      const g = document.createElementNS(SVG, 'g');
      const line = document.createElementNS(SVG, 'line');
      const dot = document.createElementNS(SVG, 'circle');
      dot.setAttribute('r', '2.5');
      g.append(line, dot);
      this.svg.append(g);
      return { part: p, el, g, line, dot, w: 0, h: 0 };
    });
    this.frames = 0;
  }

  // Text never changes, so measuring occasionally (fonts may load late) is enough.
  #measure() {
    for (const it of this.items) {
      it.w = it.el.offsetWidth;
      it.h = it.el.offsetHeight;
    }
  }

  /**
   * @param {Array<[number,number]|null>} anchors screen position per part (null = behind camera)
   * @param {[number,number,number]} span model centre x and its left/right screen extent
   * @param {object} o { opacity, hot, width, height, leftLimit }
   */
  layout(anchors, [cx, minX, maxX], { opacity, hot, width, height, leftLimit = 0 }) {
    const vis = opacity > 0.01;
    this.container.style.opacity = vis ? 1 : 0;
    this.svg.style.opacity = vis ? 1 : 0;
    if (!vis) return;
    if (this.frames++ % 30 === 0) this.#measure();

    const left = [];
    const right = [];
    this.items.forEach((it, i) => {
      const a = anchors[i];
      it.anchor = a;
      if (!a) return;
      (a[0] < cx ? left : right).push(it);
    });

    const place = (list, side) => {
      if (!list.length) return;
      list.sort((a, b) => a.anchor[1] - b.anchor[1]);
      const edge = side === 'left' ? minX - 28 : maxX + 28;
      let y = -Infinity;
      for (const it of list) {
        it.y = Math.max(it.anchor[1] - it.h / 2, y + Math.max(GAP, it.h + 4));
        y = it.y;
      }
      // Pull the column back on screen if it overflows the bottom.
      const overflow = y + 40 - (height - 120);
      if (overflow > 0) for (const it of list) it.y -= overflow;
      // Re-stack after clamping to the top so nothing overlaps.
      let prev = -Infinity;
      for (const it of list) {
        it.y = Math.max(side === 'left' ? 70 : 150, it.y, prev + Math.max(GAP, it.h + 4));
        prev = it.y;
        if (side === 'left') it.x = Math.max(leftLimit + 8, edge - it.w);
        else it.x = Math.min(width - it.w - 10, edge);
        it.side = side;
      }
    };
    // Not enough room left of the model: stack everything on the right.
    const widest = Math.max(0, ...left.map((it) => it.w));
    if (left.length && minX - 28 - widest < leftLimit + 8 && maxX + 28 + widest < width) {
      right.push(...left.splice(0));
    }
    place(left, 'left');
    place(right, 'right');

    this.items.forEach((it, i) => {
      const a = it.anchor;
      const isHot = hot === i;
      const o = a ? (isHot ? 1 : opacity) : 0;
      it.el.style.opacity = o;
      it.g.style.opacity = o;
      if (!a) return;
      it.el.className = `label ${it.side}${isHot ? ' hot' : ''}`;
      it.el.style.transform = `translate(${it.x.toFixed(1)}px, ${it.y.toFixed(1)}px)`;
      const lx = it.side === 'left' ? it.x + it.w + 4 : it.x - 4;
      const ly = it.y + 8;
      it.line.setAttribute('x1', lx);
      it.line.setAttribute('y1', ly);
      it.line.setAttribute('x2', a[0]);
      it.line.setAttribute('y2', a[1]);
      it.line.classList.toggle('hot', isHot);
      it.dot.setAttribute('cx', a[0]);
      it.dot.setAttribute('cy', a[1]);
    });
  }

  // Index of the label under a screen point (mouse hover on text).
  hit(x, y) {
    return this.items.findIndex((it) => it.anchor && x >= it.x && x <= it.x + it.w && y >= it.y && y <= it.y + it.h);
  }
}
