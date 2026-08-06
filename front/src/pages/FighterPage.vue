<script setup lang="ts">
import { ref, onMounted, computed, watchEffect, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTranslation } from 'i18next-vue'
import { useFightersListStore } from '@/stores/fightersList'
import { useAuthStore } from '@/stores/auth'
import { useDisciplinaryCardsStore } from '@/stores/disciplinaryCards'
import NoPhoto from '@/entities/NoPhoto.jpg'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ImageUpload } from '@/components/ui/imageUpload'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { AlertWidget } from '@/widgets/AlertWidget'
import { SelectLocationBlock } from '@/features/location-select'
import { FullNameWidget } from '@/features/person-name-form'
import { TournamentCardsTable } from '@/widgets/tournament/DisciplinaryCards'
import { FighterRatingChart } from '@/widgets/rating/FighterRatingChart'
import { useAddEntityAlert } from '@/composables/useAddEntityAlert'
import { useEditableEntityForm } from '@/composables/useEditableEntityForm'
import { useFighterCardMarshals } from '@/composables/useFighterCardMarshals'
import {
  useFighterProfileStats,
  type CompletedTournamentRow
} from '@/composables/useFighterProfileStats'
import type {
  Fighter,
  FighterDB,
  FighterProfileNomination,
  UpdateDisciplinaryCardPayload
} from '@/model'
import { tData } from '@/lib/utils'
import { dateToString } from '@/lib/dateUtils'
import { hasMarshalManageAccess, hasTournamentMarshalAccess } from '@/lib/checkAccess'

type Language = 'ru' | 'en'

interface FighterEditDraft extends Record<string, unknown> {
  surname: string
  name: string
  patronymic: string
  country: string
  city: string
  club: string
  country_id: number
  city_id: number
  club_id: number
  pic: string
  is_male: boolean
}

const props = defineProps<{
  id: string
}>()

const router = useRouter()
const { i18next } = useTranslation()
const fighter = ref<Fighter | null | undefined>(null)
const FightersListStore = useFightersListStore()
const authStore = useAuthStore()
const cardsStore = useDisciplinaryCardsStore()
const fighterId = computed(() => +props.id)
const { showAlert, alertData, handleRequestAdd } = useAddEntityAlert()
const {
  fighterStats,
  isStatsLoading,
  statsError,
  selectedRatingNominationId,
  completedTournamentRows,
  selectedRating,
  loadFighterStats
} = useFighterProfileStats(fighterId)
const { tournamentMarshalsByTournamentId, loadCardTournamentMarshals } =
  useFighterCardMarshals()
const initialDocumentTitle = document.title

const createFighterEditDraft = (): FighterEditDraft => ({
  surname: '',
  name: '',
  patronymic: '',
  country: '',
  city: '',
  club: '',
  country_id: 0,
  city_id: 0,
  club_id: 0,
  pic: '',
  is_male: true
})

const canEdit = computed(() => authStore.isAdmin || authStore.isOrganizer)
const fighterEditForm = useEditableEntityForm<Fighter, FighterEditDraft, FighterDB>({
  createDraft: createFighterEditDraft,
  requiredFields: ['surname', 'name', 'country', 'city'],
  fillDraft: (draft, source) => {
    draft.surname = source.surname
    draft.name = source.name
    draft.patronymic = source.patronymic ?? ''
    draft.country = source.country
    draft.city = source.city
    draft.club = source.club ?? ''
    draft.country_id = source.country_id ?? 0
    draft.city_id = source.city_id ?? 0
    draft.club_id = source.club_id ?? 0
    draft.pic = source.pic ?? ''
    draft.is_male = source.is_male ?? true
  },
  buildPayload: (draft, source) => ({
    id: source.id,
    surname: draft.surname,
    name: draft.name,
    patronymic: draft.patronymic,
    country_id: draft.country_id,
    city_id: draft.city_id,
    club_id: draft.club_id || null,
    pic: draft.pic,
    is_male: draft.is_male
  }),
  save: (source, payload) => FightersListStore.updateFighter(source.id, payload),
  canSave: () => canEdit.value
})
const editFighter = fighterEditForm.draft
const isEditing = fighterEditForm.isEditing
const buttonDisabled = fighterEditForm.buttonDisabled
const canManageCards = computed(() => hasMarshalManageAccess())
const canDeleteCards = computed(() => Boolean(hasTournamentMarshalAccess()))
const currentLanguage = computed<Language>(() => (i18next.language === 'en' ? 'en' : 'ru'))

onMounted(async () => {
  const [fetchedFighter] = await Promise.all([
    FightersListStore.showFighterDetails(fighterId.value),
    cardsStore.loadFighterCards(fighterId.value),
    loadFighterStats()
  ])
  fighter.value = fetchedFighter
  await loadCardTournamentMarshals(cardsStore.fighterCards)
})

const fullName = computed(() => {
  if (!fighter.value) return ''
  const { surname, name, patronymic } = fighter.value
  return [surname, name, patronymic].filter(Boolean).join(' ')
})

const pageTitle = computed(() => tData(fullName.value || i18next.t('fighterPageNamePage')))

watchEffect(() => {
  document.title = pageTitle.value
})

onUnmounted(() => {
  document.title = initialDocumentTitle
})

const locationLine = computed(() =>
  [fighter.value?.country, fighter.value?.city, fighter.value?.club]
    .filter((item): item is string => Boolean(item))
    .map((item) => tData(item, currentLanguage.value))
    .join(', ')
)

const nominationName = (nomination: FighterProfileNomination) =>
  tData(
    currentLanguage.value === 'en' ? nomination.name_en : nomination.name_ru,
    currentLanguage.value
  )

const formatProfileDate = (date: string | null) => dateToString(date ? new Date(date) : null)

const tournamentNominationsText = (row: CompletedTournamentRow) =>
  row.nominations.map((nomination) => nominationName(nomination)).join(', ')

const updateDisciplinaryCard = async (
  id: number,
  payload: UpdateDisciplinaryCardPayload
) => {
  return cardsStore.updateCard(id, payload)
}

const deleteDisciplinaryCard = async (id: number) => {
  await cardsStore.deleteCard(id)
}

const startEditing = () => {
  fighterEditForm.startEditing(fighter.value)
}

const cancelEditing = () => {
  fighterEditForm.cancelEditing(fighter.value)
}

const saveFighter = async () => {
  const savedFighter = await fighterEditForm.saveEntity(fighter.value)
  if (savedFighter) {
    fighter.value = savedFighter
  }
}
</script>

<template>
  <main class="w-full px-4 pb-12 pt-4">
    <div class="mx-auto max-w-6xl">
      <AlertWidget
        v-if="showAlert"
        :isError="alertData.isError.value"
        :title="alertData.title.value"
        :mainText="alertData.mainText.value"
        :showInput="alertData.showInput.value"
        :buttonAction="alertData.buttonAction"
        :closeAction="alertData.closeAction"
      />

      <header class="relative min-h-64 pb-6 pt-4">
        <img
          v-if="!isEditing"
          :src="fighter?.pic || NoPhoto"
          :alt="fullName"
          class="mx-auto mb-4 size-50 rounded-full border object-cover shadow-sm sm:absolute sm:left-0 sm:top-4 sm:mx-0 sm:mb-0"
        />
        <div class="mx-auto max-w-3xl text-center">
          <h1 class="text-3xl font-semibold">{{ pageTitle }}</h1>
          <p v-if="locationLine" class="mt-2 text-sm text-muted-foreground">
            {{ locationLine }}
          </p>
        </div>
      </header>

      <form v-if="isEditing" @submit.prevent="saveFighter">
        <div class="mx-auto mb-10 flex max-w-5xl flex-col justify-center gap-10 pt-4 md:flex-row">
          <div class="flex justify-center md:min-w-80 md:justify-end">
            <ImageUpload v-model:imageSrc="editFighter.pic" />
          </div>
          <div class="w-full max-w-md">
            <h5 class="mb-2">{{ $t('fighterPageEditFormLabel') }}</h5>
            <div class="flex flex-col gap-4">
              <FullNameWidget
                v-model:surname="editFighter.surname"
                v-model:name="editFighter.name"
                v-model:patronymic="editFighter.patronymic"
              />
              <SelectLocationBlock
                v-model:country="editFighter.country"
                v-model:city="editFighter.city"
                v-model:club="editFighter.club"
                v-model:country_id="editFighter.country_id"
                v-model:city_id="editFighter.city_id"
                v-model:club_id="editFighter.club_id"
                :needClub="true"
                @request-add="handleRequestAdd"
              />
              <div class="space-y-2">
                <Label>{{ $t('addFighterGenderLabel') }}</Label>
                <div class="flex gap-3">
                  <Label class="flex cursor-pointer items-center gap-2">
                    <input
                      v-model="editFighter.is_male"
                      type="radio"
                      name="fighter-gender"
                      :value="true"
                    />
                    {{ $t('addFighterGenderMale') }}
                  </Label>
                  <Label class="flex cursor-pointer items-center gap-2">
                    <input
                      v-model="editFighter.is_male"
                      type="radio"
                      name="fighter-gender"
                      :value="false"
                    />
                    {{ $t('addFighterGenderFemale') }}
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-center gap-3">
          <Button type="submit" variant="default" size="default" :disabled="buttonDisabled">
            {{ $t('fighterPageSaveButton') }}
          </Button>
          <Button type="button" variant="outline" size="default" @click="cancelEditing">
            {{ $t('fighterPageCancelButton') }}
          </Button>
        </div>
      </form>

      <template v-else>
        <div class="mb-8 flex justify-center gap-3">
          <Button v-if="canEdit" size="default" @click="startEditing">
            {{ $t('fighterPageEditButton') }}
          </Button>
          <Button variant="default" size="default" @click="router.push(`/fighters`)">
            {{ $t('fighterPageBackButton') }}
          </Button>
        </div>

        <p v-if="statsError" class="mb-4 text-center text-sm text-destructive">
          {{ statsError }}
        </p>
        <div v-if="isStatsLoading" class="py-12 text-center text-sm text-muted-foreground">
          {{ $t('fighterPageStatsLoading') }}
        </div>

        <div v-else class="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
          <section class="min-w-0">
            <h2 class="mb-4 text-center text-xl font-semibold">
              {{ $t('fighterPageTournamentsTitle') }}
            </h2>
            <div
              v-if="completedTournamentRows.length === 0"
              class="rounded-md border py-8 text-center text-sm text-muted-foreground"
            >
              {{ $t('fighterPageNoCompletedTournaments') }}
            </div>
            <div v-else class="w-full min-w-0 overflow-hidden rounded-md border">
              <Table class="min-w-200 md:min-w-0 md:table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead class="md:w-[38%]">{{ $t('fighterPageTournamentName') }}</TableHead>
                    <TableHead class="w-40">{{ $t('fighterPageTournamentDate') }}</TableHead>
                    <TableHead class="md:w-[42%]">
                      {{ $t('fighterPageTournamentNominations') }}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="row in completedTournamentRows" :key="row.tournament_id">
                    <TableCell class="font-medium md:whitespace-normal">
                      {{ tData(row.tournament_name, currentLanguage) }}
                    </TableCell>
                    <TableCell class="text-muted-foreground">
                      {{ formatProfileDate(row.event_date) }}
                    </TableCell>
                    <TableCell class="md:whitespace-normal">
                      <span class="md:hidden">{{ tournamentNominationsText(row) }}</span>
                      <span class="hidden md:grid md:gap-1">
                        <span v-for="nomination in row.nominations" :key="nomination.id">
                          {{ nominationName(nomination) }}
                        </span>
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </section>

          <section>
            <h2 class="mb-4 text-center text-xl font-semibold">
              {{ $t('fighterPageFightsTitle') }}
            </h2>
            <div class="grid gap-4 md:grid-cols-[16rem_1fr]">
              <div class="rounded-md border p-4 text-center">
                <div class="text-sm text-muted-foreground">{{ $t('fighterPageFightsTotal') }}</div>
                <div class="mt-2 text-3xl font-semibold">
                  {{ fighterStats?.fights.total.fights ?? 0 }} /
                  {{ fighterStats?.fights.total.wins ?? 0 }}
                </div>
              </div>
              <div class="overflow-hidden rounded-md border">
                <div
                  v-if="!fighterStats || fighterStats.fights.by_nomination.length === 0"
                  class="py-8 text-center text-sm text-muted-foreground"
                >
                  {{ $t('fighterPageNoFights') }}
                </div>
                <template v-else>
                  <div
                    v-for="item in fighterStats.fights.by_nomination"
                    :key="item.nomination.id"
                    class="flex items-center justify-between border-b p-4 last:border-b-0"
                  >
                    <span>{{ nominationName(item.nomination) }}</span>
                    <span class="font-semibold">{{ item.fights }} / {{ item.wins }}</span>
                  </div>
                </template>
              </div>
            </div>
          </section>

          <section>
            <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 class="text-center text-xl font-semibold md:text-left">
                {{ $t('fighterPageRatingsTitle') }}
              </h2>
              <NativeSelect
                v-if="fighterStats && fighterStats.ratings.length"
                v-model="selectedRatingNominationId"
                class="w-full md:w-80"
                :aria-label="$t('ratingPageNomination')"
              >
                <NativeSelectOption
                  v-for="rating in fighterStats.ratings"
                  :key="rating.nomination.id"
                  :value="String(rating.nomination.id)"
                >
                  {{ nominationName(rating.nomination) }}
                </NativeSelectOption>
              </NativeSelect>
            </div>
            <div
              v-if="!fighterStats || fighterStats.ratings.length === 0"
              class="rounded-md border py-8 text-center text-sm text-muted-foreground"
            >
              {{ $t('fighterPageNoRatings') }}
            </div>
            <div v-else-if="selectedRating" class="grid gap-3">
              <div class="rounded-md border p-4 text-center font-medium">
                {{ $t('fighterPageRatingPlace') }} {{ selectedRating.place }}
                {{ $t('fighterPageRatingFrom') }} {{ selectedRating.total_fighters }},
                {{ $t('ratingPageRating') }} - {{ selectedRating.rating }}
              </div>
              <FighterRatingChart :history="selectedRating.history" />
            </div>
          </section>

          <section
            v-if="cardsStore.fighterCards.length"
            class="relative left-1/2 mb-10 w-screen max-w-[88rem] -translate-x-1/2 px-4"
          >
            <h3 class="mb-6 text-center text-xl font-semibold">
              {{ $t('disciplinaryCardsTitle') }}
            </h3>
            <TournamentCardsTable
              :cards="cardsStore.fighterCards"
              :canManage="canManageCards"
              :canDelete="canDeleteCards"
              :updateCard="updateDisciplinaryCard"
              :deleteCard="deleteDisciplinaryCard"
              mode="fighter"
              :tournamentMarshalsByTournamentId="tournamentMarshalsByTournamentId"
              @changed="
                async () => {
                  await cardsStore.loadFighterCards(fighterId)
                  await loadCardTournamentMarshals(cardsStore.fighterCards)
                }
              "
            />
          </section>
        </div>
      </template>
    </div>
  </main>
</template>
