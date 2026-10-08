import { DisposableStore } from '../core/DisposableStore';
import { IDisposable } from '../core/IDisposable';
import type { IParameterStore } from '../statements/IParameterStore';

export class SliderPanelView implements IDisposable {
	private readonly store = new DisposableStore();
	private panel: HTMLElement | null = null;

	public constructor(
		private readonly containerEl: HTMLElement,
		private readonly parameterStore: IParameterStore,
	) {
		this.render();
	}

	public render(): void {
		this.store.dispose();
		if (this.panel) {
			this.panel.remove();
			this.panel = null;
		}

		const declarations = this.parameterStore.declarations();
		if (declarations.length === 0) {
			return;
		}

		const panel = this.containerEl.createDiv({ cls: 'mathz-sliders' });
		this.panel = panel;

		for (const decl of declarations) {
			const row = panel.createDiv({ cls: 'mathz-slider' });

			row.createSpan({ cls: 'mathz-slider-name', text: decl.name });

			const rangeInput = row.createEl('input', {
				cls: 'mathz-slider-range',
				type: 'range',
				attr: {
					min: String(decl.min),
					max: String(decl.max),
					step: String(decl.step),
					value: String(decl.value),
					'aria-label': `${decl.name} slider`,
				},
			});

			const numberInput = row.createEl('input', {
				cls: 'mathz-slider-value',
				type: 'number',
				attr: {
					min: String(decl.min),
					max: String(decl.max),
					step: String(decl.step),
					value: String(decl.value),
					'aria-label': `${decl.name} value`,
				},
			});

			rangeInput.addEventListener('input', () => {
				const val = parseFloat(rangeInput.value);
				if (!Number.isNaN(val)) {
					this.parameterStore.set(decl.name, val);
					numberInput.value = String(this.parameterStore.get(decl.name) ?? val);
				}
			});

			const commitNumber = (): void => {
				const val = parseFloat(numberInput.value);
				if (!Number.isNaN(val)) {
					this.parameterStore.set(decl.name, val);
					const current = this.parameterStore.get(decl.name) ?? val;
					numberInput.value = String(current);
					rangeInput.value = String(current);
				} else {
					const current = this.parameterStore.get(decl.name) ?? decl.value;
					numberInput.value = String(current);
					rangeInput.value = String(current);
				}
			};

			numberInput.addEventListener('change', commitNumber);
			numberInput.addEventListener('blur', commitNumber);

			// Synchronize if parameterStore is modified externally
			this.store.add(
				this.parameterStore.onChanged.on((values: Record<string, number>) => {
					if (values[decl.name] !== undefined) {
						const current = String(values[decl.name]);
						if (rangeInput.value !== current) rangeInput.value = current;
						if (numberInput.value !== current) numberInput.value = current;
					}
				}),
			);
		}
	}

	public dispose(): void {
		this.store.dispose();
		if (this.panel) {
			this.panel.remove();
			this.panel = null;
		}
	}
}
