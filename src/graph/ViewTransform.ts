/** A world-space point. */
export interface WorldPoint {
	readonly x: number;
	readonly y: number;
}

/** A screen-space (canvas pixel) point. */
export interface ScreenPoint {
	readonly x: number;
	readonly y: number;
}

/** World-space visible bounds of the viewport. */
export interface WorldBounds {
	readonly xmin: number;
	readonly xmax: number;
	readonly ymin: number;
	readonly ymax: number;
}

export interface ViewTransformOptions {
	readonly cellCount?: number;
	readonly cellSize?: number;
	readonly minScale?: number;
	readonly maxScale?: number;
}

/**
 * Pure world<->screen coordinate transform and pan/zoom state for the graph.
 * Exact port of the view-state math in the original `Graph` class.
 */
export class ViewTransform {
	public readonly cellCount: number;
	public readonly cellSize: number;
	public readonly minScale: number;
	public readonly maxScale: number;

	/** Canvas side length in CSS pixels (extent + 1, for crisp 1px gridlines). */
	public size: number;
	private extent_: number;
	private half: number;

	private cx = 0;
	private cy = 0;
	private scale: number;

	private homeCx = 0;
	private homeCy = 0;
	private homeScale: number;

	public constructor(options: ViewTransformOptions = {}) {
		this.cellCount = options.cellCount ?? 20;
		this.cellSize = options.cellSize ?? 30;
		this.minScale = options.minScale ?? 0.05;
		this.maxScale = options.maxScale ?? 5000;

		this.extent_ = this.cellCount * this.cellSize;
		this.size = this.extent_ + 1;
		this.half = this.extent_ / 2;
		this.scale = this.cellSize;

		this.homeScale = this.cellSize;
	}

	public setSize(newSize: number): void {
		this.size = newSize;
		this.extent_ = newSize - 1;
		this.half = this.extent_ / 2;
	}

	public get centerX(): number {
		return this.cx;
	}

	public get centerY(): number {
		return this.cy;
	}

	public get currentScale(): number {
		return this.scale;
	}

	/** World-space side length covered by the canvas, in screen pixels (size - 1). */
	public get extent(): number {
		return this.extent_;
	}

	public toScreen(p: WorldPoint): ScreenPoint {
		return {
			x: this.half + 0.5 + (p.x - this.cx) * this.scale,
			y: this.half + 0.5 - (p.y - this.cy) * this.scale,
		};
	}

	public toWorld(sx: number, sy: number): WorldPoint {
		return {
			x: this.cx + (sx - 0.5 - this.half) / this.scale,
			y: this.cy - (sy - 0.5 - this.half) / this.scale,
		};
	}

	public bounds(): WorldBounds {
		const topLeft = this.toWorld(0, this.size);
		const bottomRight = this.toWorld(this.size, 0);
		return {
			xmin: topLeft.x,
			xmax: bottomRight.x,
			ymin: topLeft.y,
			ymax: bottomRight.y,
		};
	}

	/** A "nice" grid step (1/2/5 * 10^n) close to one cell's worth of world units. */
	public niceStep(): number {
		const raw = this.cellSize / this.scale;
		const mag = Math.pow(10, Math.floor(Math.log10(raw)));
		const n = raw / mag;
		return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
	}

	/** Snaps a screen coordinate to the pixel grid for crisp 1px lines. */
	public snap(v: number): number {
		return Math.round(v - 0.5) + 0.5;
	}

	/** Formats a world value, trimming floating-point noise. */
	public fmt(v: number): string {
		return String(+v.toPrecision(12));
	}

	/** Zooms by `factor`, anchored on the given screen point (defaults to center). */
	public zoomAt(factor: number, sx = this.size / 2, sy = this.size / 2): void {
		const before = this.toWorld(sx, sy);
		this.scale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor));
		const after = this.toWorld(sx, sy);
		this.cx += before.x - after.x;
		this.cy += before.y - after.y;
	}

	/** Pans the view by a screen-space delta (used while dragging). */
	public panBy(dx: number, dy: number): void {
		this.cx -= dx / this.scale;
		this.cy += dy / this.scale;
	}

	public setState(state: { cx: number; cy: number; scale: number }): void {
		this.cx = state.cx;
		this.cy = state.cy;
		this.scale = Math.min(this.maxScale, Math.max(this.minScale, state.scale));
	}

	public setHomeView(state: { cx: number; cy: number; scale: number }): void {
		this.homeCx = state.cx;
		this.homeCy = state.cy;
		this.homeScale = Math.min(this.maxScale, Math.max(this.minScale, state.scale));
	}

	public getHomeView(): { cx: number; cy: number; scale: number } {
		return { cx: this.homeCx, cy: this.homeCy, scale: this.homeScale };
	}

	public reset(): void {
		this.cx = this.homeCx;
		this.cy = this.homeCy;
		this.scale = this.homeScale;
	}
}
