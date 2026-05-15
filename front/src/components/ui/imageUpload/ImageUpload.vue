<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { useTranslation } from 'i18next-vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  createInitialCropArea,
  moveCropAreaByDisplayDelta,
  resizeCropAreaByDisplayDelta
} from './cropMath'
import type { CropArea, CropHandle, Dimensions, Point } from './cropMath'

const OUTPUT_SIZE = 700

interface CropInteraction {
  kind: 'move' | 'resize'
  handle?: CropHandle
  pointerId: number
  startPoint: Point
  startCrop: CropArea
  display: Dimensions
}

const props = withDefaults(
  defineProps<{
    imageSrc?: string
  }>(),
  {
    imageSrc: ''
  }
)

const { t } = useTranslation()

const emit = defineEmits<{
  'update:imageSrc': [imageSrc: string]
}>()

const localImageSrc = ref(props.imageSrc)
const errorMessage = ref('')
const isProcessing = ref(false)
const isCropDialogOpen = ref(false)
const pendingImage = ref<HTMLImageElement | null>(null)
const pendingImageSrc = ref('')
const cropImageElement = ref<HTMLImageElement | null>(null)
const cropArea = ref<CropArea | null>(null)
const interaction = ref<CropInteraction | null>(null)

const addPicTitle = computed(() => (localImageSrc.value.length ? t('changePhoto') : t('addPhoto')))

const pendingImageDimensions = computed<Dimensions | null>(() => {
  if (!pendingImage.value) return null

  return {
    width: pendingImage.value.naturalWidth,
    height: pendingImage.value.naturalHeight
  }
})

const cropSelectionStyle = computed<CSSProperties>(() => {
  if (!cropArea.value || !pendingImageDimensions.value) return {}

  return {
    left: `${(cropArea.value.x / pendingImageDimensions.value.width) * 100}%`,
    top: `${(cropArea.value.y / pendingImageDimensions.value.height) * 100}%`,
    width: `${(cropArea.value.size / pendingImageDimensions.value.width) * 100}%`,
    height: `${(cropArea.value.size / pendingImageDimensions.value.height) * 100}%`,
    boxShadow: '0 0 0 9999px rgb(0 0 0 / 45%)'
  }
})

const readImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const image = new Image()

      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = typeof reader.result === 'string' ? reader.result : ''
    }

    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const canvasToDataUrl = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<string>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(canvas.toDataURL(type, quality))
          return
        }

        const reader = new FileReader()
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
        reader.readAsDataURL(blob)
      },
      type,
      quality
    )
  })

const renderCrop = async (image: HTMLImageElement, crop: CropArea) => {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error(t('imageUploadProcessingError'))
  }

  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.size,
    crop.size,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  )

  const candidates = await Promise.all([
    canvasToDataUrl(canvas, 'image/webp', 0.72),
    canvasToDataUrl(canvas, 'image/jpeg', 0.78)
  ])

  return candidates.reduce((smallest, current) =>
    current.length < smallest.length ? current : smallest
  )
}

const stopInteraction = () => {
  window.removeEventListener('pointermove', updateInteraction)
  window.removeEventListener('pointerup', stopInteraction)
  window.removeEventListener('pointercancel', stopInteraction)
  interaction.value = null
}

const getDisplayDimensions = (): Dimensions | null => {
  if (!cropImageElement.value) return null

  const rect = cropImageElement.value.getBoundingClientRect()
  if (!rect.width || !rect.height) return null

  return {
    width: rect.width,
    height: rect.height
  }
}

function updateInteraction(event: PointerEvent) {
  if (!interaction.value || !pendingImageDimensions.value) return
  if (event.pointerId !== interaction.value.pointerId) return

  const displayDelta = {
    x: event.clientX - interaction.value.startPoint.x,
    y: event.clientY - interaction.value.startPoint.y
  }

  cropArea.value =
    interaction.value.kind === 'move'
      ? moveCropAreaByDisplayDelta(
          interaction.value.startCrop,
          displayDelta,
          pendingImageDimensions.value,
          interaction.value.display
        )
      : resizeCropAreaByDisplayDelta(
          interaction.value.startCrop,
          interaction.value.handle ?? 'se',
          displayDelta,
          pendingImageDimensions.value,
          interaction.value.display
        )
}

const startInteraction = (event: PointerEvent, kind: 'move' | 'resize', handle?: CropHandle) => {
  if (!cropArea.value) return

  const display = getDisplayDimensions()
  if (!display) return

  stopInteraction()
  interaction.value = {
    kind,
    handle,
    pointerId: event.pointerId,
    startPoint: {
      x: event.clientX,
      y: event.clientY
    },
    startCrop: { ...cropArea.value },
    display
  }
  window.addEventListener('pointermove', updateInteraction)
  window.addEventListener('pointerup', stopInteraction)
  window.addEventListener('pointercancel', stopInteraction)
}

const startMove = (event: PointerEvent) => {
  startInteraction(event, 'move')
}

const startResize = (event: PointerEvent, handle: CropHandle) => {
  startInteraction(event, 'resize', handle)
}

const clearPendingCrop = () => {
  stopInteraction()
  isCropDialogOpen.value = false
  pendingImage.value = null
  pendingImageSrc.value = ''
  cropArea.value = null
}

const cancelCrop = () => {
  clearPendingCrop()
}

const handleCropDialogOpenChange = (open: boolean) => {
  if (!open) {
    cancelCrop()
  }
}

const confirmCrop = async () => {
  if (!pendingImage.value || !cropArea.value) return

  errorMessage.value = ''
  isProcessing.value = true

  try {
    const imageSrc = await renderCrop(pendingImage.value, cropArea.value)
    localImageSrc.value = imageSrc
    emit('update:imageSrc', imageSrc)
    clearPendingCrop()
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t('imageUploadProcessingError')
  } finally {
    isProcessing.value = false
  }
}

const previewThumbnail = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  errorMessage.value = ''
  isProcessing.value = true

  try {
    const image = await readImage(file)

    if (image.naturalWidth < OUTPUT_SIZE || image.naturalHeight < OUTPUT_SIZE) {
      throw new Error(t('imageUploadMinResolution'))
    }

    pendingImage.value = image
    pendingImageSrc.value = image.src
    cropArea.value = createInitialCropArea({
      width: image.naturalWidth,
      height: image.naturalHeight
    })
    isCropDialogOpen.value = true
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t('imageUploadProcessingError')
  } finally {
    input.value = ''
    isProcessing.value = false
  }
}

watch(
  () => props.imageSrc,
  (newValue) => {
    localImageSrc.value = newValue
  }
)

onBeforeUnmount(stopInteraction)
</script>

<template>
  <div
    class="relative"
    :class="localImageSrc ? 'inline-block max-w-full max-h-full' : 'w-full h-full'"
  >
    <img
      v-show="localImageSrc"
      :src="localImageSrc"
      class="block max-w-full max-h-full object-contain"
    />
    <div
      class="absolute inset-0 flex justify-center items-center text-lg font-black transition-[background] duration-400 [text-shadow:1px_1px_#fff] hover:bg-[rgba(0,0,0,0.2)]"
    >
      {{ addPicTitle }}
      <input
        @change="previewThumbnail"
        class="absolute inset-0 opacity-0 cursor-pointer"
        name="thumbnail"
        type="file"
        accept="image/*"
        :disabled="isProcessing"
      />
    </div>
    <p v-if="errorMessage" class="mt-2 text-sm font-medium text-destructive">
      {{ errorMessage }}
    </p>
  </div>

  <Dialog :open="isCropDialogOpen" @update:open="handleCropDialogOpenChange">
    <DialogContent class="sm:max-w-3xl" :show-close-button="false">
      <DialogHeader>
        <DialogTitle>{{ t('imageUploadCropTitle') }}</DialogTitle>
      </DialogHeader>

      <div class="overflow-hidden rounded-md border bg-black">
        <div
          class="relative mx-auto w-fit max-h-[65vh] max-w-full touch-none select-none overflow-hidden"
        >
          <img
            v-if="pendingImageSrc"
            ref="cropImageElement"
            :src="pendingImageSrc"
            :alt="t('imageUploadCropTitle')"
            class="block max-h-[65vh] max-w-full object-contain"
            draggable="false"
          />
          <div
            v-if="cropArea"
            class="absolute border-2 border-white bg-white/5 cursor-move touch-none"
            :style="cropSelectionStyle"
            @pointerdown.prevent="startMove"
          >
            <div class="absolute inset-0 border border-black/30" />
            <button
              type="button"
              class="absolute -left-2 -top-2 size-4 rounded-full border border-black bg-white cursor-nwse-resize"
              :aria-label="t('imageUploadResizeCrop')"
              @pointerdown.prevent.stop="startResize($event, 'nw')"
            />
            <button
              type="button"
              class="absolute -right-2 -top-2 size-4 rounded-full border border-black bg-white cursor-nesw-resize"
              :aria-label="t('imageUploadResizeCrop')"
              @pointerdown.prevent.stop="startResize($event, 'ne')"
            />
            <button
              type="button"
              class="absolute -left-2 -bottom-2 size-4 rounded-full border border-black bg-white cursor-nesw-resize"
              :aria-label="t('imageUploadResizeCrop')"
              @pointerdown.prevent.stop="startResize($event, 'sw')"
            />
            <button
              type="button"
              class="absolute -right-2 -bottom-2 size-4 rounded-full border border-black bg-white cursor-nwse-resize"
              :aria-label="t('imageUploadResizeCrop')"
              @pointerdown.prevent.stop="startResize($event, 'se')"
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" :disabled="isProcessing" @click="cancelCrop">
          {{ t('imageUploadCropCancel') }}
        </Button>
        <Button type="button" :disabled="isProcessing" @click="confirmCrop">
          {{ t('imageUploadCropApply') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
