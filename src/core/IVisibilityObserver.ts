import type { IDisposable } from './IDisposable';

export interface IVisibilityObserver {
	observe(el: Element, onChange: (visible: boolean) => void): IDisposable;
}
