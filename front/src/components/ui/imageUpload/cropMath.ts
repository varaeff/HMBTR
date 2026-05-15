export const MIN_CROP_SIZE = 700

export type CropHandle = 'nw' | 'ne' | 'sw' | 'se'

export interface CropArea {
  x: number
  y: number
  size: number
}

export interface Dimensions {
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const createInitialCropArea = (
  image: Dimensions,
  minSize = MIN_CROP_SIZE
): CropArea => {
  const size = Math.max(minSize, Math.min(image.width, image.height))

  return clampCropArea(
    {
      x: Math.floor((image.width - size) / 2),
      y: Math.floor((image.height - size) / 2),
      size
    },
    image,
    minSize
  )
}

export const clampCropArea = (
  crop: CropArea,
  image: Dimensions,
  minSize = MIN_CROP_SIZE
): CropArea => {
  const maxSize = Math.min(image.width, image.height)
  const size = clamp(crop.size, Math.min(minSize, maxSize), maxSize)

  return {
    x: clamp(crop.x, 0, image.width - size),
    y: clamp(crop.y, 0, image.height - size),
    size
  }
}

export const toImageDelta = (
  displayDelta: Point,
  image: Dimensions,
  display: Dimensions
): Point => ({
  x: display.width ? (displayDelta.x * image.width) / display.width : 0,
  y: display.height ? (displayDelta.y * image.height) / display.height : 0
})

export const moveCropAreaByDisplayDelta = (
  crop: CropArea,
  displayDelta: Point,
  image: Dimensions,
  display: Dimensions,
  minSize = MIN_CROP_SIZE
): CropArea => {
  const imageDelta = toImageDelta(displayDelta, image, display)

  return clampCropArea(
    {
      ...crop,
      x: crop.x + imageDelta.x,
      y: crop.y + imageDelta.y
    },
    image,
    minSize
  )
}

export const resizeCropAreaByDisplayDelta = (
  crop: CropArea,
  handle: CropHandle,
  displayDelta: Point,
  image: Dimensions,
  display: Dimensions,
  minSize = MIN_CROP_SIZE
): CropArea => {
  const imageDelta = toImageDelta(displayDelta, image, display)
  const horizontalDelta = handle.includes('w') ? -imageDelta.x : imageDelta.x
  const verticalDelta = handle.includes('n') ? -imageDelta.y : imageDelta.y
  const sizeDelta =
    Math.abs(horizontalDelta) >= Math.abs(verticalDelta) ? horizontalDelta : verticalDelta

  if (handle === 'se') {
    const size = clamp(crop.size + sizeDelta, minSize, Math.min(image.width - crop.x, image.height - crop.y))

    return { ...crop, size }
  }

  if (handle === 'sw') {
    const right = crop.x + crop.size
    const size = clamp(crop.size + sizeDelta, minSize, Math.min(right, image.height - crop.y))

    return {
      x: right - size,
      y: crop.y,
      size
    }
  }

  if (handle === 'ne') {
    const bottom = crop.y + crop.size
    const size = clamp(crop.size + sizeDelta, minSize, Math.min(image.width - crop.x, bottom))

    return {
      x: crop.x,
      y: bottom - size,
      size
    }
  }

  const right = crop.x + crop.size
  const bottom = crop.y + crop.size
  const size = clamp(crop.size + sizeDelta, minSize, Math.min(right, bottom))

  return {
    x: right - size,
    y: bottom - size,
    size
  }
}
