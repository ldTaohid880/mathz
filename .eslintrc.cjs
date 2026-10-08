module.exports = {
	root: true,
	parser: "@typescript-eslint/parser",
	parserOptions: {
		sourceType: "module",
	},
	plugins: ["@typescript-eslint", "import"],
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
	],
	env: {
		browser: true,
		node: true,
		es2021: true,
	},
	rules: {
		"@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
		"@typescript-eslint/no-explicit-any": "off",
		"@typescript-eslint/no-non-null-assertion": "off",
		"import/no-restricted-paths": [
			"error",
			{
				zones: [
					{
						target: "./src/core",
						from: ["./src/math", "./src/statements", "./src/graph", "./src/ui", "./src/obsidian", "./src/settings"],
						message: "core must not depend on outer layers (math/statements/graph/ui/obsidian/settings).",
					},
					{
						target: "./src/math",
						from: ["./src/statements", "./src/graph", "./src/ui", "./src/obsidian"],
						message: "math must not depend on statements/graph/ui/obsidian.",
					},
					{
						target: "./src/statements",
						from: ["./src/graph", "./src/ui", "./src/obsidian"],
						message: "statements must not depend on graph/ui/obsidian.",
					},
					{
						target: "./src/graph",
						from: ["./src/ui", "./src/obsidian"],
						message: "graph must not depend on ui/obsidian.",
					},
					{
						target: "./src/ui",
						from: ["./src/obsidian"],
						message: "ui must not depend on obsidian adapters directly (depend on interfaces instead).",
					},
				],
			},
		],
	},
	overrides: [
		{
			files: [
				"src/core/**/*.ts",
				"src/math/**/*.ts",
				"src/statements/**/*.ts",
				"src/graph/**/*.ts",
			],
			rules: {
				"no-restricted-imports": [
					"error",
					{
						paths: [
							{
								name: "obsidian",
								message: "Inner layers (core/math/statements/graph) must not import the 'obsidian' module. Use an adapter in src/obsidian/ instead.",
							},
						],
					},
				],
			},
		},
	],
};
