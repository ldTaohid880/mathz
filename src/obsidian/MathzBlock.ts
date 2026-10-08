import { MarkdownRenderChild } from 'obsidian';
import type { IDisposable } from '../core/IDisposable';
import type { IMathzBlockFactory } from '../ui/MathzBlockFactory';

export class MathzBlock extends MarkdownRenderChild {
	private handle: IDisposable | null = null;

	public constructor(
		containerEl: HTMLElement,
		private readonly source: string,
		private readonly factory: IMathzBlockFactory,
	) {
		super(containerEl);
	}

	public override onload(): void {
		this.handle = this.factory.create(this.containerEl, this.source);
	}

	public override onunload(): void {
		this.handle?.dispose();
		this.handle = null;
	}
}
