export interface BlockDirectives {
	title?: string;
	size?: number;
	view?: {
		xmin: number;
		xmax: number;
		ymin: number;
		ymax: number;
	};
	grid?: boolean;
}

export interface DirectiveError {
	lineIndex: number;
	message: string;
}

export interface IDirectiveParser {
	parse(lines: string[]): {
		directives: BlockDirectives;
		errors: DirectiveError[];
	};
}
