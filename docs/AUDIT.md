# Mathz Obsidian Plugin Audit

## 1. Project Health (Configuration)
- `package.json`: Valid JSON. Defines scripts `dev`, `build`, `typecheck`, `lint`, `test`, `test:watch`.
- `tsconfig.json`: Targets `ES2018`, strict mode enabled, includes `src/**/*.ts` and `tests/**/*.ts`.
- `manifest.json`: Valid Obsidian manifest (`id`: `"mathz"`, `version`: `"1.0.0"`).
- `versions.json`: Maps `"1.0.0"` to minAppVersion `"1.0.0"`. Matches manifest.
- **Inconsistencies & Issues:**
  - `esbuild.config.mjs:15` sets `entryPoints: ["src/main.ts"]`, but `src/main.ts` does not exist. `npm run build` fails with `Could not resolve "src/main.ts"`.
  - Root `main.js` is unbuilt legacy JavaScript from the pre-migration repository, not bundled output from `src/`.
  - Empty directories in `src/`: `src/obsidian/`, `src/settings/`, and `src/ui/`.

## 2. File Inventory

| Path | Purpose | Status | Note |
| --- | --- | --- | --- |
| `src/core/BrowserScheduler.ts` | Real timer/RAF scheduler | complete | Implements `IScheduler` wrapping window methods |
| `src/core/ConsoleLogger.ts` | Logging adapter | complete | Implements `ILogger` over console |
| `src/core/DisposableStore.ts` | Lifetime tracking | complete | Disposes tracked resources in reverse order |
| `src/core/DomListener.ts` | Event listener cleanup helper | complete | Returns `IDisposable` from `addEventListener` |
| `src/core/EventEmitter.ts` | Typed pub/sub | complete | Emits events with disposable subscriptions |
| `src/core/IDisposable.ts` | Disposal interface contract | complete | Single `dispose(): void` contract |
| `src/core/ILogger.ts` | Logger interface | complete | Debug/info/warn/error methods |
| `src/core/IScheduler.ts` | Scheduler interface | complete | RAF and timeout contracts |
| `src/graph/GridRenderer.ts` | Canvas grid & axis lines | complete | Draws minor, major, and primary axes |
| `src/graph/HoverOverlay.ts` | Tooltip & hover crosshairs | complete | Canvas coordinates & crosshair rendering |
| `src/graph/InteractionController.ts` | Pan/zoom/hover mouse interactions | complete | Manages canvas pointer & wheel events |
| `src/graph/LabelRenderer.ts` | Axis tick label renderer | complete | Edge-clamped axis numeric labels |
| `src/graph/RenderContext.ts` | Canvas 2D drawing abstraction | complete | Encapsulates paths, theme colors, styles |
| `src/graph/RendererRegistry.ts` | Curve renderer dispatcher | complete | Routes statements to specialized renderers |
| `src/graph/ViewTransform.ts` | World/screen coordinate math | complete | Viewport zoom, scale, bounding box, steps |
| `src/graph/renderers/ICurveRenderer.ts` | Curve renderer interface | complete | Common interface for statement renderers |
| `src/graph/renderers/ExplicitRenderer.ts` | y=f(x) and x=f(y) plotter | complete | 1px sampling with jump/asymptote breaks |
| `src/graph/renderers/ImplicitRenderer.ts` | f(x,y)=g(x,y) plotter | complete | Marching squares grid interpolation |
| `src/graph/renderers/ParametricRenderer.ts` | x=f(t), y=g(t) plotter | complete | Uniform parameter t sampling over [0, 2π] |
| `src/graph/renderers/PolarRenderer.ts` | r=f(θ) plotter | complete | Samples r over [0, 4π] |
| `src/math/AstNode.ts` | Math AST node types | complete | Discriminated union for parsed expressions |
| `src/math/CompiledExpression.ts` | Compiled expression interface | complete | Evaluator binding and usedVariables set |
| `src/math/Evaluator.ts` | Recursive AST evaluator | complete | Evaluates AST nodes against a numeric Scope |
| `src/math/ExpressionCompiler.ts` | Parser & evaluator compiler | complete | Compiles raw string into `CompiledExpression` |
| `src/math/FunctionLibrary.ts` | Built-in math functions/consts | complete | Registry for standard math functions |
| `src/math/IExpressionCompiler.ts` | Compiler interface | complete | Signature for string compilation |
| `src/math/IFunctionLibrary.ts` | Function library interface | complete | Function and constant lookup contract |
| `src/math/ITokenizer.ts` | Tokenizer interface | complete | Token stream contract |
| `src/math/Parser.ts` | Recursive descent parser | complete | Generates AST handling precedence |
| `src/math/Token.ts` | Lexer token types | complete | Token definitions for operators and literals |
| `src/math/Tokenizer.ts` | Math expression lexer | complete | Character streamer with implicit mul support |
| `src/statements/Statement.ts` | Plottable statement models | complete | Discriminated union of curve types |
| `src/statements/StatementClassifier.ts` | Equation classifier | complete | Parses strings into specific Statement kinds |
| `src/obsidian/` | Obsidian plugin integration | empty | Missing code block processor & plugin class |
| `src/settings/` | Plugin settings & config UI | empty | No settings tab or model implemented |
| `src/ui/` | DOM controls, chips, buttons | empty | Missing UI controls, chip list, zoom buttons |

## 3. Phase Checklist
- **Phase 1: Project Setup**
  - Manifest, versions, tsconfig, vitest: `done` (`manifest.json`, `versions.json`, `tsconfig.json`, `vitest.config.ts`)
  - Esbuild pipeline: `partial` (`esbuild.config.mjs` targets nonexistent `src/main.ts`)
  - Unit tests: `partial` (Unit tests pass for math/statements/transform, missing UI/graph tests)
- **Phase 2: Behavior Parity with Original**
  - Parser & AST compiler: `done` (`src/math/*`, `src/statements/*`)
  - Curve renderers (explicit, implicit, polar, parametric): `done` (`src/graph/renderers/*`)
  - Canvas coordinate math & interaction: `done` (`src/graph/ViewTransform.ts`, `InteractionController.ts`)
  - Grid, labels, hover overlay: `done` (`src/graph/GridRenderer.ts`, `LabelRenderer.ts`, `HoverOverlay.ts`)
  - Obsidian theme CSS variable extraction: `missing` (present in old `main.js`, unmigrated)
  - Equation chips & error markers: `missing` (empty `src/ui/`)
  - Zoom & reset buttons: `missing` (empty `src/ui/`)
  - Composition root / Obsidian code block integration: `missing` (missing `src/main.ts`, empty `src/obsidian/`)
- **Phase 3: Parameters, Auto Sliders, Editable Expression List**
  - Parameter extraction & auto sliders: `missing`
  - Editable expression list: `missing`
- **Phase 4: Points, Function Definitions, Domains, Inequalities**
  - Points & function definitions: `missing`
  - Explicit domain bounds (e.g. `{0 < x < 5}`): `missing`
  - Inequality shading (marching squares fill): `missing`
- **Phase 5: Hardening**
  - `devicePixelRatio` HiDPI support: `missing` (canvas uses fixed 1:1 CSS pixel sizing)
  - `ResizeObserver` responsive canvas: `missing`
  - Settings tab: `missing` (empty `src/settings/`)
  - Image/SVG export: `missing`
  - README documentation update: `missing`

## 4. Architecture Rule Violations
- `src/math/ExpressionCompiler.ts:15`: Default parameter instantiation outside composition root (`private readonly evaluator: IEvaluator = new Evaluator()`).
- `src/graph/InteractionController.ts:15`: Instantiates internal collaborator directly (`new DisposableStore()`) instead of receiving it or an owner factory.
- Imports check: Clean. No `obsidian` imports found in `src/math/`, `src/statements/`, `src/graph/`, or `src/core/`.
- `innerHTML` check: Clean. Zero occurrences across entire `src/`.
- Listener leaks: Clean. `addDomListener` returns `IDisposable` and `InteractionController` disposes listeners via `DisposableStore`.

## 5. Probable Bugs and Dead Code
- **Missing Build Target**: `src/main.ts` is absent, preventing `npm run build` from succeeding.
- **Empty Directories**: `src/obsidian/`, `src/settings/`, and `src/ui/` are tracked empty directories.
- **No Composition Root for Graph**: No high-level orchestrator class (like `GraphController` or `GraphWidget`) exists to instantiate `RenderContext`, `RendererRegistry`, `GridRenderer`, `LabelRenderer`, and `HoverOverlay` together with an animation/render loop.

## 6. Recommended Next Steps
1. **Task 1: Create Graph View Orchestrator (`GraphWidget` / `GraphScene`)**
   - Goal: Assemble `RenderContext`, `GridRenderer`, `LabelRenderer`, `HoverOverlay`, `RendererRegistry`, and `InteractionController` into a single disposable view controller with a repaint loop.
   - Touches: `src/graph/GraphWidget.ts`, `src/graph/index.ts`.
   - Verification: Manual test with a canvas instance or unit test verifying redraw dispatching when a statement is added.
2. **Task 2: Implement Obsidian Theme Adapter**
   - Goal: Port CSS variable resolution from the legacy plugin (`--background-secondary`, `--text-normal`, etc.) to produce a `GraphTheme` and palette colors dynamically on theme changes.
   - Touches: `src/graph/ThemeAdapter.ts`.
   - Verification: Verify resolving CSS custom properties from an element against default fallbacks.
3. **Task 3: Build Equation Chip List & UI Controls Component**
   - Goal: Build the UI sidebar containing equation chips, toggle visibility checkboxes, remove buttons, and zoom in/out/reset buttons.
   - Touches: `src/ui/EquationListView.ts`, `src/ui/ControlToolbar.ts`.
   - Verification: Unit test DOM element hierarchy and click events firing toggle/reset callbacks.
4. **Task 4: Implement CodeBlockProcessor and Plugin Class (`src/obsidian/`)**
   - Goal: Create `MathzBlock` extending Obsidian `MarkdownRenderChild` and `MathzPlugin` extending Obsidian `Plugin` registering the `mathz` codeblock processor.
   - Touches: `src/obsidian/MathzBlock.ts`, `src/obsidian/MathzPlugin.ts`.
   - Verification: Verify instantiation in Obsidian mock or headless test without errors.
5. **Task 5: Establish Composition Root in `src/main.ts`**
   - Goal: Wire all dependencies (tokenizer, parser, compiler, classifier, factory) and export default `MathzPlugin` so `esbuild` builds `main.js`.
   - Touches: `src/main.ts`, `esbuild.config.mjs`.
   - Verification: Check that `npm run build` exits 0 and produces a valid bundle in `main.js`.
6. **Task 6: Clean Up Architectural Default Instantiations**
   - Goal: Remove `new Evaluator()` fallback from `ExpressionCompiler` constructor and inject it from the composition root.
   - Touches: `src/math/ExpressionCompiler.ts`, `tests/math/ExpressionCompiler.test.ts`.
   - Verification: Run `npm test` to confirm compiler test suite passes with explicit injection.
7. **Task 7: Add DevicePixelRatio & Resize Support**
   - Goal: Scale the canvas backing buffer by `window.devicePixelRatio` while retaining CSS layout dimensions for crisp rendering on Retina/HiDPI screens.
   - Touches: `src/graph/RenderContext.ts`, `src/graph/ViewTransform.ts`.
   - Verification: Inspect rendered canvas dimensions and coordinate translation at DPR = 2.
8. **Task 8: Implement Settings Tab**
   - Goal: Provide user options for default viewport scale, colors, and line thickness.
   - Touches: `src/settings/MathzSettings.ts`, `src/settings/MathzSettingTab.ts`.
   - Verification: Open Settings tab in Obsidian and update a value.
