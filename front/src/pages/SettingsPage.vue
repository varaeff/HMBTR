<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useTranslation } from 'i18next-vue'
import { Save, Trash2 } from 'lucide-vue-next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { AlertWidget } from '@/widgets/AlertWidget'
import { useCommonDataStore } from '@/stores/commonData'
import { useSettingsStore } from '@/stores/settings'
import type {
  DisciplinaryCardSettings,
  Nomination,
  NominationPayload,
  YellowExpirationMode
} from '@/model'

type SettingsTab = 'cards' | 'nominations'

interface NominationDraft {
  name_ru: string
  name_en: string
  is_male: boolean
  rounds: 1 | 2 | 3
  round_win: boolean
}

interface ApiErrorWithResponse {
  response?: {
    data?: {
      details?: unknown
      error?: string
    }
    status?: number
  }
  message?: string
}

interface ExistingFightConflict {
  code: 'NOMINATION_HAS_EXISTING_FIGHTS'
  fights_count: number
}

const defaultCardSettings = (): DisciplinaryCardSettings => ({
  id: 1,
  yellow_expiration_mode: 'END_OF_YEAR_MONTH',
  yellow_expiration_month: 12,
  yellow_expiration_days: 365,
  red_auto_yellow_days: 45,
  red_manual_days: 90,
  red_manual_with_one_yellow_days: 120,
  red_manual_with_two_or_more_yellows_days: 180,
  updated_at: ''
})

const defaultNominationDraft = (): NominationDraft => ({
  name_ru: '',
  name_en: '',
  is_male: true,
  rounds: 1,
  round_win: false
})

const commonDataStore = useCommonDataStore()
const settingsStore = useSettingsStore()
const { i18next } = useTranslation()

const activeTab = ref<SettingsTab>('cards')
const cardSettings = reactive<DisciplinaryCardSettings>(defaultCardSettings())
const nominationDrafts = reactive<Record<number, NominationDraft>>({})
const newNomination = reactive<NominationDraft>(defaultNominationDraft())
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const pendingNominationSave = ref<NominationPayload & { id: number } | null>(null)
const showNominationConfirm = ref(false)

const nominations = computed(() => commonDataStore.nominations)

const monthOptions = computed(() =>
  Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: new Intl.DateTimeFormat(i18next.language === 'en' ? 'en' : 'ru', {
      month: 'long'
    }).format(new Date(Date.UTC(2026, index, 1)))
  }))
)

const asRounds = (value: unknown): 1 | 2 | 3 => {
  const parsed = Number(value)
  return parsed === 2 || parsed === 3 ? parsed : 1
}

const setCardSettings = (settings: DisciplinaryCardSettings) => {
  Object.assign(cardSettings, settings)
}

const setNominationDrafts = () => {
  for (const nomination of nominations.value) {
    nominationDrafts[nomination.id] = {
      name_ru: nomination.name_ru,
      name_en: nomination.name_en,
      is_male: nomination.is_male,
      rounds: nomination.rounds,
      round_win: nomination.round_win
    }
  }
}

const payloadFromDraft = (draft: NominationDraft): NominationPayload => ({
  name_ru: draft.name_ru.trim(),
  name_en: draft.name_en.trim(),
  is_male: draft.is_male,
  rounds: draft.rounds,
  round_win: draft.rounds === 3 ? draft.round_win : false
})

const setError = (message: string) => {
  errorMessage.value = message
  successMessage.value = ''
}

const setSuccess = (message: string) => {
  successMessage.value = message
  errorMessage.value = ''
}

const isExistingFightConflict = (value: unknown): value is ExistingFightConflict =>
  typeof value === 'object' &&
  value !== null &&
  'code' in value &&
  value.code === 'NOMINATION_HAS_EXISTING_FIGHTS' &&
  'fights_count' in value &&
  typeof value.fights_count === 'number'

const errorText = (error: unknown) => {
  const response = (error as ApiErrorWithResponse).response
  const details = response?.data?.details
  if (typeof details === 'string') return details
  if (Array.isArray(details)) return details.join(', ')
  return response?.data?.error || (error as ApiErrorWithResponse).message || i18next.t('settingsError')
}

const isNominationSaveConflict = (error: unknown) =>
  isExistingFightConflict((error as ApiErrorWithResponse).response?.data?.details)

const loadSettings = async () => {
  isLoading.value = true
  try {
    const [settings] = await Promise.all([
      settingsStore.loadDisciplinaryCardSettings(),
      commonDataStore.refreshNominations()
    ])
    setCardSettings(settings)
    setNominationDrafts()
  } catch (error: unknown) {
    setError(errorText(error))
  } finally {
    isLoading.value = false
  }
}

const saveCardSettings = async () => {
  try {
    setCardSettings(await settingsStore.updateDisciplinaryCardSettings(cardSettings))
    setSuccess(i18next.t('settingsSaved'))
  } catch (error: unknown) {
    setError(errorText(error))
  }
}

const saveNomination = async (nomination: Nomination, confirmExistingFights = false) => {
  const draft = nominationDrafts[nomination.id]
  if (!draft) return

  const payload = {
    ...payloadFromDraft(draft),
    confirm_existing_fights: confirmExistingFights || undefined
  }

  try {
    await commonDataStore.updateNomination(nomination.id, payload)
    setNominationDrafts()
    setSuccess(i18next.t('settingsSaved'))
  } catch (error: unknown) {
    if (isNominationSaveConflict(error)) {
      pendingNominationSave.value = { id: nomination.id, ...payloadFromDraft(draft) }
      showNominationConfirm.value = true
      return
    }
    setError(errorText(error))
  }
}

const confirmNominationSave = async () => {
  const pending = pendingNominationSave.value
  if (!pending) return

  showNominationConfirm.value = false
  pendingNominationSave.value = null
  try {
    await commonDataStore.updateNomination(pending.id, {
      name_ru: pending.name_ru,
      name_en: pending.name_en,
      is_male: pending.is_male,
      rounds: pending.rounds,
      round_win: pending.round_win,
      confirm_existing_fights: true
    })
    setNominationDrafts()
    setSuccess(i18next.t('settingsSaved'))
  } catch (error: unknown) {
    setError(errorText(error))
  }
}

const cancelNominationConfirm = () => {
  showNominationConfirm.value = false
  pendingNominationSave.value = null
}

const createNomination = async () => {
  try {
    await commonDataStore.createNomination(payloadFromDraft(newNomination))
    Object.assign(newNomination, defaultNominationDraft())
    setNominationDrafts()
    setSuccess(i18next.t('settingsNominationCreated'))
  } catch (error: unknown) {
    setError(errorText(error))
  }
}

const deleteNomination = async (nomination: Nomination) => {
  if (!nomination.can_delete) return

  try {
    await commonDataStore.deleteNomination(nomination.id)
    setSuccess(i18next.t('settingsNominationDeleted'))
  } catch (error: unknown) {
    setError(errorText(error))
  }
}

const updateYellowMode = (...args: unknown[]) => {
  cardSettings.yellow_expiration_mode = String(args[0]) as YellowExpirationMode
}

const updateYellowExpirationMonth = (...args: unknown[]) => {
  cardSettings.yellow_expiration_month = Number(args[0])
}

const updateNominationGender = (draft: NominationDraft, value: unknown) => {
  draft.is_male = value === 'male'
}

const updateNominationRoundWin = (draft: NominationDraft, value: unknown) => {
  draft.round_win = value === true
}

const updateNominationRounds = (draft: NominationDraft, value: unknown) => {
  draft.rounds = asRounds(value)
  if (draft.rounds !== 3) {
    draft.round_win = false
  }
}

onMounted(() => {
  void loadSettings()
})
</script>

<template>
  <main class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
    <header class="flex flex-col gap-2">
      <h1 class="text-2xl font-semibold sm:text-3xl">{{ $t('settingsPageTitle') }}</h1>
      <p v-if="errorMessage" class="text-sm text-destructive">{{ errorMessage }}</p>
      <p v-else-if="successMessage" class="text-sm text-muted-foreground">{{ successMessage }}</p>
    </header>

    <Tabs v-model="activeTab" class="w-full">
      <TabsList class="grid w-full grid-cols-2 md:w-96">
        <TabsTrigger value="cards">{{ $t('settingsCardsTab') }}</TabsTrigger>
        <TabsTrigger value="nominations">{{ $t('settingsNominationsTab') }}</TabsTrigger>
      </TabsList>

      <TabsContent value="cards" class="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>{{ $t('settingsCardsTitle') }}</CardTitle>
            <CardDescription>{{ $t('settingsCardsDescription') }}</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col gap-4">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label class="flex flex-col gap-1 text-sm font-medium">
                {{ $t('settingsYellowMode') }}
                <NativeSelect
                  :model-value="cardSettings.yellow_expiration_mode"
                  @update:model-value="updateYellowMode"
                >
                  <NativeSelectOption value="END_OF_YEAR_MONTH">
                    {{ $t('settingsYellowModeMonth') }}
                  </NativeSelectOption>
                  <NativeSelectOption value="DAYS">
                    {{ $t('settingsYellowModeDays') }}
                  </NativeSelectOption>
                </NativeSelect>
              </label>
              <label
                v-if="cardSettings.yellow_expiration_mode === 'END_OF_YEAR_MONTH'"
                class="flex flex-col gap-1 text-sm font-medium"
              >
                {{ $t('settingsYellowMonth') }}
                <NativeSelect
                  :model-value="String(cardSettings.yellow_expiration_month)"
                  @update:model-value="updateYellowExpirationMonth"
                >
                  <NativeSelectOption
                    v-for="month in monthOptions"
                    :key="month.value"
                    :value="String(month.value)"
                  >
                    {{ month.label }}
                  </NativeSelectOption>
                </NativeSelect>
              </label>
              <label v-else class="flex flex-col gap-1 text-sm font-medium">
                {{ $t('settingsYellowDays') }}
                <Input
                  v-model.number="cardSettings.yellow_expiration_days"
                  type="number"
                  min="1"
                />
              </label>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label class="flex flex-col gap-1 text-sm font-medium">
                {{ $t('settingsRedAutoYellowDays') }}
                <Input v-model.number="cardSettings.red_auto_yellow_days" type="number" min="1" />
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium">
                {{ $t('settingsRedManualDays') }}
                <Input v-model.number="cardSettings.red_manual_days" type="number" min="1" />
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium">
                {{ $t('settingsRedManualOneYellowDays') }}
                <Input
                  v-model.number="cardSettings.red_manual_with_one_yellow_days"
                  type="number"
                  min="1"
                />
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium">
                {{ $t('settingsRedManualTwoYellowsDays') }}
                <Input
                  v-model.number="cardSettings.red_manual_with_two_or_more_yellows_days"
                  type="number"
                  min="1"
                />
              </label>
            </div>

            <div class="flex justify-end">
              <Button :disabled="isLoading" @click="saveCardSettings">
                <Save data-icon="inline-start" />
                {{ $t('disciplinaryCardsSave') }}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="nominations" class="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>{{ $t('settingsNominationsTitle') }}</CardTitle>
            <CardDescription>{{ $t('settingsNominationsDescription') }}</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col gap-5">
            <div class="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
              <Table class="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{{ $t('settingsNominationNameRu') }}</TableHead>
                    <TableHead>{{ $t('settingsNominationNameEn') }}</TableHead>
                    <TableHead>{{ $t('addFighterGenderLabel') }}</TableHead>
                    <TableHead>{{ $t('settingsNominationRounds') }}</TableHead>
                    <TableHead>{{ $t('settingsNominationRoundWin') }}</TableHead>
                    <TableHead>{{ $t('settingsNominationUsage') }}</TableHead>
                    <TableHead class="text-right">{{ $t('disciplinaryCardsActions') }}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="nomination in nominations" :key="nomination.id">
                    <template v-if="nominationDrafts[nomination.id]">
                      <TableCell>
                        <Input v-model="nominationDrafts[nomination.id].name_ru" />
                      </TableCell>
                      <TableCell>
                        <Input v-model="nominationDrafts[nomination.id].name_en" />
                      </TableCell>
                      <TableCell>
                        <NativeSelect
                          :model-value="nominationDrafts[nomination.id].is_male ? 'male' : 'female'"
                          @update:model-value="
                            (...args: unknown[]) =>
                              updateNominationGender(nominationDrafts[nomination.id], args[0])
                          "
                        >
                          <NativeSelectOption value="male">{{
                            $t('addFighterGenderMale')
                          }}</NativeSelectOption>
                          <NativeSelectOption value="female">{{
                            $t('addFighterGenderFemale')
                          }}</NativeSelectOption>
                        </NativeSelect>
                      </TableCell>
                      <TableCell>
                        <NativeSelect
                          :model-value="String(nominationDrafts[nomination.id].rounds)"
                          @update:model-value="
                            (...args: unknown[]) =>
                              updateNominationRounds(nominationDrafts[nomination.id], args[0])
                          "
                        >
                          <NativeSelectOption value="1">1</NativeSelectOption>
                          <NativeSelectOption value="2">2</NativeSelectOption>
                          <NativeSelectOption value="3">3</NativeSelectOption>
                        </NativeSelect>
                      </TableCell>
                      <TableCell>
                        <div class="flex justify-center">
                          <Checkbox
                            :model-value="nominationDrafts[nomination.id].round_win"
                            :disabled="nominationDrafts[nomination.id].rounds !== 3"
                            @update:model-value="
                              (...args: unknown[]) =>
                                updateNominationRoundWin(nominationDrafts[nomination.id], args[0])
                            "
                          />
                        </div>
                      </TableCell>
                      <TableCell>{{ nomination.tournaments_count ?? 0 }}</TableCell>
                      <TableCell class="text-right">
                        <div class="flex justify-end gap-2">
                          <Button size="sm" @click="saveNomination(nomination)">
                            <Save data-icon="inline-start" />
                            {{ $t('disciplinaryCardsSave') }}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            :disabled="!nomination.can_delete"
                            :title="
                              nomination.can_delete
                                ? $t('disciplinaryCardsDelete')
                                : $t('settingsNominationDeleteDisabled')
                            "
                            @click="deleteNomination(nomination)"
                          >
                            <Trash2 data-icon="inline-start" />
                            {{ $t('disciplinaryCardsDelete') }}
                          </Button>
                        </div>
                      </TableCell>
                    </template>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div class="grid grid-cols-1 gap-4 border-t pt-5 md:grid-cols-6">
              <label class="flex flex-col gap-1 text-sm font-medium md:col-span-2">
                {{ $t('settingsNominationNameRu') }}
                <Input v-model="newNomination.name_ru" />
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium md:col-span-2">
                {{ $t('settingsNominationNameEn') }}
                <Input v-model="newNomination.name_en" />
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium">
                {{ $t('addFighterGenderLabel') }}
                <NativeSelect
                  :model-value="newNomination.is_male ? 'male' : 'female'"
                  @update:model-value="
                    (...args: unknown[]) => updateNominationGender(newNomination, args[0])
                  "
                >
                  <NativeSelectOption value="male">{{ $t('addFighterGenderMale') }}</NativeSelectOption>
                  <NativeSelectOption value="female">{{
                    $t('addFighterGenderFemale')
                  }}</NativeSelectOption>
                </NativeSelect>
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium">
                {{ $t('settingsNominationRounds') }}
                <NativeSelect
                  :model-value="String(newNomination.rounds)"
                  @update:model-value="
                    (...args: unknown[]) => updateNominationRounds(newNomination, args[0])
                  "
                >
                  <NativeSelectOption value="1">1</NativeSelectOption>
                  <NativeSelectOption value="2">2</NativeSelectOption>
                  <NativeSelectOption value="3">3</NativeSelectOption>
                </NativeSelect>
              </label>
              <label class="flex items-center gap-2 text-sm font-medium md:col-span-2">
                <Checkbox
                  :model-value="newNomination.round_win"
                  :disabled="newNomination.rounds !== 3"
                  @update:model-value="
                    (...args: unknown[]) => updateNominationRoundWin(newNomination, args[0])
                  "
                />
                {{ $t('settingsNominationRoundWin') }}
              </label>
              <div class="flex items-end md:col-span-4 md:justify-end">
                <Button class="w-full md:w-auto" @click="createNomination">
                  {{ $t('settingsNominationAdd') }}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <AlertWidget
      v-if="showNominationConfirm"
      :isError="true"
      :title="$t('settingsNominationConfirmTitle')"
      :mainText="$t('settingsNominationConfirmText')"
      :showInput="false"
      :buttonAction="confirmNominationSave"
      :closeAction="cancelNominationConfirm"
      :cancelAction="cancelNominationConfirm"
      :buttonText="$t('tournamentPageConfirmBackwardAction')"
      :cancelText="$t('disciplinaryCardsCancel')"
      buttonVariant="destructive"
    />
  </main>
</template>
