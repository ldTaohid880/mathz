import { describe, expect, it } from 'vitest';
import { DirectiveParser } from '../../src/statements/DirectiveParser';

describe('DirectiveParser', () => {
	it('parses valid @title, @size, @view, and @grid directives', () => {
		const parser = new DirectiveParser();
		const lines = [
			'@title My Graph',
			'@size 480',
			'@view -2 12 -3 3',
			'@grid off',
			'@slider k = 0.5 [0, 1]',
			'y = sin(x)',
		];

		const { directives, errors } = parser.parse(lines);
		expect(errors).toHaveLength(0);
		expect(directives.title).toBe('My Graph');
		expect(directives.size).toBe(480);
		expect(directives.view).toEqual({ xmin: -2, xmax: 12, ymin: -3, ymax: 3 });
		expect(directives.grid).toBe(false);
	});

	it('errors on @title > 120 chars', () => {
		const parser = new DirectiveParser();
		const longTitle = 'a'.repeat(121);
		const { errors } = parser.parse([`@title ${longTitle}`]);
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('@title is limited to 120 characters');
	});

	it('errors on invalid @size', () => {
		const parser = new DirectiveParser();

		expect(parser.parse(['@size 100']).errors[0].message).toBe(
			'@size must be a number from 200 to 600',
		);
		expect(parser.parse(['@size 700']).errors[0].message).toBe(
			'@size must be a number from 200 to 600',
		);
		expect(parser.parse(['@size abc']).errors[0].message).toBe(
			'@size must be a number from 200 to 600',
		);
	});

	it('errors on invalid @view', () => {
		const parser = new DirectiveParser();

		expect(parser.parse(['@view -2 12']).errors[0].message).toBe(
			'@view needs: xmin xmax ymin ymax (min < max)',
		);
		expect(parser.parse(['@view 10 2 -3 3']).errors[0].message).toBe(
			'@view needs: xmin xmax ymin ymax (min < max)',
		);
	});

	it('errors on invalid @grid', () => {
		const parser = new DirectiveParser();
		const { errors } = parser.parse(['@grid maybe']);
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('@grid must be on or off');
	});

	it('errors on duplicate directives', () => {
		const parser = new DirectiveParser();
		const lines = ['@title First', '@title Second', '@size 300', '@size 400'];
		const { directives, errors } = parser.parse(lines);

		expect(directives.title).toBe('First');
		expect(directives.size).toBe(300);
		expect(errors).toHaveLength(2);
		expect(errors[0].message).toBe('Duplicate @title');
		expect(errors[1].message).toBe('Duplicate @size');
	});

	it('errors on unknown directives', () => {
		const parser = new DirectiveParser();
		const { errors } = parser.parse(['@unknownDirect']);
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe(
			'Unknown directive "@unknownDirect". Available: @view, @size, @title, @grid, @slider',
		);
	});

	it('ignores @slider lines', () => {
		const parser = new DirectiveParser();
		const { directives, errors } = parser.parse(['@slider a = 1 [0, 2]']);
		expect(errors).toHaveLength(0);
		expect(Object.keys(directives)).toHaveLength(0);
	});
});
