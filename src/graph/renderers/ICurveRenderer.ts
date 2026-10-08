import type { RenderContext } from '../RenderContext';
import type { ViewTransform } from '../ViewTransform';

/** Stroke color/width for a plotted curve. */
export interface CurveStyle {
	readonly color: string;
	readonly width: number;
}

/**
 * Renders one kind of {@link Statement} onto the canvas. Implementations are
 * exact ports of the original `Graph#plotExplicit`/`#plotImplicit`/`#plotPolar`/
 * `#plotParametric` methods and are re-run on every redraw (they sample the
 * current `view` fresh each time, so pan/zoom are reflected automatically).
 */
export interface ICurveRenderer<T> {
	render(statement: T, view: ViewTransform, rc: RenderContext, style: CurveStyle): void;
}
