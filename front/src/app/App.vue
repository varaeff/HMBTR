<script setup lang="ts">
import { RouterView } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useApiUiStore } from '@/stores/apiUi'
import { useTheme } from '@/composables/useTheme'
import { MainMenu } from '@/widgets/MainMenu'
import { Loader } from '@/widgets/Loader'
import { AlertWidget } from '@/widgets/AlertWidget'

const ui = useApiUiStore()
const { isLoading, error } = storeToRefs(ui)

const { initTheme } = useTheme()
initTheme()
</script>

<template>
  <MainMenu />
  <div class="w-full min-h-screen pt-12 box-border">
    <Loader v-if="isLoading" />
    <Teleport to="body">
      <AlertWidget
        class="fixed inset-0 z-99999 flex items-center justify-center"
        style="pointer-events: auto"
        v-if="error"
        :isError="true"
        :title="$t('AlertWidgetDefaultTitle')"
        :mainText="error"
        :showInput="false"
        :buttonAction="ui.clearError"
        :closeAction="ui.clearError"
      />
    </Teleport>
    <RouterView />
  </div>
</template>
