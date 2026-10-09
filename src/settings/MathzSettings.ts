export interface MathzSettings {
	graphSize: number;
	viewHalfRange: number;
	wheelZoom: 'modifier' | 'always';
	showHint: boolean;
	showGrid: boolean;
}

export const defaultSettings: MathzSettings = {
	graphSize: 420,
	viewHalfRange: 10,
	wheelZoom: 'modifier',
	showHint: true,
	showGrid: true,
};
