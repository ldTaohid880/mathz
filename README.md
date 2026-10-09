# Mathz

Mathz is an interactive math plotting plugin for Obsidian. It renders equations, curves, implicit functions, polar plots, parametric graphs, inequalities, and points directly inside your notes from ````mathz```` code blocks with real-time sliders and full live-editing capabilities.

<!-- TODO: add GIF -->

## Features

- **Rich Math Syntax**: Plot explicit equations, implicit functions, polar curves, parametric equations, inequalities, and labeled points.
- **Interactive Sliders**: Declare parameter variables that generate interactive UI sliders to explore function transformations in real time.
- **In-Note Live Editor**: Edit equation source directly within the rendered block and save changes back to your markdown note.
- **Image Export**: Export high-resolution PNG graphs directly to your clipboard or your Obsidian vault attachments folder.
- **Optimized & Accessible**: Keyboard canvas control, screen-reader support, and automatic repaint pausing when off-screen.

<!-- TODO: add GIF -->

## Installation

### Community Plugins (Once Approved)
1. Open **Settings** > **Community plugins** in Obsidian.
2. Turn off **Restricted mode**.
3. Click **Browse** and search for **Mathz**.
4. Click **Install**, then enable the plugin.

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release on GitHub.
2. Create a folder named `mathz` inside `.obsidian/plugins/` in your vault.
3. Move the downloaded files into `.obsidian/plugins/mathz/`.
4. Reload Obsidian and enable **Mathz** in **Community plugins**.

### BRAT (Beta Tester Release)
1. Install the **Obsidian 42 - BRAT** plugin.
2. Add `https://github.com/<YOUR NAME>/mathz` as a beta plugin.

---

## Quick Start

Add a ````mathz```` code block to any note:

````mathz
@title Circle and Line
@slider r = 3 [1, 10, 0.5]
x^2 + y^2 = r^2
y = 0.5x + 1
(0, 1) "Intercept"
````

---

## Full Syntax Reference

### Statements (One per line)

| Statement Type | Syntax Example | Notes |
| :--- | :--- | :--- |
| **Explicit Curves** | `y = f(x)` or `x = f(y)` | e.g. `y = 2x + 1`, `x = y^2 - 4` |
| **Implicit Curves** | `x^2 + y^2 = 25`, `x*y = 6` | Rendered via Marching Squares |
| **Polar Curves** | `r = 3sin(2θ)` or `r = 3sin(2theta)` | Drawn over `0 <= θ <= 4π` |
| **Parametric** | `x = 5cos(t), y = 3sin(t)` | Drawn over `0 <= t <= 2π` |
| **Points** | `(2, 3)`, `(1,1), (2,4)`, `(a, a^2) "P"` | Optional label in quotes; x/y not allowed in coords |
| **Function Defs** | `f(x) = x^2 - 1`, `g(x, a) = a*f(x)` | Shown as muted ƒ chips; circular definitions rejected |
| **Inequalities** | `y > x^2`, `x^2 + y^2 <= 9` | Shaded region; solid for `<=` `>=`, dashed for `<` `>` |
| **Domain Limits** | Trailing `{0 <= x <= 3}` | Separate conditions with `,` or `and`; chains supported |

### Directives

| Directive | Syntax Example | Description |
| :--- | :--- | :--- |
| `@title` | `@title Harmonic Motion` | Sets graph title (used in export filenames & aria-label) |
| `@size` | `@size 400` | Canvas width/height in CSS pixels (200..600) |
| `@view` | `@view -10 10 -10 10` | World bounds `xmin xmax ymin ymax` |
| `@grid` | `@grid on` or `@grid off` | Show or hide grid lines |
| `@slider` | `@slider a = 2 [-5, 5, 0.1]` | Declare slider variable `name = val [min, max, step]` |

### Comments & Operators

- **Comments**: `//` to end of line (outside quoted labels) or legacy lines starting with `#`. Comments are preserved when saving back to the note.
- **Operators**: `+`, `-`, `*`, `/`, `^` (exponentiation).
- **Implicit Multiplication**: e.g., `2x`, `3sin(x)`, `x(x+1)`.
- **Constants**: `pi`, `e`.
- **Built-in Functions**: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `sqrt`, `abs`, `exp`, `ln` (natural log), `log` (base 10), `floor`, `ceil`, `round`, `sign`.

---

## Controls

- **Pan**: Click and drag on the canvas.
- **Zoom**: `Ctrl`/`Cmd` + scroll wheel (or plain scroll depending on settings).
- **Reset View**: Double-click canvas or click the reset button (`↺`).
- **Zoom Buttons**: Use `+` and `−` buttons in the top-right toolbar.
- **Hover Crosshair**: Move mouse over the canvas to display coordinates.
- **Toggle Equations**: Click any equation chip in the side list to show/hide its curve.
- **In-Place Editor**: Click `✎` to edit mathz code live; click `💾` or press `Ctrl/Cmd+S` to write edits back into the note.
- **Export PNG**: Click `📋` to copy PNG image to clipboard or `🖼` to save as a PNG file in your vault.

---

## Settings

Mathz provides configurable global defaults in Obsidian Settings:
- **Default Graph Size**: Default size in CSS pixels.
- **Default View Range**: Default `[xmin, xmax, ymin, ymax]`.
- **Mouse Wheel Zoom**: Choose whether zooming requires `Ctrl`/`Cmd` modifier key.
- **Show Navigation Hint**: Toggle footer hint on graphs.
- **Show Grid**: Toggle grid display by default.

---

## Export

Export high-resolution images of your rendered graphs:
- **Copy as Image (`📋`)**: Writes a PNG to system clipboard via the Clipboard API.
- **Save as PNG (`🖼`)**: Saves PNG attachment to your vault (named `mathz-<slug>-<YYYYMMDD-HHmmss>.png`). Uses Obsidian's attachment folder settings with automatic collision avoidance.

---

## Theming

Mathz automatically adapts to your current Obsidian theme (Dark or Light) and uses CSS variables for borders, background colors, accent highlights, and equation palette colors.

---

## Accessibility

- **Screen Reader Support**: Canvas element uses `role="img"`, `tabindex="0"`, and a dynamic `aria-label` summarizing visible equations and title.
- **Keyboard Navigation**:
  - **Arrow keys**: Pan graph view by 10% (Hold `Shift` for 30%).
  - **`+` / `=`**: Zoom in (1.5x).
  - **`-`**: Zoom out (1/1.5x).
  - **`0` or `Home`**: Reset to home view.
- **Focus Indicators**: Standard high-contrast focus rings (`:focus-visible`) for buttons, equation chips, and canvas.

---

## Privacy and Safety

- **100% Offline & Local**: Mathz does not send network requests or collect telemetry.
- **Safe Parsing**: Equations are parsed using a custom tokenizer and recursive-descent parser. Mathz never calls `eval()` or `new Function()`.

---

## Limitations

- Polar and parametric curves evaluate over fixed standard ranges (`0..4π` for polar, `0..2π` for parametric); domains can restrict but not expand these ranges.
- Chained inequalities (e.g., `0 < x^2 + y^2 < 5`) are not supported; write separate inequality statements.
- Exact symbolic algebra, regression, and list variables are not supported.

---

## Development

```bash
# Clone the repository
git clone https://github.com/<YOUR NAME>/mathz.git
cd mathz

# Run live development build
npm run dev

# Run type checks and build production bundle
npm run build

# Run Vitest unit tests
npm test
```

---

## License

[MIT License](LICENSE) © 2026 <YOUR NAME>
