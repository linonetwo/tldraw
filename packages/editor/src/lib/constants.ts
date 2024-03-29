import { TLCameraOptions } from './editor/types/misc-types'
import { EASINGS } from './primitives/easings'

/** @internal */
export const MAX_SHAPES_PER_PAGE = 2000
/** @internal */
export const MAX_PAGES = 40

/** @internal */
export const ANIMATION_SHORT_MS = 80
/** @internal */
export const ANIMATION_MEDIUM_MS = 320

const DEFAULT_COMMON_CAMERA_OPTIONS = {
	zoomMax: 8,
	zoomMin: 0.1,
	zoomSteps: [0.1, 0.25, 0.5, 1, 2, 4, 8],
	zoomSpeed: 1,
	panSpeed: 1,
	isLocked: false,
}

const DEFAULT_FIT_CONTAIN_CAMERA_OPTIONS = {
	bounds: { x: 0, y: 0, w: 1200, h: 800 },
	padding: [0, 0],
	origin: [0.5, 0.5],
}

/** @internal */
export const getDefaultCameraOptions = (
	cameraOptions: Partial<Exclude<TLCameraOptions, 'type'>> & { type: TLCameraOptions['type'] }
): TLCameraOptions => {
	switch (cameraOptions.type) {
		case 'infinite': {
			return {
				...DEFAULT_COMMON_CAMERA_OPTIONS,
				...cameraOptions,
			}
		}
		default: {
			return {
				...DEFAULT_COMMON_CAMERA_OPTIONS,
				...DEFAULT_FIT_CONTAIN_CAMERA_OPTIONS,
				...cameraOptions,
			}
		}
	}
}

/** @internal */
export const FOLLOW_CHASE_PROPORTION = 0.5
/** @internal */
export const FOLLOW_CHASE_PAN_SNAP = 0.1
/** @internal */
export const FOLLOW_CHASE_PAN_UNSNAP = 0.2
/** @internal */
export const FOLLOW_CHASE_ZOOM_SNAP = 0.005
/** @internal */
export const FOLLOW_CHASE_ZOOM_UNSNAP = 0.05

/** @internal */
export const DOUBLE_CLICK_DURATION = 450
/** @internal */
export const MULTI_CLICK_DURATION = 200

/** @internal */
export const COARSE_DRAG_DISTANCE = 6

/** @internal */
export const DRAG_DISTANCE = 4

/** @internal */
export const SVG_PADDING = 32

/** @internal */
export const HASH_PATTERN_ZOOM_NAMES: Record<string, string> = {}

export const HASH_PATTERN_COUNT = 6

for (let zoom = 1; zoom <= HASH_PATTERN_COUNT; zoom++) {
	HASH_PATTERN_ZOOM_NAMES[zoom + '_dark'] = `hash_pattern_zoom_${zoom}_dark`
	HASH_PATTERN_ZOOM_NAMES[zoom + '_light'] = `hash_pattern_zoom_${zoom}_light`
}

/** @internal */
export const DEFAULT_ANIMATION_OPTIONS = {
	duration: 0,
	easing: EASINGS.easeInOutCubic,
}

/** @internal */
export const CAMERA_SLIDE_FRICTION = 0.09

/** @public */
export const GRID_STEPS = [
	{ min: -1, mid: 0.15, step: 64 },
	{ min: 0.05, mid: 0.375, step: 16 },
	{ min: 0.15, mid: 1, step: 4 },
	{ min: 0.7, mid: 2.5, step: 1 },
]

/** @internal */
export const COLLABORATOR_INACTIVE_TIMEOUT = 60000

/** @internal */
export const COLLABORATOR_IDLE_TIMEOUT = 3000

/** @internal */
export const COLLABORATOR_CHECK_INTERVAL = 1200

/**
 * Negative pointer ids are reserved for internal use.
 *
 * @internal */
export const INTERNAL_POINTER_IDS = {
	CAMERA_MOVE: -10,
} as const

/** @internal */
export const CAMERA_MOVING_TIMEOUT = 64

/** @public */
export const HIT_TEST_MARGIN = 8

/** @internal */
export const EDGE_SCROLL_SPEED = 20

/** @internal */
export const EDGE_SCROLL_DISTANCE = 8

/** @internal */
export const COARSE_POINTER_WIDTH = 12

/** @internal */
export const COARSE_HANDLE_RADIUS = 20

/** @internal */
export const HANDLE_RADIUS = 12
