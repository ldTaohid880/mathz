import { DisposableStore } from '../core/DisposableStore';
import { IDisposable } from '../core/IDisposable';
import type { IParameterStore } from '../statements/IParameterStore';

export class SliderPanelView implements IDisposable {
	private readonly store = new DisposableStore();

	public constructor(
		containerEl: HTMLElement,
		parameterStore: IParameterStore,
	) {
		const declarations = parameterStore.declarations();
		if (declarations.length === 0) {
			return;
		}

		const panel = containerEl.createDiv({ cls: 'mathz-sliders' });

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
					parameterStore.set(decl.name, val);
					numberInput.value = String(parameterStore.get(decl.name) ?? val);
				}
			});

			const commitNumber = (): void => {
				const val = parseFloat(numberInput.value);
				if (!Number.isNaN(val)) {
					parameterStore.set(decl.name, val);
					const current = parameterStore.get(decl.name) ?? val;
					numberInput.value = String(current);
					rangeInput.value = String(current);
				} else {
					const current = parameterStore.get(decl.name) ?? decl.value;
					numberInput.value = String(current);
					rangeInput.value = String(current);
				}
			};

			numberInput.addEventListener('change', commitNumber);
			numberInput.addEventListener('blur', commitNumber);

			// Synchronize if parameterStore is modified externally
			this.store.add(
				parameterStore.onChanged.on((values) => {
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
	}
}
