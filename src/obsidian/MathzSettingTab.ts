import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import type { ISettingsService } from '../settings/ISettingsService';

export class MathzSettingTab extends PluginSettingTab {
	public constructor(
		app: App,
		plugin: Plugin,
		private readonly settings: ISettingsService,
	) {
		super(app, plugin);
	}

	public override display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const current = this.settings.get();

		new Setting(containerEl)
			.setName('Graph size')
			.setDesc('Default graph canvas size in pixels. Applies to graphs rendered afterwards.')
			.addSlider((slider) =>
				slider
					.setLimits(200, 600, 20)
					.setValue(current.graphSize)
					.setDynamicTooltip()
					.onChange((value) => {
						void this.settings.update({ graphSize: value });
					}),
			);

		new Setting(containerEl)
			.setName('Default view half-range')
			.setDesc(
				'Default axis range from center to edge (e.g. 10 means [-10, 10]). Applies to graphs rendered afterwards.',
			)
			.addSlider((slider) =>
				slider
					.setLimits(2, 50, 1)
					.setValue(current.viewHalfRange)
					.setDynamicTooltip()
					.onChange((value) => {
						void this.settings.update({ viewHalfRange: value });
					}),
			);

		new Setting(containerEl)
			.setName('Wheel zoom')
			.setDesc('Choose when scrolling over the canvas zooms the graph.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('modifier', 'Ctrl/Cmd + scroll')
					.addOption('always', 'Scroll while hovering')
					.setValue(current.wheelZoom)
					.onChange((value) => {
						void this.settings.update({ wheelZoom: value as 'modifier' | 'always' });
					}),
			);

		new Setting(containerEl)
			.setName('Show hint line')
			.setDesc('Display interaction hint below the graph stage.')
			.addToggle((toggle) =>
				toggle.setValue(current.showHint).onChange((value) => {
					void this.settings.update({ showHint: value });
				}),
			);

		new Setting(containerEl)
			.setName('Show grid')
			.setDesc('Display background grid lines.')
			.addToggle((toggle) =>
				toggle.setValue(current.showGrid).onChange((value) => {
					void this.settings.update({ showGrid: value });
				}),
			);

		new Setting(containerEl)
			.setName('Reset to defaults')
			.setDesc('Restore all settings to their default values.')
			.addButton((button) =>
				button
					.setButtonText('Reset')
					.setWarning()
					.onClick(async () => {
						await this.settings.reset();
						this.display();
					}),
			);
	}
}
