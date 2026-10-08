import { describe, expect, it } from "vitest";
import { ViewTransform } from "../../src/graph/ViewTransform";

describe("ViewTransform", () => {
	it("defaults to a 601x601 canvas centered at the origin", () => {
		const view = new ViewTransform();
		expect(view.size).toBe(601);
		expect(view.centerX).toBe(0);
		expect(view.centerY).toBe(0);
		expect(view.currentScale).toBe(30);
	});

	it("maps world origin to the canvas center", () => {
		const view = new ViewTransform();
		const screen = view.toScreen({ x: 0, y: 0 });
		expect(screen.x).toBe(300.5);
		expect(screen.y).toBe(300.5);
	});

	it("round-trips toScreen/toWorld", () => {
		const view = new ViewTransform();
		const world = { x: 3.5, y: -2.25 };
		const screen = view.toScreen(world);
		const back = view.toWorld(screen.x, screen.y);
		expect(back.x).toBeCloseTo(world.x);
		expect(back.y).toBeCloseTo(world.y);
	});

	it("flips y: increasing world y moves up the screen", () => {
		const view = new ViewTransform();
		const low = view.toScreen({ x: 0, y: 0 });
		const high = view.toScreen({ x: 0, y: 1 });
		expect(high.y).toBeLessThan(low.y);
	});

	it("computes symmetric bounds around the origin by default", () => {
		const view = new ViewTransform();
		const bounds = view.bounds();
		expect(bounds.xmin).toBeCloseTo(-bounds.xmax);
		expect(bounds.ymin).toBeCloseTo(-bounds.ymax);
		expect(bounds.xmax).toBeGreaterThan(0);
	});

	it("niceStep returns a 1/2/5 * 10^n value close to one cell", () => {
		const view = new ViewTransform();
		expect(view.niceStep()).toBe(1);
	});

	it("zoomAt keeps the anchor point fixed in world space", () => {
		const view = new ViewTransform();
		const anchor = { x: 100, y: 250 };
		const before = view.toWorld(anchor.x, anchor.y);
		view.zoomAt(2, anchor.x, anchor.y);
		const after = view.toWorld(anchor.x, anchor.y);
		expect(after.x).toBeCloseTo(before.x);
		expect(after.y).toBeCloseTo(before.y);
		expect(view.currentScale).toBe(60);
	});

	it("zoomAt clamps to minScale/maxScale", () => {
		const view = new ViewTransform({ minScale: 1, maxScale: 100 });
		view.zoomAt(0.0001);
		expect(view.currentScale).toBe(1);
		view.zoomAt(1e9);
		expect(view.currentScale).toBe(100);
	});

	it("panBy moves the view opposite to the drag delta on x and same sign flipped on y", () => {
		const view = new ViewTransform();
		view.panBy(30, 0);
		expect(view.centerX).toBeCloseTo(-1);
		view.reset();
		view.panBy(0, 30);
		expect(view.centerY).toBeCloseTo(1);
	});

	it("reset restores the initial center and scale", () => {
		const view = new ViewTransform();
		view.zoomAt(5);
		view.panBy(100, 100);
		view.reset();
		expect(view.centerX).toBe(0);
		expect(view.centerY).toBe(0);
		expect(view.currentScale).toBe(30);
	});

	it("snap rounds a screen coordinate to a pixel-centered value", () => {
		const view = new ViewTransform();
		expect(view.snap(10.2)).toBe(10.5);
		expect(view.snap(10.8)).toBe(10.5);
	});

	it("fmt trims floating point noise", () => {
		const view = new ViewTransform();
		expect(view.fmt(0.1 + 0.2)).toBe("0.3");
	});
});
