<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useTranslation } from 'i18next-vue'
import { RouterLink } from 'vue-router'
import { Save, SquarePen, SquareX, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableHeader, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { tData } from '@/lib/utils'
import type { DisciplinaryCard, DisciplinaryCardType, TournamentMarshal } from '@/model'
import type {
  DeleteDisciplinaryCardAction,
  UpdateDisciplinaryCardAction
} from '@/widgets/tournament/types'
import CardStatusIcon from './CardStatusIcon.vue'

const props = defineProps<{
  cards: DisciplinaryCard[]
  canManage: boolean
  canDelete: boolean
  updateCard: UpdateDisciplinaryCardAction
  deleteCard: DeleteDisciplinaryCardAction
  mode?: 'tournament' | 'fighter'
  tournamentMarshals?: TournamentMarshal[]
  tournamentMarshalsByTournamentId?: Record<number, TournamentMarshal[]>
}>()

const emit = defineEmits<{
  (e: 'changed'): void
}>()

interface CardDraft {
  type: DisciplinaryCardType
  reason: string
  marshal_id: number
  expires_at: string
  initial_expires_at: string
  active: boolean
}

const { i18next } = useTranslation()
const editingId = ref<number | null>(null)
const draft = reactive<CardDraft>({
  type: 'YELLOW',
  reason: '',
  marshal_id: 0,
  expires_at: '',
  initial_expires_at: '',
  active: true
})
const currentLanguage = computed(() => i18next.language)

const sortedCards = computed(() =>
  [...props.cards].sort((a, b) => {
    const dateDiff = new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    return dateDiff || b.id - a.id
  })
)
const showInactiveCards = ref(false)
const hasInactiveCards = computed(() => props.cards.some((card) => !card.active))
const visibleCards = computed(() =>
  showInactiveCards.value ? sortedCards.value : sortedCards.value.filter((card) => card.active)
)

const dateInputValue = (date: string) => date.slice(0, 10)

const formatDate = (date: string) => new Date(date).toLocaleDateString()

const fightLabel = (card: DisciplinaryCard) => `#${card.fight_number}`

const nominationName = (card: DisciplinaryCard) =>
  currentLanguage.value === 'ru'
    ? card.nomination_name_ru
    : tData(card.nomination_name_en, currentLanguage.value)

const initials = (name: string, patronymic: string | null) =>
  [name, patronymic]
    .filter((part): part is string => Boolean(part))
    .map((part) => `${tData(part, currentLanguage.value).slice(0, 1)}.`)
    .join('')

const personInitials = (surname: string, name: string, patronymic: string | null) =>
  `${tData(surname, currentLanguage.value)} ${initials(name, patronymic)}`

const fighterName = (card: DisciplinaryCard) =>
  personInitials(card.fighter_surname, card.fighter_name, card.fighter_patronymic)

const marshalName = (card: DisciplinaryCard) =>
  personInitials(card.marshal_surname, card.marshal_name, card.marshal_patronymic)

const marshalLabel = (item: TournamentMarshal) =>
  `${tData(item.marshal.surname, currentLanguage.value)} ${tData(
    item.marshal.name,
    currentLanguage.value
  )}`

const cardTournamentMarshals = (card: DisciplinaryCard) =>
  props.tournamentMarshals ??
  props.tournamentMarshalsByTournamentId?.[card.tournament_id] ??
  []

const reasonText = (reason: string) => {
  const translationKey = `disciplinaryCardsReason${reason}`
  const translated = i18next.t(translationKey)

  return translated === translationKey ? reason : translated
}

const isFighterMode = computed(() => props.mode === 'fighter')
const canDeleteCard = (card: DisciplinaryCard) => props.canDelete && card.can_delete
const isAutomaticCard = (card: DisciplinaryCard) => card.source === 'AUTOMATIC'
const canEditCard = (card: DisciplinaryCard) =>
  props.canManage && card.can_manage && (!isAutomaticCard(card) || isFighterMode.value)
const canShowActions = computed(() =>
  visibleCards.value.some((card) => canEditCard(card) || canDeleteCard(card))
)
const activeValueForSave = (card: DisciplinaryCard) =>
  draft.type === 'RED' ? draft.active : card.type === 'YELLOW' ? card.active : true
const resultFieldPayload = (card: DisciplinaryCard) =>
  card.can_change_result_fields
    ? {
        type: draft.type,
        active: activeValueForSave(card)
      }
    : {}
const canEditExpiration = (card: DisciplinaryCard) =>
  isFighterMode.value && !(card.type === 'YELLOW' && card.expires_at_locked)
const toggleDraftType = () => {
  draft.type = draft.type === 'YELLOW' ? 'RED' : 'YELLOW'
}

const startEdit = (card: DisciplinaryCard) => {
  editingId.value = card.id
  draft.type = card.type
  draft.reason = card.reason
  draft.marshal_id = card.marshal_id
  draft.expires_at = dateInputValue(card.expires_at)
  draft.initial_expires_at = draft.expires_at
  draft.active = card.active
}

const cancelEdit = () => {
  editingId.value = null
}

const saveEdit = async (card: DisciplinaryCard) => {
  if (isAutomaticCard(card)) {
    await props.updateCard(
      card.id,
      canEditExpiration(card) && draft.expires_at !== draft.initial_expires_at
        ? { expires_at: draft.expires_at }
        : {}
    )
    editingId.value = null
    emit('changed')
    return
  }

  const reasonPayload = isAutomaticCard(card) ? {} : { reason: draft.reason }
  await props.updateCard(
    card.id,
    isFighterMode.value
      ? {
          ...resultFieldPayload(card),
          ...reasonPayload,
          marshal_id: draft.marshal_id,
          ...(canEditExpiration(card) && draft.expires_at !== draft.initial_expires_at
            ? { expires_at: draft.expires_at }
            : {})
        }
      : {
          ...resultFieldPayload(card),
          ...reasonPayload,
          marshal_id: draft.marshal_id
        }
  )
  editingId.value = null
  emit('changed')
}

const deleteCard = async (card: DisciplinaryCard) => {
  await props.deleteCard(card.id)
  emit('changed')
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <label
      v-if="hasInactiveCards"
      class="flex w-fit items-center gap-2 text-sm text-muted-foreground"
    >
      <Checkbox
        :model-value="showInactiveCards"
        @update:model-value="(value) => (showInactiveCards = value === true)"
      />
      {{ $t('disciplinaryCardsShowInactive') }}
    </label>

    <Table class="w-full table-fixed">
      <TableHeader>
        <TableRow>
          <TableCell class="w-12 text-center font-bold">{{ $t('disciplinaryCardsType') }}</TableCell>
          <TableCell v-if="isFighterMode" class="font-bold">{{
            $t('disciplinaryCardsTournament')
          }}</TableCell>
          <TableCell v-else class="font-bold">{{ $t('disciplinaryCardsFighter') }}</TableCell>
          <TableCell class="font-bold">{{ $t('disciplinaryCardsMarshal') }}</TableCell>
          <TableCell v-if="isFighterMode" class="font-bold">{{
            $t('disciplinaryCardsDate')
          }}</TableCell>
          <TableCell v-else class="font-bold">{{ $t('disciplinaryCardsNomination') }}</TableCell>
          <TableCell v-if="!isFighterMode" class="font-bold">{{
            $t('disciplinaryCardsFight')
          }}</TableCell>
          <TableCell class="w-[36%] font-bold whitespace-normal">{{
            $t('disciplinaryCardsReason')
          }}</TableCell>
          <TableCell class="font-bold">{{ $t('disciplinaryCardsActive') }}</TableCell>
          <TableCell v-if="isFighterMode" class="font-bold">{{
            $t('disciplinaryCardsExpires')
          }}</TableCell>
          <TableCell v-if="canShowActions" class="font-bold text-right">{{
            $t('disciplinaryCardsActions')
          }}</TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="card in visibleCards"
          :key="card.id"
          :class="!card.active ? 'text-muted-foreground' : undefined"
        >
        <template v-if="editingId === card.id">
          <TableCell class="text-center">
            <span v-if="isAutomaticCard(card)" class="inline-flex justify-center">
              <CardStatusIcon :type="{ type: draft.type, active: draft.active }" />
            </span>
            <Button
              v-else
              size="icon-sm"
              variant="outline"
              :title="$t('disciplinaryCardsType')"
              :aria-label="$t('disciplinaryCardsType')"
              :disabled="!card.can_change_result_fields"
              @click="toggleDraftType"
            >
              <CardStatusIcon :type="{ type: draft.type, active: draft.active }" />
            </Button>
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
            <span v-if="isAutomaticCard(card)">{{ marshalName(card) }}</span>
            <select
              v-else
              v-model.number="draft.marshal_id"
              class="h-8 w-full rounded border bg-background px-2"
              data-testid="disciplinary-card-marshal-select"
            >
              <option
                v-for="item in cardTournamentMarshals(card)"
                :key="item.marshal_id"
                :value="item.marshal_id"
              >
                {{ marshalLabel(item) }}
              </option>
            </select>
          </TableCell>
          <TableCell v-if="isFighterMode">
            <input
              :value="dateInputValue(card.received_at)"
              type="date"
              disabled
              class="h-8 rounded border bg-muted px-2"
            />
          </TableCell>
          <TableCell v-else>{{ nominationName(card) }}</TableCell>
          <TableCell v-if="!isFighterMode">{{ fightLabel(card) }}</TableCell>
          <TableCell class="min-w-0 whitespace-normal" data-testid="disciplinary-card-reason">
            <span v-if="isAutomaticCard(card)" class="text-sm text-muted-foreground">
              {{ reasonText(card.reason) }}
            </span>
            <input v-else v-model="draft.reason" class="h-8 w-full rounded border bg-background px-2" />
          </TableCell>
          <TableCell>
            <div v-if="draft.type === 'RED' && !isAutomaticCard(card)" class="flex justify-center">
              <Checkbox
                :model-value="draft.active"
                :disabled="card.active || !card.can_change_result_fields"
                @update:model-value="(value) => (draft.active = value === true)"
              />
            </div>
          </TableCell>
          <TableCell v-if="isFighterMode">
            <input
              v-model="draft.expires_at"
              type="date"
              :disabled="!canEditExpiration(card)"
              class="h-8 rounded border px-2"
              :class="
                canEditExpiration(card)
                  ? 'bg-background'
                  : 'bg-muted text-muted-foreground'
              "
            />
          </TableCell>
          <TableCell class="text-right">
            <div class="flex justify-end gap-2">
              <Button
                size="icon-sm"
                :title="$t('disciplinaryCardsSave')"
                :aria-label="$t('disciplinaryCardsSave')"
                @click="saveEdit(card)"
              >
                <Save />
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                :title="$t('disciplinaryCardsCancel')"
                :aria-label="$t('disciplinaryCardsCancel')"
                @click="cancelEdit"
              >
                <SquareX />
              </Button>
            </div>
          </TableCell>
        </template>
        <template v-else>
          <TableCell class="text-center">
            <span class="inline-flex justify-center">
              <CardStatusIcon :type="{ type: card.type, active: card.active }" />
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
          <TableCell>{{ marshalName(card) }}</TableCell>
          <TableCell v-if="isFighterMode">{{ formatDate(card.received_at) }}</TableCell>
          <TableCell v-else>{{ nominationName(card) }}</TableCell>
          <TableCell v-if="!isFighterMode">{{ fightLabel(card) }}</TableCell>
          <TableCell
            class="min-w-0 whitespace-normal break-words"
            data-testid="disciplinary-card-reason"
          >
            {{ reasonText(card.reason) }}
          </TableCell>
          <TableCell>
            <span class="text-sm text-muted-foreground">
              {{ card.active ? $t('disciplinaryCardsActiveYes') : $t('disciplinaryCardsActiveNo') }}
            </span>
          </TableCell>
          <TableCell v-if="isFighterMode">{{ formatDate(card.expires_at) }}</TableCell>
          <TableCell v-if="canShowActions" class="text-right">
            <div class="flex justify-end gap-2">
              <Button
                v-if="canEditCard(card)"
                size="icon-sm"
                variant="outline"
                :title="$t('disciplinaryCardsEdit')"
                :aria-label="$t('disciplinaryCardsEdit')"
                @click="startEdit(card)"
              >
                <SquarePen />
              </Button>
              <Button
                v-if="canDeleteCard(card)"
                size="icon-sm"
                variant="destructive"
                :title="$t('disciplinaryCardsDelete')"
                :aria-label="$t('disciplinaryCardsDelete')"
                @click="deleteCard(card)"
              >
                <Trash2 />
              </Button>
            </div>
          </TableCell>
        </template>
      </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
