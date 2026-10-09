# Changelog

All notable changes to the Mathz plugin will be documented in this file.

## [1.0.0] - 2026-03-30

### Features
- **Interactive Function & Curve Plotting**:
  - Explicit curves (`y = f(x)`, `x = f(y)`)
  - Implicit curves (`x^2 + y^2 = 25`, `x*y = 6`) via Marching Squares
  - Polar curves (`r = 3sin(2θ)`)
  - Parametric curves (`x = 5cos(t), y = 3sin(t)`)
  - Inequalities with shaded regions and solid/dashed boundaries (`y > x^2`, `x^2 + y^2 <= 9`)
  - Labeled points (`(2, 3)`, `(a, a^2) "P"`)
  - Reusable function definitions (`f(x) = x^2 - 1`, `g(x, a) = a*f(x)`) with circular dependency detection
  - Domain restrictions (`{0 <= x <= 3}`)
- **Interactive UI & Controls**:
  - Drag to pan, Ctrl/Cmd + wheel zoom, double-click / reset button for home view
  - Interactive sliders via `@slider name = value [min, max, step]`
  - In-place live editor with note back-saving
  - Equation chip toggling to hide/show individual curves
- **Image Export**:
  - Copy high-resolution PNG to clipboard
  - Save PNG attachment into Obsidian vault with smart path resolution and unique timestamped filenames
- **Accessibility & Optimization**:
  - Full keyboard navigation on canvas (Arrow keys, Shift + Arrows, `+`/`=`, `-`, `0`/`Home`)
  - Screen reader `role="img"`, `tabindex="0"`, and dynamic `aria-label` summary
  - IntersectionObserver-based visibility observer to pause repaints when off-screen
