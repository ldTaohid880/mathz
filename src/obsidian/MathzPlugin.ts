import { Plugin } from 'obsidian';
import { CompositionRoot } from '../CompositionRoot';
import { MathzBlock } from './MathzBlock';
import { MathzSettingTab } from './MathzSettingTab';

export default class MathzPlugin extends Plugin {
	public override async onload(): Promise<void> {
		const root = new CompositionRoot(this.app, this);
		const factory = await root.createBlockFactory();

		this.addSettingTab(new MathzSettingTab(this.app, this, root.settingsService));

		this.registerMarkdownCodeBlockProcessor('mathz', (src, el, ctx) => {
			ctx.addChild(new MathzBlock(el, src, factory, ctx));
		});
	}
}
