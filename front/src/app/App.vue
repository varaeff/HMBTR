<script setup lang="ts">
import { RouterView } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useApiUiStore } from '@/stores/apiUi'
import { MainMenu } from '@/components/mainMenu'
import { Loader } from '@/widgets/Loader'
import ButtonAlert from '@/widgets/ButtonAlert.vue'

const ui = useApiUiStore()
const { isLoading, error } = storeToRefs(ui)
</script>

<template>
  <MainMenu />
  <div class="w-full min-h-screen pt-12 box-border">
    <Loader v-if="isLoading" />
    <ButtonAlert
      v-if="error"
      :isError="true"
      title="Ошибка"
      :mainText="error"
      :showInput="false"
      :buttonAction="ui.clearError"
      :closeAction="ui.clearError"
    />
    <RouterView />
  </div>
</template>
