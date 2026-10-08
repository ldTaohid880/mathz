
import type { ICurveRenderer, CurveStyle } from "./ICurveRenderer";
import type { RenderContext } from "../RenderContext";
import type { ViewTransform } from "../ViewTransform";

import type { FunctionStatement } from "../../statements/Statement";

export class FunctionDefinitionRenderer implements ICurveRenderer<FunctionStatement> {
	public render(_statement: FunctionStatement, _view: ViewTransform, _rc: RenderContext, _style: CurveStyle): void {
		// no-op
	}
}
