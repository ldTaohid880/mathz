# Mathz

Mathz is an Obsidian plugin for plotting mathematical equations directly in
your notes. Add one or more equations to a `mathz` code block and Mathz
renders them on an interactive coordinate grid.

## Features

- Plot explicit, implicit, polar, and parametric equations.
- Plot multiple equations in the same graph.
- Pan by dragging and zoom with the mouse wheel or the zoom controls.
- Hover over the graph to inspect coordinates.
- Show or hide individual equations by selecting their labels.
- Automatically adapts graph colors, text, and background to the active
  Obsidian theme.

## Installation

### Community Plugins

1. Open **Settings** in Obsidian.
2. Go to **Community plugins** and turn off **Restricted mode** if prompted.
3. Select **Browse** and search for **Mathz**.
4. Select **Install**, then **Enable** the plugin.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest
   [Mathz release](https://github.com/obsidianmd/obsidian-sample-plugin/releases).
2. Create a folder named `mathz` inside your vault's
   `.obsidian/plugins/` directory.
3. Copy the three downloaded files into that folder.
4. Restart Obsidian, open **Settings → Community plugins**, and enable Mathz.

## Usage

Create a fenced code block with the `mathz` language. Put one equation on each
line:

````markdown
```mathz
y = sin(x)
y = 0.5x
x^2 + y^2 = 25
```
````

Blank lines and lines beginning with `#` are ignored, so comments can be used
to organize a graph:

````markdown
```mathz
# Curves
y = sin(x)
y = cos(x)
```
````

## Supported equation forms

### Explicit equations

Use `y = ...` to plot a function of `x`, or `x = ...` to plot a function of
`y`:

````markdown
```mathz
y = x^2
x = 2sin(y)
```
````

### Implicit equations

Use an equation containing both `x` and `y`:

````markdown
```mathz
x^2 + y^2 = 25
y = x + 1
```
````

### Polar equations

Use `r = ...` and `theta` (or `θ`) for the angle:

````markdown
```mathz
r = 3sin(2theta)
r = 1 + cos(theta)
```
````

### Parametric equations

Define both coordinates using `t` on the same line, separated by a comma:

````markdown
```mathz
x = 3cos(t), y = 2sin(t)
```
````

## Supported functions and constants

The expression parser supports:

- Functions: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `sqrt`, `abs`,
  `exp`, `ln`, `log`, `floor`, `ceil`, `round`, and `sign`
- Constants: `pi` and `e`
- Operators: `+`, `-`, `*`, `/`, and `^`
- Parentheses and implicit multiplication, such as `2x` and `3sin(x)`

Function arguments must be enclosed in parentheses, for example
`sqrt(x^2 + 1)`.

## Graph controls

- **Drag** the graph to pan.
- **Scroll** over the graph to zoom around the pointer.
- Select **+** or **−** to zoom in or out.
- Select **↺** or double-click the graph to reset the view.
- Select an equation label to show or hide its curve.
- Hover over the graph to see the coordinates under the pointer.

## License

Mathz is released under the terms of the [MIT License](./LICENSE).