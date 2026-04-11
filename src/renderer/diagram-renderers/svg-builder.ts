// SVG string builder utilities for server-side rendering

function attrs(obj: Record<string, string | number | undefined>): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${escapeAttr(String(v))}"`)
    .join(' ');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function rect(x: number, y: number, w: number, h: number, extra: Record<string, string | number | undefined> = {}): string {
  return `<rect ${attrs({ x, y, width: w, height: h, ...extra })}/>`;
}

export function roundedRect(x: number, y: number, w: number, h: number, rx: number, extra: Record<string, string | number | undefined> = {}): string {
  return `<rect ${attrs({ x, y, width: w, height: h, rx, ry: rx, ...extra })}/>`;
}

export function circle(cx: number, cy: number, r: number, extra: Record<string, string | number | undefined> = {}): string {
  return `<circle ${attrs({ cx, cy, r, ...extra })}/>`;
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, extra: Record<string, string | number | undefined> = {}): string {
  return `<ellipse ${attrs({ cx, cy, rx, ry, ...extra })}/>`;
}

export function text(x: number, y: number, content: string, extra: Record<string, string | number | undefined> = {}): string {
  return `<text ${attrs({ x, y, ...extra })}>${escapeHtml(content)}</text>`;
}

export function line(x1: number, y1: number, x2: number, y2: number, extra: Record<string, string | number | undefined> = {}): string {
  return `<line ${attrs({ x1, y1, x2, y2, ...extra })}/>`;
}

export function polyline(points: Array<[number, number]>, extra: Record<string, string | number | undefined> = {}): string {
  const pts = points.map(([x, y]) => `${x},${y}`).join(' ');
  return `<polyline ${attrs({ points: pts, ...extra })}/>`;
}

export function path(d: string, extra: Record<string, string | number | undefined> = {}): string {
  return `<path ${attrs({ d, ...extra })}/>`;
}

export function group(children: string[], transform?: string, extra: Record<string, string | number | undefined> = {}): string {
  const a = attrs({ transform, ...extra });
  return `<g ${a}>${children.join('')}</g>`;
}

export function foreignObject(x: number, y: number, w: number, h: number, htmlContent: string): string {
  return `<foreignObject x="${x}" y="${y}" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;overflow:hidden">${htmlContent}</div></foreignObject>`;
}

export function defs(content: string): string {
  return `<defs>${content}</defs>`;
}

export function marker(id: string, refX: number, refY: number, w: number, h: number, content: string): string {
  return `<marker id="${id}" viewBox="0 0 ${w} ${h}" refX="${refX}" refY="${refY}" markerWidth="${w}" markerHeight="${h}" orient="auto-start-reverse">${content}</marker>`;
}

// Curved connection path between two points
export function curvedPath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

// Cylinder shape (for databases)
export function cylinder(x: number, y: number, w: number, h: number, fill: string, stroke: string): string {
  const ellH = 10;
  return [
    `<path d="M ${x} ${y + ellH} L ${x} ${y + h - ellH} Q ${x} ${y + h + ellH}, ${x + w / 2} ${y + h + ellH} Q ${x + w} ${y + h + ellH}, ${x + w} ${y + h - ellH} L ${x + w} ${y + ellH}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
    `<ellipse cx="${x + w / 2}" cy="${y + ellH}" rx="${w / 2}" ry="${ellH}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
  ].join('');
}

// Diamond shape (for decisions/cache)
export function diamond(cx: number, cy: number, size: number, fill: string, stroke: string): string {
  const half = size / 2;
  return `<polygon points="${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
}

// Hexagon shape (for gateways)
export function hexagon(cx: number, cy: number, size: number, fill: string, stroke: string): string {
  const w = size;
  const h = size * 0.7;
  const pts = [
    [cx - w / 4, cy - h / 2],
    [cx + w / 4, cy - h / 2],
    [cx + w / 2, cy],
    [cx + w / 4, cy + h / 2],
    [cx - w / 4, cy + h / 2],
    [cx - w / 2, cy],
  ].map(([px, py]) => `${px},${py}`).join(' ');
  return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
}

// Parallelogram shape (for queues/IO)
export function parallelogram(x: number, y: number, w: number, h: number, fill: string, stroke: string): string {
  const skew = 15;
  const pts = `${x + skew},${y} ${x + w},${y} ${x + w - skew},${y + h} ${x},${y + h}`;
  return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
}
