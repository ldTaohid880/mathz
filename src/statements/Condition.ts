export interface Condition {
	test(scope: Record<string, number>): boolean;
	readonly uses: Set<string>;
}
