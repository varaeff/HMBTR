<script setup lang="ts">
import { AlertWidget } from '@/widgets/AlertWidget'
import type { TournamentBackwardConfirmation } from '@/composables/useTournamentPage'

defineProps<{
  confirmation: TournamentBackwardConfirmation | null
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const confirm = () => {
  emit('confirm')
}

const cancel = () => {
  emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <AlertWidget
      v-if="confirmation"
      class="fixed inset-0 z-99999 flex items-center justify-center"
      :isError="false"
      :title="$t('tournamentPageBackwardConfirmationTitle')"
      :mainText="confirmation.mainText"
      :showInput="false"
      :buttonAction="confirm"
      :closeAction="cancel"
      :cancelAction="cancel"
      :buttonText="$t('tournamentPageConfirmBackwardAction')"
      :cancelText="$t('fighterPageCancelButton')"
      buttonVariant="destructive"
    />
  </Teleport>
</template>
