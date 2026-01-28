<script setup lang="ts">
import { RouterView } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useApiUiStore } from '@/stores/apiUi'
import MainMenu from '@/widgets/MainMenu.vue'
import LoaderComponent from '@/widgets/LoaderComponent.vue'
import ButtonAlert from '@/widgets/ButtonAlert.vue'

const ui = useApiUiStore()
const { isLoading, error } = storeToRefs(ui)
</script>

<template>
  <MainMenu />
  <div class="main">
    <LoaderComponent v-if="isLoading" />
    <ButtonAlert
      v-if="error"
      :isError="true"
      title="Ошибка"
      :mainText="error"
      buttonText="Закрыть"
      :showInput="false"
      :buttonAction="ui.clearError"
      :closeAction="ui.clearError"
    />
    <RouterView />
  </div>
</template>

<style scoped>
.main {
  padding-top: 3rem;
  width: 100%;
  min-height: 100vh;
  background-color: antiquewhite;
  box-sizing: border-box;
}
</style>
