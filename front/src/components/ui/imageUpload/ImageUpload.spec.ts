import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import ImageUpload from './ImageUpload.vue'

class MockFileReader {
  result: string | ArrayBuffer | null = null
  onload: ((this: FileReader, event: ProgressEvent<FileReader>) => void) | null = null
  onerror: ((this: FileReader, event: ProgressEvent<FileReader>) => void) | null = null

  readAsDataURL() {
    this.result = 'data:image/png;base64,test'
    this.onload?.call(
      this as unknown as FileReader,
      new ProgressEvent('load') as ProgressEvent<FileReader>
    )
  }
}

class MockImage {
  naturalWidth = 1000
  naturalHeight = 800
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  private currentSrc = ''

  set src(value: string) {
    this.currentSrc = value
    this.onload?.()
  }

  get src() {
    return this.currentSrc
  }
}

const createI18n = async () => {
  const instance = i18next.createInstance()
  await instance.init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        translation: {
          addPhoto: 'Add photo',
          changePhoto: 'Change photo',
          imageUploadCropTitle: 'Adjust photo crop',
          imageUploadCropCancel: 'Cancel',
          imageUploadCropApply: 'Apply crop',
          imageUploadResizeCrop: 'Resize crop area',
          imageUploadMinResolution: 'Image resolution must be at least 400 by 400 pixels.',
          imageUploadProcessingError: 'Could not process image.'
        }
      }
    }
  })

  return instance
}

describe('ImageUpload', () => {
  beforeEach(() => {
    vi.stubGlobal('FileReader', MockFileReader)
    vi.stubGlobal('Image', MockImage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens a crop dialog for a valid image and does not emit when cancelled', async () => {
    const i18n = await createI18n()
    const wrapper = mount(ImageUpload, {
      global: {
        plugins: [[I18NextVue, { i18next: i18n }]],
        stubs: {
          Dialog: {
            props: {
              open: {
                type: Boolean,
                default: false
              }
            },
            template: '<div v-if="open"><slot /></div>'
          },
          DialogContent: {
            template: '<section><slot /></section>'
          },
          DialogFooter: {
            template: '<footer><slot /></footer>'
          },
          DialogHeader: {
            template: '<header><slot /></header>'
          },
          DialogTitle: {
            template: '<h2><slot /></h2>'
          },
          Button: {
            emits: ['click'],
            template: '<button type="button" @click="$emit(\'click\', $event)"><slot /></button>'
          }
        }
      }
    })

    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [new File(['content'], 'fighter.png', { type: 'image/png' })],
      configurable: true
    })

    await input.trigger('change')
    await flushPromises()

    expect(wrapper.text()).toContain('Adjust photo crop')

    const cancelButton = wrapper
      .findAll('button')
      .find((buttonWrapper) => buttonWrapper.text() === 'Cancel')

    expect(cancelButton).toBeDefined()
    await cancelButton?.trigger('click')

    expect(wrapper.emitted('update:imageSrc')).toBeUndefined()
    expect(wrapper.text()).not.toContain('Adjust photo crop')
  })
})
