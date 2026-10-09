import type { ScreenPoint, ViewTransform } from './ViewTransform';

/** Colors used for everything the graph draws. Mirrors the original `Graph#theme`. */
export interface GraphTheme {
	readonly bg: string;
	readonly gridMinor: string;
	readonly gridMajor: string;
	readonly axis: string;
	readonly text: string;
	readonly tipBg: string;
	readonly tipFg: string;
	readonly cross: string;
}

/** Default theme, matching the original plugin's hard-coded colors exactly. */
export const DEFAULT_THEME: GraphTheme = {
	bg: '#ededed',
	gridMinor: '#b3b3b3',
	gridMajor: '#808080',
	axis: 'red',
	text: '#303030',
	tipBg: '#222',
	tipFg: '#fff',
	cross: 'rgba(0,0,0,0.35)',
};

export interface RenderContextOptions {
	readonly fontFamily?: string;
	readonly fontSize?: number;
}

export type TextAlign = 'left' | 'center' | 'right';
export type TextBaseline = 'top' | 'middle' | 'bottom';

export interface TextStyle {
	readonly bg?: string;
	readonly fg?: string;
}

/** A pair of adjoining screen-space points forming one segment of a marching-squares cell. */
export type ScreenSegment = readonly [ScreenPoint, ScreenPoint];

/**
 * Wraps a canvas 2D context with the drawing primitives the original `Graph` class
 * used internally (`#line`, `#circle`, `#strokePath`, `#strokeCurve`, `#strokeSegments`,
 * `#text`). Exact port: pixel math, box-clamping, and fill order are unchanged.
 */
export class RenderContext {
	public readonly fontFamily: string;
	public readonly fontSize: number;
	public params: Readonly<Record<string, number>> = {};

	public constructor(
		public readonly ctx: CanvasRenderingContext2D,
		private readonly view: ViewTransform,
		public theme: GraphTheme = DEFAULT_THEME,
		options: RenderContextOptions = {},
	) {
		this.fontFamily = options.fontFamily ?? 'Roboto, Arial, sans-serif';
		this.fontSize = options.fontSize ?? 12;
	}

	/** Fills the entire canvas with the theme background color. */
	public clear(): void {
		const { ctx, view } = this;
		ctx.fillStyle = this.theme.bg;
		ctx.fillRect(0, 0, view.size, view.size);
	}

	public line(x1: number, y1: number, x2: number, y2: number, color: string, width = 1): void {
		const { ctx } = this;
		ctx.strokeStyle = color;
		ctx.lineWidth = width;
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
	}

	public circle(p: ScreenPoint, radius: number, color: string): void {
		const { ctx } = this;
		ctx.beginPath();
		ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
		ctx.fillStyle = color;
		ctx.fill();
	}

	public strokePath(
		color: string,
		width: number,
		build: (ctx: CanvasRenderingContext2D) => void,
	): void {
		const { ctx } = this;
		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = width;
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		ctx.beginPath();
		build(ctx);
		ctx.stroke();
		ctx.restore();
	}

	/** Strokes a polyline; `null` entries are breaks (asymptotes, out-of-range samples). */
	public strokeCurve(points: ReadonlyArray<ScreenPoint | null>, color: string, width: number): void {
		this.strokePath(color, width, (ctx) => {
			let down = false;
			for (const p of points) {
				if (!p) {
					down = false;
					continue;
				}
				if (down) ctx.lineTo(p.x, p.y);
				else ctx.moveTo(p.x, p.y);
				down = true;
			}
		});
	}

	/** Strokes a set of disjoint segments (used by the marching-squares implicit renderer). */
	public strokeSegments(segments: ReadonlyArray<ScreenSegment>, color: string, width: number): void {
		this.strokePath(color, width, (ctx) => {
			for (const [a, b] of segments) {
				ctx.moveTo(a.x, a.y);
				ctx.lineTo(b.x, b.y);
			}
		});
	}

	/** Draws the dashed full-canvas crosshair used by the hover overlay. */
	public crosshair(cx: number, cy: number, color: string): void {
		const { ctx, view } = this;
		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = 1;
		ctx.setLineDash([4, 4]);
		ctx.beginPath();
		ctx.moveTo(cx, 0);
		ctx.lineTo(cx, view.size);
		ctx.moveTo(0, cy);
		ctx.lineTo(view.size, cy);
		ctx.stroke();
		ctx.restore();
	}

	/**
	 * Draws a filled label box plus text, clamped so the box never leaves the canvas.
	 * Exact port of `#text`: the box and text are shifted together by the same `dx`/`dy`
	 * so labels stick to the edge instead of being cut off when panned out of view.
	 */
	public text(
		text: string,
		x: number,
		y: number,
		align: TextAlign,
		baseline: TextBaseline,
		style: TextStyle = {},
	): void {
		const { ctx, fontSize } = this;
		const size = this.view.size;
		const bg = style.bg ?? this.theme.bg;
		const fg = style.fg ?? this.theme.text;
		const padding = 3;

		ctx.font = `${fontSize}px ${this.fontFamily}`;
		ctx.textAlign = align;
		ctx.textBaseline = baseline;

		const str = String(text);
		const width = ctx.measureText(str).width;
		const boxW = width + padding * 2;
		const boxH = fontSize + padding * 2;

		let boxX = x - padding;
		if (align === 'center') boxX = x - width / 2 - padding;
		else if (align === 'right') boxX = x - width - padding;

		let boxY = y - padding;
		if (baseline === 'middle') boxY = y - fontSize / 2 - padding;
		else if (baseline === 'bottom') boxY = y - fontSize - padding;

		let dx = 0;
		if (boxX < 0) dx = -boxX;
		else if (boxX + boxW > size) dx = size - (boxX + boxW);

		let dy = 0;
		if (boxY < 0) dy = -boxY;
		else if (boxY + boxH > size) dy = size - (boxY + boxH);

		ctx.fillStyle = bg;
		ctx.fillRect(boxX + dx, boxY + dy, boxW, boxH);
		ctx.fillStyle = fg;
		ctx.fillText(str, x + dx, y + dy);
	}
}
