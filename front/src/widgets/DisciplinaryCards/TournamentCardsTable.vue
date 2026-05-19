<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useTranslation } from 'i18next-vue'
import { RouterLink } from 'vue-router'
import { useDisciplinaryCardsStore } from '@/stores/disciplinaryCards'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { tData } from '@/lib/utils'
import type { DisciplinaryCard, DisciplinaryCardType } from '@/model'

const props = defineProps<{
  cards: DisciplinaryCard[]
  canManage: boolean
  canDelete: boolean
  mode?: 'tournament' | 'fighter'
}>()

const emit = defineEmits<{
  (e: 'changed'): void
}>()

interface CardDraft {
  type: DisciplinaryCardType
  received_at: string
  reason: string
}

const cardsStore = useDisciplinaryCardsStore()
const { i18next } = useTranslation()
const editingId = ref<number | null>(null)
const draft = reactive<CardDraft>({
  type: 'YELLOW',
  received_at: '',
  reason: ''
})
const currentLanguage = computed(() => i18next.language)

const sortedCards = computed(() =>
  [...props.cards].sort((a, b) => {
    const dateDiff = new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    return dateDiff || b.id - a.id
  })
)

const dateInputValue = (date: string) => date.slice(0, 10)

const formatDate = (date: string) => new Date(date).toLocaleDateString()

const fightLabel = (card: DisciplinaryCard) => {
  const base = `#${card.fight_number}`
  if (card.group_name) return `${base}, ${i18next.t('disciplinaryCardsGroup')} ${card.group_name}`
  if (card.is_bronze) return `${base}, ${i18next.t('tournamentPageBronzeFight')}`
  if (card.bracket_round)
    return `${base}, ${i18next.t('tournamentPageRound')} ${card.bracket_round}`
  return base
}

const opponentName = (card: DisciplinaryCard) =>
  [card.opponent_surname, card.opponent_name, card.opponent_patronymic]
    .filter((part): part is string => Boolean(part))
    .map((part) => tData(part, currentLanguage.value))
    .join(' ')

const fighterName = (card: DisciplinaryCard) =>
  [card.fighter_surname, card.fighter_name, card.fighter_patronymic]
    .filter((part): part is string => Boolean(part))
    .map((part) => tData(part, currentLanguage.value))
    .join(' ')

const isFighterMode = computed(() => props.mode === 'fighter')

const startEdit = (card: DisciplinaryCard) => {
  editingId.value = card.id
  draft.type = card.type
  draft.received_at = dateInputValue(card.received_at)
  draft.reason = card.reason
}

const cancelEdit = () => {
  editingId.value = null
}

const saveEdit = async (card: DisciplinaryCard) => {
  await cardsStore.updateCard(card.id, {
    type: draft.type,
    received_at: draft.received_at,
    reason: draft.reason
  })
  editingId.value = null
  emit('changed')
}

const deleteCard = async (card: DisciplinaryCard) => {
  await cardsStore.deleteCard(card.id, card.tournament_id)
  emit('changed')
}
</script>

<template>
  <Table>
    <TableHeader>
      <TableRow>
        <TableCell class="font-bold">{{ $t('disciplinaryCardsType') }}</TableCell>
        <TableCell v-if="isFighterMode" class="font-bold">{{
          $t('disciplinaryCardsTournament')
        }}</TableCell>
        <TableCell v-else class="font-bold">{{ $t('disciplinaryCardsFighter') }}</TableCell>
        <TableCell class="font-bold">{{ $t('disciplinaryCardsDate') }}</TableCell>
        <TableCell v-if="!isFighterMode" class="font-bold">{{
          $t('disciplinaryCardsFight')
        }}</TableCell>
        <TableCell v-if="!isFighterMode" class="font-bold">{{
          $t('disciplinaryCardsOpponent')
        }}</TableCell>
        <TableCell class="font-bold">{{ $t('disciplinaryCardsReason') }}</TableCell>
        <TableCell class="font-bold">{{ $t('disciplinaryCardsExpires') }}</TableCell>
        <TableCell v-if="canManage || canDelete" class="font-bold text-right">{{
          $t('disciplinaryCardsActions')
        }}</TableCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow v-for="card in sortedCards" :key="card.id">
        <template v-if="editingId === card.id">
          <TableCell>
            <select v-model="draft.type" class="h-8 rounded border bg-background px-2">
              <option value="YELLOW">{{ $t('disciplinaryCardsYellow') }}</option>
              <option value="RED">{{ $t('disciplinaryCardsRed') }}</option>
            </select>
          </TableCell>
          <TableCell v-if="isFighterMode">
            <RouterLink
              class="text-primary underline-offset-4 hover:underline"
              :to="{
                name: 'tournament',
                params: { id: card.tournament_id },
                query: { nomination: card.nomination_id }
              }"
            >
              {{ tData(card.tournament_name, currentLanguage) }}
            </RouterLink>
          </TableCell>
          <TableCell v-else>{{ fighterName(card) }}</TableCell>
          <TableCell>
            <input
              v-model="draft.received_at"
              type="date"
              class="h-8 rounded border bg-background px-2"
            />
          </TableCell>
          <TableCell v-if="!isFighterMode">{{ fightLabel(card) }}</TableCell>
          <TableCell v-if="!isFighterMode">{{ opponentName(card) }}</TableCell>
          <TableCell>
            <input v-model="draft.reason" class="h-8 w-full rounded border bg-background px-2" />
          </TableCell>
          <TableCell>{{ formatDate(card.expires_at) }}</TableCell>
          <TableCell class="text-right">
            <div class="flex justify-end gap-2">
              <Button size="sm" @click="saveEdit(card)">{{ $t('disciplinaryCardsSave') }}</Button>
              <Button size="sm" variant="outline" @click="cancelEdit">{{
                $t('disciplinaryCardsCancel')
              }}</Button>
            </div>
          </TableCell>
        </template>
        <template v-else>
          <TableCell>
            <span
              class="rounded px-2 py-1 text-xs font-semibold"
              :class="
                card.type === 'RED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'
              "
            >
              {{ card.type === 'RED' ? $t('disciplinaryCardsRed') : $t('disciplinaryCardsYellow') }}
            </span>
          </TableCell>
          <TableCell v-if="isFighterMode">
            <RouterLink
              class="text-primary underline-offset-4 hover:underline"
              :to="{
                name: 'tournament',
                params: { id: card.tournament_id },
                query: { nomination: card.nomination_id }
              }"
            >
              {{ tData(card.tournament_name, currentLanguage) }}
            </RouterLink>
          </TableCell>
          <TableCell v-else>{{ fighterName(card) }}</TableCell>
          <TableCell>{{ formatDate(card.received_at) }}</TableCell>
          <TableCell v-if="!isFighterMode">{{ fightLabel(card) }}</TableCell>
          <TableCell v-if="!isFighterMode">{{ opponentName(card) }}</TableCell>
          <TableCell>{{ card.reason }}</TableCell>
          <TableCell>{{ formatDate(card.expires_at) }}</TableCell>
          <TableCell v-if="canManage || canDelete" class="text-right">
            <div class="flex justify-end gap-2">
              <Button v-if="canManage" size="sm" variant="outline" @click="startEdit(card)">
                {{ $t('disciplinaryCardsEdit') }}
              </Button>
              <Button v-if="canDelete" size="sm" variant="destructive" @click="deleteCard(card)">
                {{ $t('disciplinaryCardsDelete') }}
              </Button>
            </div>
          </TableCell>
        </template>
      </TableRow>
    </TableBody>
  </Table>
</template>
