# Mathz

Mathz is an Obsidian plugin for plotting mathematical equations, parametric curves, discrete points, and interactive sliders directly inside your notes. Add equations to a ````mathz```` code block, and Mathz renders them on an interactive coordinate grid styled to match your Obsidian theme.

## Features

- **Multiple equation types**: Plot explicit (`y = f(x)`, `x = f(y)`), implicit, polar, and parametric curves.
- **Points & labels**: Plot individual or grouped coordinates `(x, y)` with optional text labels.
- **User-defined functions**: Define reusable single- or multi-parameter functions (`f(x) = ...`) and call them across curves or other definitions.
- **Interactive sliders**: Declare dynamic parameters with `@slider` to adjust variables in real-time.
- **Live edit mode**: Open an in-block editor (✎) to update equations with live preview and save changes back to your note (💾).
- **Interactive canvas**: Pan by dragging, zoom around the cursor with `Ctrl`/`Cmd` + scroll, and inspect coordinates on hover.
- **Theme integration**: Adapts graph backgrounds, axes, grid lines, and curve palette to light and dark Obsidian themes.

## Installation

### Community Plugins (Obsidian)

1. Open **Settings** in Obsidian.
2. Navigate to **Community plugins** and turn off **Restricted mode** if prompted.
3. Select **Browse** and search for **Mathz**.
4. Select **Install**, then select **Enable**.

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Create a directory named `mathz` in your vault at `.obsidian/plugins/mathz`.
3. Copy `main.js`, `manifest.json`, and `styles.css` into that directory.
4. Reload Obsidian or restart the app, then enable **Mathz** under **Settings → Community plugins**.

## Usage / Quick Start

Create a fenced code block with the language identifier `mathz`. Write one equation or declaration per line:

````markdown
```mathz
# Plotting a parabola and a line
y = x^2 - 4
y = 0.5x + 1
```
````

Each equation appears in the side list with a colored indicator matching its curve on the canvas. Click any equation chip to toggle its visibility.

## Supported Equation Types

### Explicit Equations

Define $y$ as a function of $x$, or $x$ as a function of $y$:

````markdown
```mathz
y = sin(x)
x = y^2 - 2
```
````

> **Note**: An equation is treated as explicit when the dependent variable appears alone on the left side and does not appear on the right side.

### Implicit Equations

Write equations relating $x$ and $y$ on both sides:

````markdown
```mathz
x^2 + y^2 = 25
sin(x) = cos(y)
```
````

Implicit equations are evaluated across the visible grid using a marching squares contour generator.

### Polar Equations

Define the radius $r$ in terms of `theta` or `θ`:

````markdown
```mathz
r = 3sin(2theta)
r = 1 + cos(θ)
```
````

### Parametric Equations

Define both coordinates on a single line separated by a comma using the parameter `t`:

````markdown
```mathz
x = 3cos(t), y = 2sin(t)
x = t * cos(t), y = t * sin(t)
```
````

### Discrete Points

Plot coordinate pairs enclosed in parentheses. Multiple points can be separated by commas, and an optional double-quoted label can be added at the end:

````markdown
```mathz
(0, 0)
(1, 2), (-1, 2), (0, -2)
(3, 4) "Peak"
```
````

> **Note**: Point coordinates can use numbers, constants, declared sliders, and user-defined functions, but cannot contain free curve variables (`x`, `y`, `t`, `r`, or `theta`).

## Expressions

### Operators

| Operator | Description | Precedence / Associativity | Example |
| :--- | :--- | :--- | :--- |
| `+` | Addition | Left-to-right | `x + 2` |
| `-` | Subtraction / Negation | Unary prefix or left-to-right binary | `-x`, `5 - 3` |
| `*` | Multiplication | Left-to-right | `3 * x` |
| `/` | Division | Left-to-right | `x / 2` |
| `^` | Exponentiation | Right-to-left | `x^2`, `2^3^2` |
| `( )` | Grouping parentheses | Highest | `(x + 1) * (x - 1)` |

### Constants

| Constant | Value | Description |
| :--- | :--- | :--- |
| `pi` | `3.141592653589793` | Archimedes' constant $\pi$ |
| `e` | `2.718281828459045` | Euler's number $e$ |

### Built-in Functions

All function arguments must be enclosed in parentheses (e.g. `sin(x)`):

| Function | Description |
| :--- | :--- |
| `sin(x)`, `cos(x)`, `tan(x)` | Trigonometric functions (radians) |
| `asin(x)`, `acos(x)`, `atan(x)` | Inverse trigonometric functions |
| `sqrt(x)` | Square root ($\sqrt{x}$) |
| `abs(x)` | Absolute value ($\|x\|$) |
| `exp(x)` | Natural exponential ($e^x$) |
| `ln(x)` | Natural logarithm ($\ln x$) |
| `log(x)` | Base-10 logarithm ($\log_{10} x$) |
| `floor(x)` | Largest integer $\le x$ |
| `ceil(x)` | Smallest integer $\ge x$ |
| `round(x)` | Nearest integer |
| `sign(x)` | Sign of $x$ (`-1`, `0`, or `1`) |

### Implicit Multiplication

Multiplication is automatically inferred between adjacent terms without requiring `*`:

- Number and variable: `2x`, `0.5y`
- Number and function: `3sin(x)`, `2sqrt(x)`
- Number and grouped expression: `2(x + 1)`
- Consecutive single-letter identifiers: `xy` is parsed as `x * y`

Multi-letter words corresponding to declared sliders, built-in functions, or user-defined functions remain intact.

## User-Defined Functions

Define custom functions using the syntax `name(param1, param2, ...) = expression`. Once declared, user-defined functions can be used in other equations, points, or nested inside further function definitions.

````markdown
```mathz
# Single-parameter function
f(x) = x^2 - 2
y = f(x)

# Multi-parameter function
dist(a, b) = sqrt(a^2 + b^2)
r = dist(sin(theta), cos(theta))

# Function calling another function
sq(x) = x * x
g(x) = sq(x) + 1
y = g(x)
```
````

### Rules and Behavior

- **Definition Chips**: User-defined functions appear in the list with a `ƒ` badge. They define equations without drawing curves directly.
- **Composition & Calls**: User functions can accept complex expressions and call other defined functions (e.g. `f(g(x))`).
- **Cycle Detection**: Circular references (e.g. `f(x) = g(x)` and `g(x) = f(x)`) are detected and surfaced with an error indicator: `Circular definition: f → g → f`.
- **Parameter Validation**: Parameter names must be valid identifiers, and duplicate parameter names (e.g. `f(x, x) = x^2`) are rejected.
- **Reserved Names**: Function names cannot collide with built-in functions (`sin`, `cos`, etc.), constants (`pi`, `e`), coordinate variables (`x`, `y`, `t`, `r`, `theta`), or declared `@slider` names.

## Interactive Sliders

Declare interactive parameter sliders using `@slider`:

````markdown
```mathz
@slider a = 2 [-5, 5, 0.1]
@slider b = 1 [-10, 10]

y = a * sin(b * x)
```
````

- **Syntax**: `@slider <name> = <initial_value> [<min>, <max>]` or `@slider <name> = <initial_value> [<min>, <max>, <step>]`.
- If omitted, `step` defaults to `0.1`.
- Dragging a slider updates the graph in real-time.
- Slider values can be referenced by name in explicit, implicit, polar, parametric, point, and function expressions.

## Comments and Organization

- Empty lines are ignored.
- Lines starting with `#` are treated as comments and will not be evaluated or plotted:

````markdown
```mathz
# --- Trigonometric waves ---
y = sin(x)
y = cos(x)

# --- Baseline ---
y = 0
```
````

## Graph Controls

### Mouse and Keyboard Interaction

- **Pan**: Click and drag the grid with mouse or pen.
- **Zoom**: Hold `Ctrl` (or `Cmd` on macOS) and scroll with the mouse wheel.
- **Reset**: Double-click anywhere on the grid to reset the view to its initial bounds.
- **Inspect**: Move the mouse across the canvas to inspect coordinates under the crosshair cursor.

### Toolbar Buttons

Positioned in the top right of each graph block:

| Icon | Action | Description |
| :---: | :--- | :--- |
| `✎` | **Edit** | Toggles an embedded source text editor above the equations. |
| `💾` | **Save** | Appears when edits are made; atomically writes updated source back to the note file. |
| `+` | **Zoom In** | Scales the view inward toward the center. |
| `−` | **Zoom Out** | Scales the view outward from the center. |
| `↺` | **Reset View** | Resets the zoom level and centers the origin `(0, 0)`. |

### Equation List

- Each plotted equation displays a color swatch matching its curve.
- Click an equation chip (or press `Enter` / `Space` when focused) to hide or show that curve.

## Examples

### Damped Oscillation with Sliders and Functions

````markdown
```mathz
@slider k = 0.5 [0.1, 2, 0.05]
@slider w = 2 [0.5, 5, 0.1]

envelope(x) = exp(-k * abs(x))
y = envelope(x) * cos(w * x)
y = envelope(x)
y = -envelope(x)
```
````

### Polar Rose & Center Point

````markdown
```mathz
@slider petals = 4 [1, 10, 1]

r = 3 * sin(petals * theta)
(0, 0) "Origin"
```
````

### Ellipse & Intersection

````markdown
```mathz
# Implicit ellipse
(x / 4)^2 + (y / 2)^2 = 1

# Line intersecting ellipse
y = 0.5x

# Marked intersection points
(2.83, 1.41) "P1"
(-2.83, -1.41) "P2"
```
````

## Limitations & Syntax Notes

- **Case sensitivity**: Equation identifiers and function names are case-insensitive (`SIN(x)`, `Sin(x)`, and `sin(x)` resolve identically).
- **Single equation per line**: Except for parametric equations (`x = ..., y = ...`) and comma-separated point groups (`(1, 2), (3, 4)`), each line must contain a single statement.
- **Single-variable functions**: Built-in functions (`sin`, `sqrt`, etc.) accept a single argument. User-defined functions can take multiple arguments (`f(a, b) = a + b`).
- **No recursive functions**: Recursive functions or mutual cycles (`f` calling `g` calling `f`) are disallowed and marked with a circular reference error.

## License

Mathz is released under the terms of the [MIT License](./LICENSE).