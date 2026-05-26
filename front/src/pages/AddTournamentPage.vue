<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTranslation } from 'i18next-vue'
import { useTournamentsListStore } from '@/stores/tournamentsList'
import { useCommonDataStore } from '@/stores/commonData'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { DynamicLabeledInput } from '@/widgets/DynamicLabeledInput'
import { AlertWidget } from '@/widgets/AlertWidget'
import { DatePicker } from '@/widgets/DatePicker'
import { SelectLocationBlock } from '@/widgets/SelectLocationBlock'
import { useRequiredFields } from '@/composables/useRequiredFields'
import { useAddEntityAlert } from '@/composables/useAddEntityAlert'
import { toDateFormat } from '@/lib/dateUtils'
import type { CalendarDate } from '@internationalized/date'
import type { Nomination } from '@/model'

const router = useRouter()
const tournamentsListStore = useTournamentsListStore()
const commonDataStore = useCommonDataStore()
const { i18next } = useTranslation()

const newTournament = reactive({
  name: '',
  country: '',
  city: '',
  country_id: 0,
  city_id: 0,
  event_date: null as Date | null,
  nominations_ids: [] as number[]
})

const eventDate = ref<CalendarDate | undefined>()
const nominations = ref<Nomination[]>([])

onMounted(async () => {
  nominations.value = await commonDataStore.fetchNominations()
})

const buttonDisabled = computed(() => {
  const requiredFieldsMissing = useRequiredFields(newTournament, ['name', 'country', 'city']).value
  const dateNotSelected = !eventDate.value
  const nominationsNotSelected = newTournament.nominations_ids.length === 0
  return requiredFieldsMissing || dateNotSelected || nominationsNotSelected
})
const { showAlert, alertData, handleRequestAdd } = useAddEntityAlert()

const saveNewTournament = async () => {
  const saveData = {
    ...newTournament,
    event_date: toDateFormat(eventDate.value as CalendarDate)
  }

  await tournamentsListStore.addNewTournament(saveData)

  router.push('/tournaments')
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
    <header class="flex flex-col items-center gap-2 text-center">
      <h1 class="text-2xl font-semibold sm:text-3xl">{{ $t('addTournamentNamePage') }}</h1>
      <p class="max-w-2xl text-sm text-muted-foreground sm:text-base">
        {{ $t('addTournamentHint') }}
      </p>
    </header>

    <AlertWidget
      v-if="showAlert"
      :isError="alertData.isError.value"
      :title="alertData.title.value"
      :mainText="alertData.mainText.value"
      :showInput="alertData.showInput.value"
      :buttonAction="alertData.buttonAction"
      :closeAction="alertData.closeAction"
    />

    <form class="flex flex-col gap-6" @submit.prevent="saveNewTournament">
      <section class="min-w-0 rounded-lg border bg-card p-4 sm:p-6">
        <h2 class="mb-4 text-lg font-semibold">{{ $t('addTournamentNameCard') }}</h2>
        <div class="flex flex-col gap-4">
          <DynamicLabeledInput
            :placeholder="$t('addTournamentNameTournament')"
            v-model:value="newTournament.name"
          />
          <SelectLocationBlock
            v-model:country="newTournament.country"
            v-model:city="newTournament.city"
            v-model:country_id="newTournament.country_id"
            v-model:city_id="newTournament.city_id"
            :needClub="false"
            @request-add="handleRequestAdd"
          />
          <DatePicker :placeholder="$t('addTournamentDate')" v-model:date="eventDate" />
          <div class="flex flex-col gap-4">
            <h2 class="text-base font-semibold">{{ $t('addTournamentNominations') }}</h2>
            <div class="flex flex-col gap-4">
              <div v-for="nom in nominations" :key="nom.id" class="flex items-center gap-3">
                <Checkbox
                  :id="`nom-${nom.id}`"
                  :model-value="newTournament.nominations_ids.includes(nom.id)"
                  @update:model-value="
                    (checked: boolean | 'indeterminate') => {
                      if (checked === true) {
                        newTournament.nominations_ids.push(nom.id)
                      } else {
                        newTournament.nominations_ids = newTournament.nominations_ids.filter(
                          (id) => id !== nom.id
                        )
                      }
                   }
                  "
                />
                <Label :for="`nom-${nom.id}`">{{
                  nom[`name_${i18next.language as 'ru' | 'en'}`]
                }}</Label>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="flex justify-center">
        <Button type="submit" variant="default" size="default" :disabled="buttonDisabled">
          {{ $t('addTournamentSave') }}
        </Button>
      </div>
    </form>
  </main>
</template>
