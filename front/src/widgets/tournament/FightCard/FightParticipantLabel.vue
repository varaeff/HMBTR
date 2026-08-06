<script setup lang="ts">
import { MessageCircleWarning } from 'lucide-vue-next'
import { computed } from 'vue'
import { useTranslation } from 'i18next-vue'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { CardStatusIcon, formatActiveDisciplinaryCardTitle } from '@/widgets/tournament/DisciplinaryCards'
import type { ActiveDisciplinaryCardSummary, Fighter } from '@/model'
import type { FightWarningMarker } from './types'

const props = defineProps<{
  surname: string
  fighter: Fighter
  cardTypes?: ActiveDisciplinaryCardSummary[]
  warningMarkers: FightWarningMarker[]
  warningTitle: string
  canOpenMenu: boolean
  canIssueWarning: boolean
  canRemoveWarnings: boolean
}>()

const emit = defineEmits<{
  (e: 'issue-card', fighter: Fighter): void
  (e: 'issue-warning'): void
  (e: 'remove-warning', warningIndex: number): void
}>()

const { i18next } = useTranslation()
const currentLanguage = computed(() => i18next.language)
const cardTitle = (card: ActiveDisciplinaryCardSummary) =>
  formatActiveDisciplinaryCardTitle(card, currentLanguage.value, (key) => i18next.t(key))
</script>

<template>
  <span class="inline-flex items-center gap-1">
    <ContextMenu v-if="canOpenMenu">
      <ContextMenuTrigger as-child>
        <span class="inline-flex cursor-pointer items-center gap-1">
          {{ surname }}
          <span
            v-for="card in cardTypes ?? []"
            :key="card.id"
            :title="cardTitle(card)"
            class="inline-flex"
          >
            <CardStatusIcon :type="card" :showTitle="false" />
          </span>
        </span>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem @select="emit('issue-card', props.fighter)">
          {{ $t('disciplinaryCardsIssueAction') }}
        </ContextMenuItem>
        <ContextMenuItem v-if="canIssueWarning" @select="emit('issue-warning')">
          {{ $t('fightWarningIssueAction') }}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>

    <span v-else class="inline-flex items-center gap-1">
      {{ surname }}
      <span
        v-for="card in cardTypes ?? []"
        :key="card.id"
        :title="cardTitle(card)"
        class="inline-flex"
      >
        <CardStatusIcon :type="card" :showTitle="false" />
      </span>
    </span>

    <span
      v-if="warningMarkers.length"
      class="inline-flex items-center gap-0.5 text-red-900"
      :title="warningTitle"
      data-testid="fight-warning-markers"
    >
      <template v-if="canRemoveWarnings">
        <ContextMenu v-for="marker in warningMarkers" :key="marker.id">
          <ContextMenuTrigger as-child>
            <span
              class="inline-flex cursor-pointer items-center gap-0.5"
              :title="marker.title"
              data-testid="fight-warning-marker"
            >
              <MessageCircleWarning class="h-4 w-4" aria-hidden="true" />
              <span v-if="marker.round !== undefined" class="text-xs font-bold">
                ({{ marker.round }})
              </span>
            </span>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem @select="emit('remove-warning', marker.warningIndex)">
              {{ $t('fightWarningRemoveAction') }}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </template>
      <template v-else>
        <span
          v-for="marker in warningMarkers"
          :key="marker.id"
          class="inline-flex items-center gap-0.5"
          :title="marker.title"
          data-testid="fight-warning-marker"
        >
          <MessageCircleWarning class="h-4 w-4" aria-hidden="true" />
          <span v-if="marker.round !== undefined" class="text-xs font-bold">
            ({{ marker.round }})
          </span>
        </span>
      </template>
    </span>
  </span>
</template>
