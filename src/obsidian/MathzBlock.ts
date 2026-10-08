import { MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import type { IDisposable } from '../core/IDisposable';
import type { BlockLocation } from '../ui/INoteWriter';
import type { IMathzBlockFactory } from '../ui/MathzBlockFactory';

export class MathzBlock extends MarkdownRenderChild {
	private handle: IDisposable | null = null;

	public constructor(
		containerEl: HTMLElement,
		private readonly source: string,
		private readonly factory: IMathzBlockFactory,
		private readonly ctx: MarkdownPostProcessorContext,
	) {
		super(containerEl);
	}

	public override onload(): void {
		const location: BlockLocation = {
			sourcePath: this.ctx.sourcePath,
			getSectionInfo: () => this.ctx.getSectionInfo(this.containerEl),
		};
		this.handle = this.factory.create(this.containerEl, this.source, location);
	}

	public override onunload(): void {
		this.handle?.dispose();
		this.handle = null;
	}
}
