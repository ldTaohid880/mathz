import { describe, expect, it } from 'vitest';
import { BlockSplicer } from '../../src/obsidian/BlockSplicer';

describe('BlockSplicer', () => {
	const splicer = new BlockSplicer();

	describe('with section info (lineStart / lineEnd)', () => {
		it('replaces block content cleanly within fences', () => {
			const file = [
				'# Title',
				'',
				'```mathz',
				'y = x',
				'```',
				'',
				'After',
			].join('\n');

			const result = splicer.splice(file, 'y = x', 'y = 2 * x', {
				lineStart: 2,
				lineEnd: 4,
			});

			expect(result.ok).toBe(true);
			if (!result.ok) return;

			expect(result.content).toBe(
				['# Title', '', '```mathz', 'y = 2 * x', '```', '', 'After'].join('\n'),
			);
		});

		it('preserves CRLF line endings', () => {
			const file = [
				'# Title',
				'',
				'```mathz',
				'y = x',
				'```',
				'',
				'After',
			].join('\r\n');

			const result = splicer.splice(file, 'y = x', 'y = 2 * x', {
				lineStart: 2,
				lineEnd: 4,
			});

			expect(result.ok).toBe(true);
			if (!result.ok) return;

			expect(result.content).toBe(
				['# Title', '', '```mathz', 'y = 2 * x', '```', '', 'After'].join('\r\n'),
			);
		});

		it('fails if note was edited between render and save', () => {
			const file = [
				'# Title',
				'',
				'```mathz',
				'y = x + 1',
				'```',
			].join('\n');

			const result = splicer.splice(file, 'y = x', 'y = 2 * x', {
				lineStart: 2,
				lineEnd: 4,
			});

			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.reason).toContain('The note changed since this graph rendered');
		});

		it('fails if fences at lineStart / lineEnd are not mathz block', () => {
			const file = [
				'# Title',
				'```js',
				'console.log(1);',
				'```',
			].join('\n');

			const result = splicer.splice(file, 'console.log(1);', 'console.log(2);', {
				lineStart: 1,
				lineEnd: 3,
			});

			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.reason).toContain('Section does not span a mathz block');
		});

		it('handles ~~~mathz tilde code fence syntax', () => {
			const file = [
				'~~~mathz',
				'y = sin(x)',
				'~~~',
			].join('\n');

			const result = splicer.splice(file, 'y = sin(x)', 'y = cos(x)', {
				lineStart: 0,
				lineEnd: 2,
			});

			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.content).toBe(['~~~mathz', 'y = cos(x)', '~~~'].join('\n'));
		});

		it('handles empty newSource', () => {
			const file = [
				'```mathz',
				'y = x',
				'```',
			].join('\n');

			const result = splicer.splice(file, 'y = x', '', {
				lineStart: 0,
				lineEnd: 2,
			});

			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.content).toBe(['```mathz', '```'].join('\n'));
		});
	});

	describe('fallback without section info (search-based)', () => {
		it('replaces single matching mathz block', () => {
			const file = [
				'Intro',
				'```mathz',
				'y = x^2',
				'```',
				'Outro',
			].join('\n');

			const result = splicer.splice(file, 'y = x^2', 'y = x^3');

			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.content).toBe(
				['Intro', '```mathz', 'y = x^3', '```', 'Outro'].join('\n'),
			);
		});

		it('fails if no mathz block matches original source', () => {
			const file = [
				'```mathz',
				'y = x',
				'```',
			].join('\n');

			const result = splicer.splice(file, 'y = 999', 'y = 1');

			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.reason).toBe('Could not find the mathz code block in the note');
		});

		it('fails if multiple mathz blocks match identical source', () => {
			const file = [
				'```mathz',
				'y = x',
				'```',
				'',
				'```mathz',
				'y = x',
				'```',
			].join('\n');

			const result = splicer.splice(file, 'y = x', 'y = 2 * x');

			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.reason).toBe(
				'Multiple matching mathz blocks found in the note; unable to determine target',
			);
		});
	});

	describe('no-op when source is identical', () => {
		it('returns ok and original file content when originalSource === newSource', () => {
			const file = '```mathz\ny = x\n```';
			const result = splicer.splice(file, 'y = x', 'y = x');
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.content).toBe(file);
		});
	});
});
