<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useTranslation } from 'i18next-vue'

const props = defineProps({
  imageSrc: {
    type: String,
    required: false,
    default: ''
  }
})

const { t } = useTranslation()

const emit = defineEmits(['update:imageSrc'])
const localImageSrc = ref(props.imageSrc)

const addPicTitle = computed(() => (localImageSrc.value.length ? t('changePhoto') : t('addPhoto')))

const previewThumbnail = (event: Event) => {
  const input = event.target as HTMLInputElement

  if (input.files && input.files[0]) {
    const reader = new FileReader()

    reader.onload = (e) => {
      if (e.target?.result) {
        localImageSrc.value = e.target.result as string
        emit('update:imageSrc', e.target.result as string)
      }
    }

    reader.readAsDataURL(input.files[0])
  }
}

watch(
  () => props.imageSrc,
  (newValue) => {
    localImageSrc.value = newValue
  }
)
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
      />
    </div>
  </div>
</template>
