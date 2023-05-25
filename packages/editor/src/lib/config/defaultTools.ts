import { StateNodeConstructor } from '../app/statechart/StateNode'
import { TLArrowTool } from '../app/statechart/TLArrowTool/TLArrowTool'
import { TLDrawTool } from '../app/statechart/TLDrawTool/TLDrawTool'
import { TLEraserTool } from '../app/statechart/TLEraserTool/TLEraserTool'
import { TLFrameTool } from '../app/statechart/TLFrameTool/TLFrameTool'
import { TLGeoTool } from '../app/statechart/TLGeoTool/TLGeoTool'
import { TLHandTool } from '../app/statechart/TLHandTool/TLHandTool'
import { TLLaserTool } from '../app/statechart/TLLaserTool/TLLaserTool'
import { TLLineTool } from '../app/statechart/TLLineTool/TLLineTool'
import { TLNoteTool } from '../app/statechart/TLNoteTool/TLNoteTool'
import { TLSelectTool } from '../app/statechart/TLSelectTool/TLSelectTool'
import { TLTextTool } from '../app/statechart/TLTextTool/TLTextTool'
import { TLZoomTool } from '../app/statechart/TLZoomTool/TLZoomTool'

/** @public */
export const DEFAULT_TOOLS: StateNodeConstructor[] = [
	TLLaserTool,
	TLDrawTool,
	TLTextTool,
	TLLineTool,
	TLArrowTool,
	TLGeoTool,
	TLNoteTool,
	TLFrameTool,
	TLSelectTool,
	TLHandTool,
	TLEraserTool,
	TLZoomTool,
]