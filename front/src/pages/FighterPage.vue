<script setup lang="ts">
import { reactive, ref, onMounted, computed, watchEffect, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTranslation } from 'i18next-vue'
import { useFightersListStore } from '@/stores/fightersList'
import { useAuthStore } from '@/stores/auth'
import { useDisciplinaryCardsStore } from '@/stores/disciplinaryCards'
import NoPhoto from '@/entities/NoPhoto.jpg'
import http from '@/api/http'
import { API_ROUTES } from '@shared/routes'
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
import { FullNameWidget } from '@/widgets/FullNameWidget'
import { SelectLocationBlock } from '@/widgets/SelectLocationBlock'
import { TournamentCardsTable } from '@/widgets/DisciplinaryCards'
import { FighterRatingChart } from '@/widgets/FighterRatingChart'
import { useRequiredFields } from '@/composables/useRequiredFields'
import { useAddEntityAlert } from '@/composables/useAddEntityAlert'
import type { Fighter, FighterDB, FighterProfileNomination, FighterProfileStats } from '@/model'
import { tData } from '@/lib/utils'
import { dateToString } from '@/lib/dateUtils'
import { hasAccess, hasAdminAccess } from '@/lib/checkAccess'

type Language = 'ru' | 'en'

interface CompletedTournamentRow {
  tournament_id: number
  tournament_name: string
  event_date: string | null
  nominations: FighterProfileNomination[]
}

const props = defineProps<{
  id: string
}>()

const router = useRouter()
const { i18next } = useTranslation()
const fighter = ref<Fighter | null | undefined>(null)
const fighterStats = ref<FighterProfileStats | null>(null)
const FightersListStore = useFightersListStore()
const authStore = useAuthStore()
const cardsStore = useDisciplinaryCardsStore()
const fighterId = computed(() => +props.id)
const isEditing = ref(false)
const isStatsLoading = ref(false)
const statsError = ref('')
const selectedRatingNominationId = ref('')
const { showAlert, alertData, handleRequestAdd } = useAddEntityAlert()
const initialDocumentTitle = document.title

const editFighter = reactive({
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

const buttonDisabled = useRequiredFields(editFighter, ['surname', 'name', 'country', 'city'])
const canEdit = computed(() => authStore.isAdmin || authStore.isOrganizer)
const canManageCards = computed(() => hasAccess())
const canDeleteCards = computed(() => Boolean(hasAdminAccess()))
const currentLanguage = computed<Language>(() => (i18next.language === 'en' ? 'en' : 'ru'))

onMounted(async () => {
  const [fetchedFighter] = await Promise.all([
    FightersListStore.showFighterDetails(fighterId.value),
    cardsStore.loadFighterCards(fighterId.value),
    loadFighterStats()
  ])
  fighter.value = fetchedFighter
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

const completedTournamentRows = computed<CompletedTournamentRow[]>(() => {
  if (!fighterStats.value) return []

  const rows = new Map<number, CompletedTournamentRow>()

  for (const item of fighterStats.value.tournaments) {
    const row = rows.get(item.tournament_id)

    if (row) {
      if (!row.nominations.some((nomination) => nomination.id === item.nomination.id)) {
        row.nominations.push(item.nomination)
      }
      continue
    }

    rows.set(item.tournament_id, {
      tournament_id: item.tournament_id,
      tournament_name: item.tournament_name,
      event_date: item.event_date,
      nominations: [item.nomination]
    })
  }

  return [...rows.values()]
})

const tournamentNominationsText = (row: CompletedTournamentRow) =>
  row.nominations.map((nomination) => nominationName(nomination)).join(', ')

const selectedRating = computed(() => {
  if (!fighterStats.value) return undefined

  return fighterStats.value.ratings.find(
    (rating) => String(rating.nomination.id) === selectedRatingNominationId.value
  )
})

const loadFighterStats = async () => {
  isStatsLoading.value = true
  statsError.value = ''

  try {
    const response = await http.get(API_ROUTES.RATINGS.BY_FIGHTER_PROFILE(fighterId.value))
    const data = response.data as FighterProfileStats
    fighterStats.value = data
    selectedRatingNominationId.value = data.ratings[0] ? String(data.ratings[0].nomination.id) : ''
  } catch (error: unknown) {
    statsError.value =
      error instanceof Error ? error.message : i18next.t('fighterPageStatsLoadError')
    fighterStats.value = null
  } finally {
    isStatsLoading.value = false
  }
}

const fillEditForm = () => {
  if (!fighter.value) return

  editFighter.surname = fighter.value.surname
  editFighter.name = fighter.value.name
  editFighter.patronymic = fighter.value.patronymic ?? ''
  editFighter.country = fighter.value.country
  editFighter.city = fighter.value.city
  editFighter.club = fighter.value.club ?? ''
  editFighter.country_id = fighter.value.country_id ?? 0
  editFighter.city_id = fighter.value.city_id ?? 0
  editFighter.club_id = fighter.value.club_id ?? 0
  editFighter.pic = fighter.value.pic ?? ''
  editFighter.is_male = fighter.value.is_male ?? true
}

const startEditing = () => {
  fillEditForm()
  isEditing.value = true
}

const cancelEditing = () => {
  fillEditForm()
  isEditing.value = false
}

const saveFighter = async () => {
  if (!fighter.value || !canEdit.value) return

  const saveData: FighterDB = {
    id: fighter.value.id,
    surname: editFighter.surname,
    name: editFighter.name,
    patronymic: editFighter.patronymic,
    country_id: editFighter.country_id,
    city_id: editFighter.city_id,
    club_id: editFighter.club_id || null,
    pic: editFighter.pic,
    is_male: editFighter.is_male
  }

  fighter.value = await FightersListStore.updateFighter(fighter.value.id, saveData)
  isEditing.value = false
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

          <section v-if="cardsStore.fighterCards.length" class="mx-auto mb-10 w-full max-w-5xl">
            <h3 class="mb-6 text-center text-xl font-semibold">
              {{ $t('disciplinaryCardsTitle') }}
            </h3>
            <TournamentCardsTable
              :cards="cardsStore.fighterCards"
              :canManage="canManageCards"
              :canDelete="canDeleteCards"
              mode="fighter"
              @changed="cardsStore.loadFighterCards(fighterId)"
            />
          </section>
        </div>
      </template>
    </div>
  </main>
</template>
