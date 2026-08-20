<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTranslation } from 'i18next-vue'
import { tData } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CardStatusIcon, formatActiveDisciplinaryCardTitle } from '@/widgets/tournament/DisciplinaryCards'
import WithdrawalStatusIcon from '@/widgets/tournament/WithdrawalStatusIcon.vue'
import type { NominationCompetitor } from '@/model'
import type { ActiveCardTypes } from '@/widgets/tournament/types'

const props = defineProps<{
  competitors: NominationCompetitor[]
  activeTab: number
  isOpen: boolean
  hasBlocks: boolean
  hasAccess: boolean
  canCloseRegistration?: boolean
  canDeleteNomination?: boolean
  closeRegistrationHint?: string
  activeCardTypes?: ActiveCardTypes
}>()

const emit = defineEmits<{
  (e: 'close'): Promise<void> | void
  (e: 'remove-competitor', fighterId: number): Promise<void> | void
  (e: 'no-show-competitor', competitorId: number): Promise<void> | void
  (e: 'delete-nomination'): Promise<void> | void
}>()

const { i18next } = useTranslation()

const isPending = ref(false)
const currentLanguage = computed(() => i18next.language)

const localizedData = (text?: string) => tData(text ?? '', currentLanguage.value)
const cardTitle = (card: NonNullable<ActiveCardTypes[number]>[number]) =>
  formatActiveDisciplinaryCardTitle(card, currentLanguage.value, (key) => i18next.t(key))

const handleClose = async () => {
  try {
    isPending.value = true
    await emit('close')
  } finally {
    isPending.value = false
  }
}

const showCloseBtn = computed(() => {
  return props.competitors.length > 2 && props.hasAccess && props.isOpen
})
const isCloseRegistrationDisabled = computed(
  () => isPending.value || props.canCloseRegistration === false
)

const removeCompetitor = async (fighterId: number) => {
  try {
    isPending.value = true
    await emit('remove-competitor', fighterId)
  } finally {
    isPending.value = false
  }
}

const markNoShow = async (competitorId: number) => {
  try {
    isPending.value = true
    await emit('no-show-competitor', competitorId)
  } finally {
    isPending.value = false
  }
}

const deleteNomination = async () => {
  try {
    isPending.value = true
    await emit('delete-nomination')
  } finally {
    isPending.value = false
  }
}
</script>

<template>
  <div
    v-if="!competitors.length && props.canDeleteNomination"
    class="flex justify-center"
  >
    <Button
      :disabled="isPending"
      variant="destructive"
      size="sm"
      @click="deleteNomination"
    >
      {{ $t('tournamentPageDeleteNominationButton') }}
    </Button>
  </div>

  <div v-else class="flex flex-col gap-2">
    <div
      v-for="(competitor, index) in competitors"
      :key="competitor.id"
      class="flex flex-col gap-1 p-1 border rounded-md"
    >
      <div class="flex justify-between items-center">
        <div class="flex gap-2">
          <div class="inline-flex items-center gap-1">
            {{ index + 1 }}. {{ localizedData(competitor.surname) }}
            {{ localizedData(competitor.name) }}
            <span
              v-for="card in activeCardTypes?.[competitor.id] ?? []"
              :key="card.id"
              :title="cardTitle(card)"
              class="inline-flex"
            >
              <CardStatusIcon :type="card" :showTitle="false" />
            </span>
            <WithdrawalStatusIcon :withdrawal="competitor.withdrawal" />
          </div>
          <div class="text-muted-foreground">
            {{ localizedData(competitor.city) }} {{ localizedData(competitor.club) }}
          </div>
        </div>

        <Button
          v-if="hasAccess && isOpen"
          :disabled="isPending"
          variant="outline"
          size="sm"
          @click="removeCompetitor(competitor.id)"
        >
          {{ $t('tournamentPageRemoveCompetitorButton') }}
        </Button>
        <Button
          v-else-if="hasAccess && !isOpen && !hasBlocks && !competitor.withdrawal"
          :disabled="isPending"
          variant="outline"
          size="sm"
          @click="markNoShow(competitor.competitorId)"
        >
          {{ $t('fighterWithdrawalNoShowButton') }}
        </Button>
      </div>
    </div>
  </div>

  <div class="flex justify-end">
    <span
      v-if="showCloseBtn"
      class="mt-4 inline-flex"
      :title="props.canCloseRegistration === false ? props.closeRegistrationHint : undefined"
    >
      <Button
        :disabled="isCloseRegistrationDisabled"
        @click="handleClose"
        variant="destructive"
        size="sm"
      >
        {{ $t('tournamentPageCloseRegistrationButton') }}
      </Button>
    </span>
  </div>
  <div v-if="!props.isOpen && !props.hasBlocks" class="flex justify-center mt-4">
    {{ $t('tournamentPageRegistrationClosed') }}
  </div>
</template>
