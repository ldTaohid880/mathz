import { addDomListener } from '../core/DomListener';
import { DisposableStore } from '../core/DisposableStore';
import { IDisposable } from '../core/IDisposable';
import type { ScreenPoint, ViewTransform } from './ViewTransform';

/**
 * Binds pointer/wheel/dblclick input on the graph canvas and translates it
 * into pan/zoom/reset operations on a {@link ViewTransform}, plus tracks
 * hover/drag state for the render loop and {@link HoverOverlay}.
 *
 * Exact port of `Graph#bindEvents`/`#eventPoint`, using `DisposableStore`
 * instead of a raw `AbortController` for listener cleanup.
 */
export class InteractionController implements IDisposable {
	private readonly store = new DisposableStore();
	private dragStart: ScreenPoint | null = null;
	private pointerPos: ScreenPoint | null = null;

	/**
	 * @param canvas The graph's canvas element.
	 * @param view The view transform to pan/zoom/reset.
	 * @param schedule Repaint scheduler: `true` when the scene changed
	 *   (pan/zoom/reset), `false` for a hover-only redraw.
	 */
	public constructor(
		private readonly canvas: HTMLCanvasElement,
		private readonly view: ViewTransform,
		private readonly schedule: (sceneChanged: boolean) => void,
	) {
		this.bind();
	}

	/** Current pointer position in canvas pixels, or `null` if the pointer has left. */
	public get pointer(): ScreenPoint | null {
		return this.pointerPos;
	}

	/** Whether the canvas is currently being panned via a pointer drag. */
	public get isDragging(): boolean {
		return this.dragStart !== null;
	}

	public dispose(): void {
		this.store.dispose();
	}

	private eventPoint(e: { clientX: number; clientY: number }): ScreenPoint {
		const r = this.canvas.getBoundingClientRect();
		const scaleX = r.width > 0 ? this.view.size / r.width : 1;
		const scaleY = r.height > 0 ? this.view.size / r.height : 1;
		return {
			x: (e.clientX - r.left) * scaleX,
			y: (e.clientY - r.top) * scaleY,
		};
	}

	private bind(): void {
		const { canvas, store } = this;

		canvas.style.cursor = 'crosshair';

		store.add(
			addDomListener(canvas, 'pointerdown', (e) => {
				if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') {
					return;
				}
				canvas.setPointerCapture(e.pointerId);
				this.dragStart = this.eventPoint(e);
				canvas.style.cursor = 'grabbing';
			}),
		);

		store.add(
			addDomListener(canvas, 'pointermove', (e) => {
				if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') {
					return;
				}
				const p = this.eventPoint(e);
				this.pointerPos = p;
				if (this.dragStart) {
					this.view.panBy(p.x - this.dragStart.x, p.y - this.dragStart.y);
					this.dragStart = p;
					this.schedule(true);
				} else {
					this.schedule(false); // hover only, scene is unchanged
				}
			}),
		);

		const endDrag = (e?: PointerEvent): void => {
			if (e && e.pointerType !== 'mouse' && e.pointerType !== 'pen') {
				return;
			}
			this.dragStart = null;
			canvas.style.cursor = 'crosshair';
		};
		store.add(addDomListener(canvas, 'pointerup', endDrag));
		store.add(addDomListener(canvas, 'pointercancel', endDrag));

		store.add(
			addDomListener(canvas, 'pointerleave', () => {
				this.pointerPos = null;
				this.schedule(false);
			}),
		);

		store.add(
			addDomListener(
				canvas,
				'wheel',
				(e) => {
					if (!e.ctrlKey && !e.metaKey) {
						return;
					}
					e.preventDefault();
					const p = this.eventPoint(e);
					const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
					this.view.zoomAt(Math.exp(-dy * 0.0015), p.x, p.y);
					this.schedule(true);
				},
				{ passive: false },
			),
		);

		store.add(
			addDomListener(canvas, 'dblclick', () => {
				this.view.reset();
				this.schedule(true);
			}),
		);
	}
}
