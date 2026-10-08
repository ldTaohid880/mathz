export interface INotifier {
	info(message: string): void;
	error(message: string): void;
}
