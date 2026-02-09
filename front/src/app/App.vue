<script setup lang="ts">
import { RouterView } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useApiUiStore } from '@/stores/apiUi'
import { MainMenu } from '@/components/ui/mainMenu'
import { Loader } from '@/widgets/Loader'
import { AlertWidget } from '@/widgets/AlertWidget'

const ui = useApiUiStore()
const { isLoading, error } = storeToRefs(ui)
</script>

<template>
  <MainMenu />
  <div class="w-full min-h-screen pt-12 box-border">
    <Loader v-if="isLoading" />
    <AlertWidget
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
