import { Notice } from 'obsidian';
import type { INotifier } from '../ui/INotifier';

export class ObsidianNotifier implements INotifier {
	public info(message: string): void {
		new Notice(message);
	}

	public error(message: string): void {
		new Notice(message);
	}
}
