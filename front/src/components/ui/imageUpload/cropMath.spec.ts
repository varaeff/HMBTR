import { describe, expect, it } from 'vitest'
import {
  clampCropArea,
  createInitialCropArea,
  moveCropAreaByDisplayDelta,
  resizeCropAreaByDisplayDelta
} from './cropMath'
import type { CropArea, Dimensions } from './cropMath'

describe('image upload crop math', () => {
  const image: Dimensions = { width: 1200, height: 900 }
  const display: Dimensions = { width: 600, height: 450 }

  it('creates a centered max-size square crop', () => {
    expect(createInitialCropArea(image)).toEqual({
      x: 150,
      y: 0,
      size: 900
    })
  })

  it('clamps crop position and size inside the image', () => {
    expect(clampCropArea({ x: -50, y: 500, size: 1100 }, image)).toEqual({
      x: 0,
      y: 0,
      size: 900
    })
  })

  it('converts display drag deltas into image-space movement', () => {
    const crop: CropArea = { x: 150, y: 100, size: 700 }

    expect(moveCropAreaByDisplayDelta(crop, { x: 25, y: -10 }, image, display)).toEqual({
      x: 200,
      y: 80,
      size: 700
    })
  })

  it('keeps moved crop areas inside the image', () => {
    const crop: CropArea = { x: 450, y: 200, size: 700 }

    expect(moveCropAreaByDisplayDelta(crop, { x: 500, y: 500 }, image, display)).toEqual({
      x: 500,
      y: 200,
      size: 700
    })
  })

  it('resizes from a corner while preserving the opposite anchor', () => {
    const crop: CropArea = { x: 200, y: 100, size: 700 }

    expect(resizeCropAreaByDisplayDelta(crop, 'nw', { x: -50, y: -10 }, image, display)).toEqual({
      x: 100,
      y: 0,
      size: 800
    })
  })

  it('does not resize below the minimum source size', () => {
    const crop: CropArea = { x: 200, y: 100, size: 800 }

    expect(resizeCropAreaByDisplayDelta(crop, 'se', { x: -100, y: -100 }, image, display)).toEqual({
      x: 200,
      y: 100,
      size: 700
    })
  })
})
