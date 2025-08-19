<template>
  <div class="container">
    <img v-show="localImageSrc" :src="localImageSrc" />
    <div class="input-wrapper">
      {{ addPicTitle }}
      <input @change="previewThumbnail" class="input" name="thumbnail" type="file" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps({
  imageSrc: {
    type: String,
    required: false,
    default: ''
  }
})

const emit = defineEmits(['update:imageSrc'])
const localImageSrc = ref(props.imageSrc)

const addPicTitle = computed(() =>
  localImageSrc.value.length ? 'Изменить фотографию' : 'Добавить фотографию'
)

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

<style scoped>
.container {
  position: relative;
  width: 100%;
  height: 100%;
}

.input-wrapper {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: large;
  font-weight: 900;
  text-shadow: 1px 1px #fff;
  transition: 0.4s background;
}

.input-wrapper:hover {
  background: rgba(0, 0, 0, 0.2);
}

.input {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  opacity: 0;
  cursor: pointer;
}
</style>
