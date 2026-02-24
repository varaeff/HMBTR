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
import { toDateFormat } from '@/lib/utils'
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
  <h1 class="flex justify-center mb-4">{{ $t('addTournamentNamePage') }}</h1>
  <p class="flex justify-center">{{ $t('addTournamentHint') }}</p>
  <AlertWidget
    v-if="showAlert"
    :isError="alertData.isError.value"
    :title="alertData.title.value"
    :mainText="alertData.mainText.value"
    :showInput="alertData.showInput.value"
    :buttonAction="alertData.buttonAction"
    :closeAction="alertData.closeAction"
  />
  <form @submit.prevent="saveNewTournament">
    <div class="max-w-120 min-w-100 pt-8 mx-auto gap-10 mb-10">
      <h5 class="mb-2">{{ $t('addTournamentNameCard') }}</h5>
      <div class="flex flex-col">
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
        <h6 class="mt-4 mb-4">{{ $t('addTournamentNominations') }}</h6>
        <div class="flex flex-col gap-6">
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

    <div class="flex justify-center">
      <Button type="submit" variant="default" size="default" :disabled="buttonDisabled">
        {{ $t('addTournamentSave') }}
      </Button>
    </div>
  </form>
</template>
