import { ILogger } from "./ILogger";

/** `ILogger` implementation that writes to the browser/Node console. */
export class ConsoleLogger implements ILogger {
	constructor(private readonly namespace = "Mathz") {}

	public debug(message: string, ...args: unknown[]): void {
		console.debug(`[${this.namespace}] ${message}`, ...args);
	}

	public warn(message: string, ...args: unknown[]): void {
		console.warn(`[${this.namespace}] ${message}`, ...args);
	}

	public error(message: string, ...args: unknown[]): void {
		console.error(`[${this.namespace}] ${message}`, ...args);
	}
}
