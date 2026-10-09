import type { BlockDirectives, DirectiveError, IDirectiveParser } from './IDirectiveParser';

export class DirectiveParser implements IDirectiveParser {
	public parse(lines: string[]): {
		directives: BlockDirectives;
		errors: DirectiveError[];
	} {
		const directives: BlockDirectives = {};
		const errors: DirectiveError[] = [];

		for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
			const line = lines[lineIndex].trim();
			if (!line || !line.startsWith('@')) {
				continue;
			}

			// Ignore @slider lines (handled elsewhere)
			if (/^@slider\b/i.test(line)) {
				continue;
			}

			const match = line.match(/^@([a-zA-Z][a-zA-Z0-9]*)/);
			if (!match) {
				errors.push({
					lineIndex,
					message: 'Unknown directive. Available: @view, @size, @title, @grid, @slider',
				});
				continue;
			}

			const name = match[1].toLowerCase();
			const rest = line.slice(match[0].length).trim();

			switch (name) {
				case 'title': {
					if (directives.title !== undefined) {
						errors.push({ lineIndex, message: 'Duplicate @title' });
					} else if (rest.length > 120) {
						errors.push({ lineIndex, message: '@title is limited to 120 characters' });
					} else {
						directives.title = rest;
					}
					break;
				}
				case 'size': {
					if (directives.size !== undefined) {
						errors.push({ lineIndex, message: 'Duplicate @size' });
					} else if (/^[+-]?\d+$/.test(rest)) {
						const val = parseInt(rest, 10);
						if (val >= 200 && val <= 600) {
							directives.size = val;
						} else {
							errors.push({
								lineIndex,
								message: '@size must be a number from 200 to 600',
							});
						}
					} else {
						errors.push({
							lineIndex,
							message: '@size must be a number from 200 to 600',
						});
					}
					break;
				}
				case 'view': {
					if (directives.view !== undefined) {
						errors.push({ lineIndex, message: 'Duplicate @view' });
					} else {
						const parts = rest.split(/[\s,]+/).filter((p) => p.length > 0);
						if (parts.length === 4) {
							const xmin = parseFloat(parts[0]);
							const xmax = parseFloat(parts[1]);
							const ymin = parseFloat(parts[2]);
							const ymax = parseFloat(parts[3]);

							if (
								Number.isFinite(xmin) &&
								Number.isFinite(xmax) &&
								Number.isFinite(ymin) &&
								Number.isFinite(ymax) &&
								xmin < xmax &&
								ymin < ymax
							) {
								directives.view = { xmin, xmax, ymin, ymax };
							} else {
								errors.push({
									lineIndex,
									message: '@view needs: xmin xmax ymin ymax (min < max)',
								});
							}
						} else {
							errors.push({
								lineIndex,
								message: '@view needs: xmin xmax ymin ymax (min < max)',
							});
						}
					}
					break;
				}
				case 'grid': {
					if (directives.grid !== undefined) {
						errors.push({ lineIndex, message: 'Duplicate @grid' });
					} else {
						const lowerRest = rest.toLowerCase();
						if (lowerRest === 'on') {
							directives.grid = true;
						} else if (lowerRest === 'off') {
							directives.grid = false;
						} else {
							errors.push({ lineIndex, message: '@grid must be on or off' });
						}
					}
					break;
				}
				default: {
					errors.push({
						lineIndex,
						message: `Unknown directive "@${match[1]}". Available: @view, @size, @title, @grid, @slider`,
					});
					break;
				}
			}
		}

		return { directives, errors };
	}
}
