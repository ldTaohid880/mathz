import { Plugin } from 'obsidian';
import { CompositionRoot } from '../CompositionRoot';
import { MathzBlock } from './MathzBlock';

export default class MathzPlugin extends Plugin {
	public override async onload(): Promise<void> {
		const root = new CompositionRoot(this.app);
		const factory = root.createBlockFactory();

		this.registerMarkdownCodeBlockProcessor('mathz', (src, el, ctx) => {
			ctx.addChild(new MathzBlock(el, src, factory, ctx));
		});
	}
}
