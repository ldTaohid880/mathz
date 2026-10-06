const MATH_FUNCS = {
	sin: Math.sin,
	cos: Math.cos,
	tan: Math.tan,
	asin: Math.asin,
	acos: Math.acos,
	atan: Math.atan,
	sqrt: Math.sqrt,
	abs: Math.abs,
	exp: Math.exp,
	ln: Math.log,
	log: Math.log10,
	floor: Math.floor,
	ceil: Math.ceil,
	round: Math.round,
	sign: Math.sign,
};
const MATH_CONSTS = { pi: Math.PI, e: Math.E };
const PALETTE = [
	'#1f77b4',
	'#d62728',
	'#2ca02c',
	'#9467bd',
	'#ff7f0e',
	'#17becf',
];

// compileExpression("x^2 + y", ["x", "y"]) -> fn({ x, y }) => number
function compileExpression(src, vars) {
	const known = new Set([
		...Object.keys(MATH_FUNCS),
		...Object.keys(MATH_CONSTS),
		...vars,
	]);
	const raw =
		src
			.toLowerCase()
			.replace(/θ/g, 'theta')
			.match(/\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|[a-z]+|[-+*/^()]|\S/g) ?? [];
	// "xy" -> x, y  (known words like "sin" or "theta" stay whole)
	const tokens = raw.flatMap((t) =>
		/^[a-z]{2,}$/.test(t) && !known.has(t) ? t.split('') : [t],
	);

	const uses = new Set();
	let pos = 0;
	const peek = () => tokens[pos];
	const next = () => tokens[pos++];
	const isStart = (t) =>
		t !== undefined && (/^[\d.a-z]/.test(t) || t === '(');

	function expr() {
		let left = term();
		while (peek() === '+' || peek() === '-') {
			const op = next();
			const l = left,
				r = term();
			left = op === '+' ? (s) => l(s) + r(s) : (s) => l(s) - r(s);
		}
		return left;
	}

	function term() {
		let left = unary();
		while (true) {
			const tok = peek();
			const l = left;
			if (tok === '*' || tok === '/') {
				next();
				const r = unary();
				left = tok === '*' ? (s) => l(s) * r(s) : (s) => l(s) / r(s);
			} else if (isStart(tok)) {
				const r = power(); // implicit multiplication
				left = (s) => l(s) * r(s);
			} else break;
		}
		return left;
	}

	function unary() {
		if (peek() === '-') {
			next();
			const v = unary();
			return (s) => -v(s);
		}
		if (peek() === '+') {
			next();
			return unary();
		}
		return power();
	}

	function power() {
		const base = primary();
		if (peek() === '^') {
			next();
			const exp = unary();
			return (s) => Math.pow(base(s), exp(s));
		}
		return base;
	}

	function primary() {
		const tok = next();
		if (tok === undefined) throw new Error('Unexpected end of equation');

		if (/^[\d.]/.test(tok)) {
			const n = parseFloat(tok);
			return () => n;
		}
		if (tok === '(') {
			const inner = expr();
			if (next() !== ')') throw new Error('Missing closing )');
			return inner;
		}
		if (tok in MATH_FUNCS) {
			if (next() !== '(') throw new Error(`Expected ( after ${tok}`);
			const arg = expr();
			if (next() !== ')') throw new Error('Missing closing )');
			const f = MATH_FUNCS[tok];
			return (s) => f(arg(s));
		}
		if (tok in MATH_CONSTS) {
			const c = MATH_CONSTS[tok];
			return () => c;
		}
		if (vars.includes(tok)) {
			uses.add(tok);
			return (s) => s[tok];
		}
		throw new Error(`Unexpected "${tok}"`);
	}

	const fn = expr();
	if (pos < tokens.length) throw new Error(`Unexpected "${tokens[pos]}"`);
	fn.uses = uses;
	return fn;
}

class Graph {
	#plotCount = 0;
	#dirty = true;
	#frame = 0;
	#snapshot = null;
	#pointer = null; // last pointer position in canvas px, null when outside
	#drag = null; // last drag position while the button is held
	#abort = new AbortController();

	constructor(
		canvas,
		{
			cellCount = 20,
			cellSize = 30,
			minScale = 0.05,
			maxScale = 5000,
			fontFamily = 'Roboto, Arial, sans-serif',
		} = {},
	) {
		this.fontFamily = fontFamily;
		this.theme = {
			bg: '#ededed',
			gridMinor: '#b3b3b3',
			gridMajor: '#808080',
			axis: 'red',
			text: '#303030',
			tipBg: '#222',
			tipFg: '#fff',
			cross: 'rgba(0,0,0,0.35)',
		};
		this.canvas = canvas;
		// We snapshot the scene so hover redraws are cheap
		this.ctx = canvas.getContext('2d', { willReadFrequently: true });

		this.cellSize = cellSize;
		this.extent = cellCount * cellSize; // 600
		this.size = this.extent + 1; // canvas pixels
		this.half = this.extent / 2;
		canvas.width = this.size;
		canvas.height = this.size;

		this.minScale = minScale;
		this.maxScale = maxScale;
		this.fontSize = 12;
		this.labelMargin = 6;

		// cx, cy: graph point at the canvas center. scale: pixels per graph unit
		this.view = { cx: 0, cy: 0, scale: cellSize };
		this.items = []; // everything drawn on top of the grid, replayed on every redraw

		this.#bindEvents();
	}

	/* ---------------- view / coordinates ---------------- */

	// Graph coords -> canvas pixels (the 0.5 keeps strokes centered on pixels)
	#toScreen(p) {
		const { cx, cy, scale } = this.view;
		return {
			x: this.half + 0.5 + (p.x - cx) * scale,
			y: this.half + 0.5 - (p.y - cy) * scale,
		};
	}

	// Canvas pixels -> graph coords
	#toWorld(sx, sy) {
		const { cx, cy, scale } = this.view;
		return {
			x: cx + (sx - 0.5 - this.half) / scale,
			y: cy - (sy - 0.5 - this.half) / scale,
		};
	}

	#bounds() {
		const a = this.#toWorld(0, this.size);
		const b = this.#toWorld(this.size, 0);
		return { xmin: a.x, xmax: b.x, ymin: a.y, ymax: b.y };
	}

	// Grid spacing (graph units) that stays close to cellSize pixels: 1, 2, 5, 10...
	#niceStep() {
		const raw = this.cellSize / this.view.scale;
		const mag = 10 ** Math.floor(Math.log10(raw));
		const n = raw / mag;
		return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
	}

	#snap(v) {
		return Math.round(v - 0.5) + 0.5;
	}

	#fmt(v) {
		return String(+v.toPrecision(12)); // hides float noise like 0.30000000000000004
	}

	zoomAt(factor, sx = this.size / 2, sy = this.size / 2) {
		const before = this.#toWorld(sx, sy);
		const { minScale, maxScale, view } = this;
		view.scale = Math.min(
			maxScale,
			Math.max(minScale, view.scale * factor),
		);

		// Keep the graph point under the cursor fixed
		const after = this.#toWorld(sx, sy);
		view.cx += before.x - after.x;
		view.cy += before.y - after.y;
		this.#schedule(true);
	}

	reset() {
		this.view = { cx: 0, cy: 0, scale: this.cellSize };
		this.#schedule(true);
	}

	setTheme(theme = {}) {
		const { fontFamily, ...colors } = theme;
		if (fontFamily) this.fontFamily = fontFamily;
		Object.assign(this.theme, colors);
		this.#schedule(true);
	}

	/* ---------------- events ---------------- */

	#eventPoint(e) {
		const r = this.canvas.getBoundingClientRect();
		return {
			x: ((e.clientX - r.left) * this.canvas.width) / r.width,
			y: ((e.clientY - r.top) * this.canvas.height) / r.height,
		};
	}

	#bindEvents() {
		const { canvas } = this;
		const opts = { signal: this.#abort.signal };

		canvas.style.touchAction = 'none';
		canvas.style.cursor = 'crosshair';

		canvas.addEventListener(
			'pointerdown',
			(e) => {
				canvas.setPointerCapture(e.pointerId);
				this.#drag = this.#eventPoint(e);
				canvas.style.cursor = 'grabbing';
			},
			opts,
		);

		canvas.addEventListener(
			'pointermove',
			(e) => {
				const p = this.#eventPoint(e);
				this.#pointer = p;
				if (this.#drag) {
					this.view.cx -= (p.x - this.#drag.x) / this.view.scale;
					this.view.cy += (p.y - this.#drag.y) / this.view.scale;
					this.#drag = p;
					this.#schedule(true);
				} else {
					this.#schedule(false); // hover only, scene is unchanged
				}
			},
			opts,
		);

		const endDrag = () => {
			this.#drag = null;
			canvas.style.cursor = 'crosshair';
		};
		canvas.addEventListener('pointerup', endDrag, opts);
		canvas.addEventListener('pointercancel', endDrag, opts);

		canvas.addEventListener(
			'pointerleave',
			() => {
				this.#pointer = null;
				this.#schedule(false);
			},
			opts,
		);

		canvas.addEventListener(
			'wheel',
			(e) => {
				e.preventDefault();
				const p = this.#eventPoint(e);
				const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
				this.zoomAt(Math.exp(-dy * 0.0015), p.x, p.y);
			},
			{ ...opts, passive: false },
		);

		canvas.addEventListener('dblclick', () => this.reset(), opts);
	}

	destroy() {
		this.#abort.abort();
		cancelAnimationFrame(this.#frame);
	}

	/* ---------------- render loop ---------------- */

	#schedule(sceneChanged) {
		this.#dirty ||= sceneChanged;
		if (this.#frame) return;
		this.#frame = requestAnimationFrame(() => {
			this.#frame = 0;
			this.#paint();
		});
	}

	#paint() {
		const { ctx, size } = this;
		if (this.#dirty || !this.#snapshot) {
			this.#drawScene();
			this.#snapshot = ctx.getImageData(0, 0, size, size);
			this.#dirty = false;
		} else {
			ctx.putImageData(this.#snapshot, 0, 0);
		}
		if (this.#pointer && !this.#drag) this.#drawHover();
	}

	draw() {
		this.#dirty = true;
		this.#paint();
	}

	clear() {
		this.items = [];
		this.#plotCount = 0;
		this.#schedule(true);
	}

	#drawScene() {
		const { ctx, size } = this;
		ctx.fillStyle = this.theme.bg;
		ctx.fillRect(0, 0, size, size);
		this.#drawGrid();
		this.#drawLabels();
		for (const draw of this.items) draw();
	}

	/* ---------------- primitives (all in canvas pixels) ---------------- */

	#line(x1, y1, x2, y2, color, width = 1) {
		const { ctx } = this;
		ctx.strokeStyle = color;
		ctx.lineWidth = width;
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
	}

	#circle(p, radius, color) {
		const { ctx } = this;
		ctx.beginPath();
		ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
		ctx.fillStyle = color;
		ctx.fill();
	}

	#strokePath(color, width, build) {
		const { ctx } = this;
		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = width;
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		ctx.beginPath();
		build(ctx);
		ctx.stroke();
		ctx.restore();
	}

	// points: canvas px, null = break in the line
	#strokeCurve(points, color, width) {
		this.#strokePath(color, width, (ctx) => {
			let down = false;
			for (const p of points) {
				if (!p) {
					down = false;
					continue;
				}
				if (down) ctx.lineTo(p.x, p.y);
				else ctx.moveTo(p.x, p.y);
				down = true;
			}
		});
	}

	#strokeSegments(segments, color, width) {
		this.#strokePath(color, width, (ctx) => {
			for (const [a, b] of segments) {
				ctx.moveTo(a.x, a.y);
				ctx.lineTo(b.x, b.y);
			}
		});
	}

	#text(
		text,
		x,
		y,
		align,
		baseline,
		{ bg = this.theme.bg, fg = this.theme.text } = {},
	) {
		const { ctx, fontSize, size } = this;
		const padding = 3;

		ctx.font = `${fontSize}px ${this.fontFamily}`;
		ctx.textAlign = align;
		ctx.textBaseline = baseline;

		const str = String(text);
		const width = ctx.measureText(str).width;
		const boxW = width + padding * 2;
		const boxH = fontSize + padding * 2;

		let boxX = x - padding;
		if (align === 'center') boxX = x - width / 2 - padding;
		else if (align === 'right') boxX = x - width - padding;

		let boxY = y - padding;
		if (baseline === 'middle') boxY = y - fontSize / 2 - padding;
		else if (baseline === 'bottom') boxY = y - fontSize - padding;

		// Shift box and text together so the box stays inside the canvas
		let dx = 0;
		if (boxX < 0) dx = -boxX;
		else if (boxX + boxW > size) dx = size - (boxX + boxW);

		let dy = 0;
		if (boxY < 0) dy = -boxY;
		else if (boxY + boxH > size) dy = size - (boxY + boxH);

		ctx.fillStyle = bg;
		ctx.fillRect(boxX + dx, boxY + dy, boxW, boxH);
		ctx.fillStyle = fg;
		ctx.fillText(str, x + dx, y + dy);
	}

	/* ---------------- grid and axis labels ---------------- */

	#drawGrid() {
		const { size } = this;
		const step = this.#niceStep();
		const { xmin, xmax, ymin, ymax } = this.#bounds();

		const colors = [
			this.theme.gridMinor,
			this.theme.gridMajor,
			this.theme.axis,
		]; // minor, major (every 5th), axis
		const level = (k) => (k === 0 ? 2 : k % 5 === 0 ? 1 : 0);

		// Draw minor first, axis last, so the axes are never covered
		for (let lv = 0; lv < 3; lv++) {
			for (
				let k = Math.ceil(xmin / step);
				k <= Math.floor(xmax / step);
				k++
			) {
				if (level(k) !== lv) continue;
				const x = this.#snap(this.#toScreen({ x: k * step, y: 0 }).x);
				this.#line(x, 0, x, size, colors[lv]);
			}
			for (
				let k = Math.ceil(ymin / step);
				k <= Math.floor(ymax / step);
				k++
			) {
				if (level(k) !== lv) continue;
				const y = this.#snap(this.#toScreen({ x: 0, y: k * step }).y);
				this.#line(0, y, size, y, colors[lv]);
			}
		}
	}

	#drawLabels() {
		const step = this.#niceStep() * 5; // label every major line
		const { xmin, xmax, ymin, ymax } = this.#bounds();
		const origin = this.#toScreen({ x: 0, y: 0 });
		const m = this.labelMargin;

		// #text clamps boxes to the canvas, so labels stick to the edge
		// when an axis is panned out of view
		for (
			let k = Math.ceil(xmin / step);
			k <= Math.floor(xmax / step);
			k++
		) {
			const x = this.#toScreen({ x: k * step, y: 0 }).x;
			this.#text(this.#fmt(k * step), x, origin.y + m, 'center', 'top');
		}
		for (
			let k = Math.ceil(ymin / step);
			k <= Math.floor(ymax / step);
			k++
		) {
			if (k === 0) continue; // the x axis already shows 0
			const y = this.#toScreen({ x: 0, y: k * step }).y;
			this.#text(this.#fmt(k * step), origin.x - m, y, 'right', 'middle');
		}
	}

	/* ---------------- hover ---------------- */

	#drawHover() {
		const { ctx, size } = this;
		const { x, y } = this.#pointer;
		const w = this.#toWorld(x, y);

		// Enough decimals to be accurate to about one pixel at this zoom
		const d = Math.max(0, Math.ceil(Math.log10(this.view.scale)));
		const f = (v) => (+v.toFixed(d)).toFixed(d); // avoids "-0.00"

		const cx = Math.floor(x) + 0.5;
		const cy = Math.floor(y) + 0.5;

		ctx.save();
		ctx.strokeStyle = this.theme.cross;
		ctx.lineWidth = 1;
		ctx.setLineDash([4, 4]);
		ctx.beginPath();
		ctx.moveTo(cx, 0);
		ctx.lineTo(cx, size);
		ctx.moveTo(0, cy);
		ctx.lineTo(size, cy);
		ctx.stroke();
		ctx.restore();

		this.#circle({ x: cx, y: cy }, 3, this.theme.tipBg);

		// Flip the tooltip near the right / top edges
		const right = x > size * 0.6;
		const top = y < 30;
		this.#text(
			`(${f(w.x)}, ${f(w.y)})`,
			x + (right ? -12 : 12),
			y + (top ? 12 : -12),
			right ? 'right' : 'left',
			top ? 'top' : 'bottom',
			{ bg: this.theme.tipBg, fg: this.theme.tipFg },
		);
	}

	/* ---------------- drawing API ---------------- */

	drawLine(start, end, color = 'red', showLabel = true) {
		this.items.push(() => {
			const a = this.#toScreen(start);
			const b = this.#toScreen(end);
			const dotRadius = 3;
			const gap = 6;
			const boxH = this.fontSize + 6;

			this.#line(a.x, a.y, b.x, b.y, color, 2);
			this.#circle(a, dotRadius, color);
			this.#circle(b, dotRadius, color);

			if (!showLabel) return;
			for (const [pt, s] of [
				[start, a],
				[end, b],
			]) {
				const visible =
					s.x >= 0 &&
					s.x <= this.size &&
					s.y >= 0 &&
					s.y <= this.size;
				if (!visible) continue;

				const above = s.y - dotRadius - gap - boxH >= 0;
				this.#text(
					`(${this.#fmt(pt.x)}, ${this.#fmt(pt.y)})`,
					s.x,
					above ? s.y - dotRadius - gap : s.y + dotRadius + gap,
					'center',
					above ? 'bottom' : 'top',
				);
			}
		});
		this.#schedule(true);
	}

	// plotFunction(x => Math.sin(x)), or plotFunction(y => y * y, { axis: "y" })
	plotFunction(fn, options = {}) {
		const opts = { axis: 'x', width: 2, ...options };
		opts.color ??= PALETTE[this.#plotCount++ % PALETTE.length];
		this.items.push(() => this.#plotExplicit(fn, opts.axis, opts));
		this.#schedule(true);
	}

	// plot("y = sin(x)")  plot("x^2 + y^2 = 25")  plot("r = 3sin(2θ)")  plot("x = 5cos(t), y = 3sin(t)")
	plot(equation, options = {}) {
		const opts = { width: 2, ...options };
		const draw = this.#compile(equation, opts); // throws on bad input, before anything is stored
		opts.color ??= PALETTE[this.#plotCount++ % PALETTE.length];
		this.items.push(draw);
		this.#schedule(true);
	}

	// Parses once, returns a function that redraws the curve for the current view
	#compile(equation, opts) {
		// Parametric: "x = ..., y = ..."
		if (equation.includes(',')) {
			const parts = equation.split(',').map((p) => p.split('='));
			if (parts.length !== 2 || parts.some((p) => p.length !== 2)) {
				throw new Error('Parametric form: "x = ..., y = ..." using t');
			}
			const side = (name) => {
				const p = parts.find((q) => q[0].trim().toLowerCase() === name);
				if (!p)
					throw new Error(
						'Parametric form needs both "x = ..." and "y = ..."',
					);
				return compileExpression(p[1], ['t']);
			};
			const fx = side('x');
			const fy = side('y');
			return () => this.#plotParametric(fx, fy, opts);
		}

		const sides = equation.split('=');
		if (sides.length !== 2)
			throw new Error('Use the form "y = ..." or "x^2 + y^2 = 25"');
		const lhs = sides[0].trim().toLowerCase();

		// Polar: "r = ..."
		if (lhs === 'r') {
			const fn = compileExpression(sides[1], ['theta']);
			return () => this.#plotPolar(fn, opts);
		}

		// Explicit: "y = f(x)" or "x = f(y)"
		if (lhs === 'x' || lhs === 'y') {
			const rhs = compileExpression(sides[1], ['x', 'y']);
			if (!rhs.uses.has(lhs)) {
				const input = lhs === 'y' ? 'x' : 'y';
				return () =>
					this.#plotExplicit((t) => rhs({ [input]: t }), input, opts);
			}
		}

		// Implicit: left - right = 0
		const left = compileExpression(sides[0], ['x', 'y']);
		const right = compileExpression(sides[1], ['x', 'y']);
		const f = (x, y) => left({ x, y }) - right({ x, y });
		return () => this.#plotImplicit(f, opts);
	}

	/* ---------------- curve renderers (re-run on every redraw) ---------------- */

	// One sample per pixel across the visible area, so detail follows the zoom
	#plotExplicit(fn, axis, { color, width }) {
		const dep = axis === 'x' ? 'y' : 'x';
		const pts = [];
		let prev = null;

		for (let s = 0; s <= this.size; s++) {
			const t =
				axis === 'x' ? this.#toWorld(s, 0).x : this.#toWorld(0, s).y;
			const v = fn(t);
			const q = Number.isFinite(v)
				? this.#toScreen(axis === 'x' ? { x: t, y: v } : { x: v, y: t })
				: null;

			if (!q || Math.abs(q[dep]) > 1e6) {
				pts.push(null);
				prev = null;
				continue;
			}
			// A jump bigger than the canvas is an asymptote (tan, 1/x), so don't connect
			if (prev && Math.abs(q[dep] - prev[dep]) > this.size)
				pts.push(null);
			pts.push(q);
			prev = q;
		}
		this.#strokeCurve(pts, color, width);
	}

	// f(x, y) = 0 via marching squares over the visible area
	#plotImplicit(f, { color, width, resolution = 3 }) {
		const n = Math.ceil(this.extent / resolution);
		const h = this.extent / n; // sample spacing in px

		const wx = [];
		const wy = [];
		for (let i = 0; i <= n; i++) {
			wx.push(this.#toWorld(i * h, 0).x);
			wy.push(this.#toWorld(0, i * h).y);
		}

		const vals = [];
		for (let j = 0; j <= n; j++) {
			const row = [];
			for (let i = 0; i <= n; i++) row.push(f(wx[i], wy[j]));
			vals.push(row);
		}

		const differs = (a, b) => a < 0 !== b < 0;
		const segments = [];

		for (let j = 0; j < n; j++) {
			for (let i = 0; i < n; i++) {
				const tl = vals[j][i],
					tr = vals[j][i + 1];
				const bl = vals[j + 1][i],
					br = vals[j + 1][i + 1];
				if (![tl, tr, bl, br].every(Number.isFinite)) continue;

				const x0 = i * h,
					x1 = x0 + h;
				const y0 = j * h,
					y1 = y0 + h;

				const pts = {};
				if (differs(tl, tr))
					pts.top = { x: x0 + (h * tl) / (tl - tr), y: y0 };
				if (differs(bl, br))
					pts.bottom = { x: x0 + (h * bl) / (bl - br), y: y1 };
				if (differs(tl, bl))
					pts.left = { x: x0, y: y0 + (h * tl) / (tl - bl) };
				if (differs(tr, br))
					pts.right = { x: x1, y: y0 + (h * tr) / (tr - br) };

				const keys = Object.keys(pts);
				if (keys.length === 2) {
					segments.push([pts[keys[0]], pts[keys[1]]]);
				} else if (keys.length === 4) {
					// Saddle: the center value decides how to pair the edges
					const c = f(
						this.#toWorld(x0 + h / 2, 0).x,
						this.#toWorld(0, y0 + h / 2).y,
					);
					if (differs(tl, c)) {
						segments.push(
							[pts.top, pts.left],
							[pts.bottom, pts.right],
						);
					} else {
						segments.push(
							[pts.top, pts.right],
							[pts.bottom, pts.left],
						);
					}
				}
			}
		}
		this.#strokeSegments(segments, color, width);
	}

	#plotPolar(fn, { color, width, range = [0, Math.PI * 4] }) {
		const [a, b] = range;
		const steps = Math.max(2, Math.round((b - a) / 0.01));
		const pts = [];
		for (let i = 0; i <= steps; i++) {
			const theta = a + ((b - a) * i) / steps;
			const r = fn({ theta });
			pts.push(
				Number.isFinite(r) && Math.abs(r) < 1e6
					? this.#toScreen({
							x: r * Math.cos(theta),
							y: r * Math.sin(theta),
						})
					: null,
			);
		}
		this.#strokeCurve(pts, color, width);
	}

	#plotParametric(fx, fy, { color, width, range = [0, Math.PI * 2] }) {
		const [a, b] = range;
		const steps = Math.max(2, Math.round((b - a) / 0.01));
		const ok = (v) => Number.isFinite(v) && Math.abs(v) < 1e6;
		const pts = [];
		for (let i = 0; i <= steps; i++) {
			const t = a + ((b - a) * i) / steps;
			const x = fx({ t });
			const y = fy({ t });
			pts.push(ok(x) && ok(y) ? this.#toScreen({ x, y }) : null);
		}
		this.#strokeCurve(pts, color, width);
	}
}

// const { Plugin, MarkdownRenderChild } = require('obsidian');

// // One instance per code block. Obsidian calls onunload when the block
// // is re-rendered or removed, so listeners and animation frames get cleaned up.
// class MathzBlock extends MarkdownRenderChild {
// 	constructor(containerEl, source) {
// 		super(containerEl);
// 		this.source = source;
// 		this.graph = null;
// 	}

// 	onload() {
// 		// One equation per line; blank lines and lines starting with # are ignored
// 		const equations = this.source
// 			.split('\n')
// 			.map((l) => l.trim())
// 			.filter((l) => l && !l.startsWith('#'));

// 		const wrap = this.containerEl.createDiv({ cls: 'mathz' });
// 		const list = wrap.createEl('ul', { cls: 'mathz-equations' });
// 		const canvas = wrap.createEl('canvas', { cls: 'mathz-canvas' });

// 		this.graph = new Graph(canvas, { cellCount: 20, cellSize: 20 }); // 400px canvas

// 		equations.forEach((eq, i) => {
// 			const color = PALETTE[i % PALETTE.length];
// 			const li = list.createEl('li');
// 			li.createSpan({ cls: 'mathz-swatch' }).style.background = color;
// 			li.createEl('code', { text: eq });

// 			try {
// 				this.graph.plot(eq, { color });
// 			} catch (err) {
// 				li.addClass('mathz-error');
// 				li.createEl('small', { text: err.message });
// 			}
// 		});

// 		this.graph.draw();
// 	}

// 	onunload() {
// 		this.graph?.destroy();
// 		this.graph = null;
// 	}
// }

// module.exports = class MathzPlugin extends Plugin {
// 	async onload() {
// 		this.registerMarkdownCodeBlockProcessor('mathz', (source, el, ctx) => {
// 			ctx.addChild(new MathzBlock(el, source));
// 		});
// 	}
// };

const { Plugin, MarkdownRenderChild } = require('obsidian');

// [theme variable, fallback]. Primary colors its bold, italics and links from these.
const PALETTE_VARS = [
	['--color-blue', '#1f77b4'],
	['--color-red', '#d62728'],
	['--color-green', '#2ca02c'],
	['--color-yellow', '#e0a800'],
	['--color-purple', '#9467bd'],
	['--color-orange', '#ff7f0e'],
];

// Resolves a CSS variable to a concrete rgb() string that canvas understands
function cssColor(el, name, fallback) {
	const raw = getComputedStyle(el).getPropertyValue(name).trim();
	const probe = document.createElement('span');
	probe.style.color = raw;
	if (!probe.style.color) probe.style.color = fallback;
	el.appendChild(probe);
	const out = getComputedStyle(probe).color;
	probe.remove();
	return out;
}

class MathzBlock extends MarkdownRenderChild {
	constructor(containerEl, source, app) {
		super(containerEl);
		this.source = source;
		this.app = app;
		this.graph = null;
		this.entries = [];
		this.colors = [];
	}

	onload() {
		const equations = this.source
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith('#'));

		const card = this.containerEl.createDiv({ cls: 'mathz' });
		const list = card
			.createDiv({ cls: 'mathz-side' })
			.createEl('ul', { cls: 'mathz-equations' });
		const stage = card.createDiv({ cls: 'mathz-stage' });
		this.canvas = stage.createEl('canvas', { cls: 'mathz-canvas' });
		const tools = stage.createDiv({ cls: 'mathz-tools' });
		stage.createDiv({
			cls: 'mathz-hint',
			text: 'drag to pan · scroll to zoom · double-click to reset',
		});

		this.graph = new Graph(this.canvas, { cellCount: 20, cellSize: 20 });

		const tool = (label, title, fn) => {
			const b = tools.createEl('button', {
				cls: 'mathz-btn',
				text: label,
				attr: { 'aria-label': title, title },
			});
			b.addEventListener('click', fn);
		};
		tool('+', 'Zoom in', () => this.graph.zoomAt(1.5));
		tool('−', 'Zoom out', () => this.graph.zoomAt(1 / 1.5));
		tool('↺', 'Reset view', () => this.graph.reset());

		// Each equation is a chip. Click it to show or hide that curve.
		this.entries = equations.map((eq, i) => {
			const [varName, fallback] = PALETTE_VARS[i % PALETTE_VARS.length];
			const li = list.createEl('li', {
				cls: 'mathz-chip',
				attr: {
					tabindex: '0',
					role: 'button',
					'aria-pressed': 'true',
					title: 'Click to show or hide',
				},
			});
			li.createSpan({ cls: 'mathz-swatch' }).style.background =
				`var(${varName}, ${fallback})`;
			li.createEl('code', { text: eq });

			const entry = { eq, i, li, hidden: false, err: null };
			const toggle = () => {
				entry.hidden = !entry.hidden;
				li.toggleClass('is-off', entry.hidden);
				li.setAttr('aria-pressed', String(!entry.hidden));
				this.rebuild();
			};
			li.addEventListener('click', toggle);
			li.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					toggle();
				}
			});
			return entry;
		});

		// Fires when the theme, light/dark mode or Style Settings change
		this.registerEvent(
			this.app.workspace.on('css-change', () => this.applyTheme()),
		);

		this.applyTheme();
		// The theme's font may finish loading after the first draw
		document.fonts.ready.then(() => this.graph && this.applyTheme());
	}

	applyTheme() {
		if (!this.graph) return;
		const el = this.canvas;
		const c = (name, fallback) => cssColor(el, name, fallback);

		this.graph.setTheme({
			fontFamily: getComputedStyle(el).fontFamily,
			bg: c('--background-secondary', '#ededed'),
			gridMinor: c('--background-modifier-border-hover', '#b3b3b3'),
			gridMajor: c('--text-faint', '#808080'),
			axis: c('--color-red', '#d62728'),
			text: c('--text-normal', '#303030'),
			tipBg: c('--text-normal', '#222222'),
			tipFg: c('--background-primary', '#ffffff'),
			cross: c('--text-muted', '#666666'),
		});

		this.colors = PALETTE_VARS.map(([name, fallback]) => c(name, fallback));
		this.rebuild();
	}

	// Re-plots every visible equation (used after theme changes and show/hide)
	rebuild() {
		const { graph } = this;
		if (!graph) return;
		graph.clear();

		for (const e of this.entries) {
			e.li.removeClass('mathz-error');
			e.err?.remove();
			e.err = null;
			if (e.hidden) continue;

			try {
				graph.plot(e.eq, {
					color: this.colors[e.i % this.colors.length],
				});
			} catch (err) {
				e.li.addClass('mathz-error');
				e.err = e.li.createEl('small', { text: err.message });
			}
		}
		graph.draw();
	}

	onunload() {
		this.graph?.destroy();
		this.graph = null;
	}
}

module.exports = class MathzPlugin extends Plugin {
	async onload() {
		this.registerMarkdownCodeBlockProcessor('mathz', (source, el, ctx) => {
			ctx.addChild(new MathzBlock(el, source, this.app));
		});
	}
};
