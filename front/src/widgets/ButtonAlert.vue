<script setup lang="ts">
import { useCommonDataStore } from '@/stores/commonData'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import InputTextComponent from '@/components/InputTextComponent.vue'

const props = defineProps<{
  isError: boolean
  title: string
  mainText: string
  showInput: boolean
  buttonAction: (event: MouseEvent) => void
  closeAction: (event: MouseEvent) => void
}>()

const commonDataStore = useCommonDataStore()
const inputData = storeToRefs(commonDataStore).alertData
const buttonDisabled = computed(() => {
  return props.showInput ? inputData.value.trim().length === 0 : false
})
</script>

<template>
  <div>
    <div class="background"></div>
    <div class="container">
      <div class="a-card a-card--compact a-card--error">
        <div class="a-card__paddings">
          <div class="iconable-block iconable-block--hide-in-mobile iconable-block--error">
            <div class="iconable-block__infographics">
              <span v-show="isError" class="iconable-block__icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70" focusable="false">
                  <path
                    d="M34.5 67C16.58 67 2 52.42 2 34.5S16.58 2 34.5 2 67 16.58 67 34.5 52.42 67 34.5 67zm0-62C18.23 5 5 18.23 5 34.5S18.23 64 34.5 64 64 50.77 64 34.5 50.77 5 34.5 5z"
                  ></path>
                  <path
                    d="M34.5 49c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM35.5 38.57h-2l-1-14c0-1.17.89-2.07 2-2.07s2 .9 2 2l-1 14.07z"
                  ></path>
                </svg>
              </span>
            </div>
            <div class="iconable-block__content">
              <div class="cta-block">
                <div class="cta-block__central">
                  <div class="cta-block__title">{{ props.title }}</div>
                  <InputTextComponent
                    v-if="props.showInput"
                    v-focus
                    class="input input--primary input--medium"
                    :placeholder="'Введите название'"
                    v-model:value="inputData"
                    @keyup.enter="props.buttonAction"
                  />
                  <div class="cta-block__content" v-html="props.mainText"></div>
                </div>
                <div class="cta-block__cta">
                  <button
                    v-focus
                    type="button"
                    class="btn btn-primary btn-medium"
                    :disabled="buttonDisabled"
                    @click="props.buttonAction"
                  >
                    OK
                  </button>
                </div>
              </div>
              <span class="alert-close-mark" @click="props.closeAction">
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M1.7929 1.7929c.3905-.3905 1.0237-.3905 1.4142 0L9 7.5858l5.7929-5.793c.3905-.3904 1.0237-.3904 1.4142 0 .3905.3906.3905 1.0238 0 1.4143L10.4142 9l5.7929 5.7929c.3905.3905.3905 1.0237 0 1.4142-.3905.3905-1.0237.3905-1.4142 0L9 10.4142l-5.7929 5.7929c-.3905.3905-1.0237.3905-1.4142 0-.3905-.3905-.3905-1.0237 0-1.4142L7.5858 9l-5.793-5.7929c-.3904-.3905-.3904-1.0237 0-1.4142z"
                  ></path>
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.background {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background-color: #000;
  opacity: 0.5;
  z-index: 199;
}
.container {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
}
</style>
