import type { GraphTheme as RenderContextGraphTheme } from './RenderContext';

/**
 * Full theme configuration for the graph, extending `RenderContext`'s
 * `GraphTheme` with typography and palette colors.
 */
export interface GraphTheme extends RenderContextGraphTheme {
	readonly fontFamily: string;
	readonly palette: readonly string[];
}
