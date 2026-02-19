<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTournamentsListStore } from '@/stores/tournamentsList'
import { Button } from '@/components/ui/button'
import { DynamicLabeledInput } from '@/widgets/DynamicLabeledInput'
import { AlertWidget } from '@/widgets/AlertWidget'
import { DatePicker } from '@/widgets/DatePicker'
import { SelectLocationBlock } from '@/widgets/SelectLocationBlock'
import { useRequiredFields } from '@/composables/useRequiredFields'
import { useAddEntityAlert } from '@/composables/useAddEntityAlert'
import { toDateFormat } from '@/lib/utils'
import type { CalendarDate } from '@internationalized/date'

const router = useRouter()
const tournamentsListStore = useTournamentsListStore()

const newTournament = reactive({
  name: '',
  country: '',
  city: '',
  country_id: 0,
  city_id: 0,
  event_date: null as Date | null
})

const eventDate = ref<CalendarDate | undefined>()

const buttonDisabled = computed(() => {
  const requiredFieldsMissing = useRequiredFields(newTournament, ['name', 'country', 'city']).value
  const dateNotSelected = !eventDate.value
  return requiredFieldsMissing || dateNotSelected
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
      </div>
    </div>

    <div class="flex justify-center">
      <Button type="submit" variant="default" size="default" :disabled="buttonDisabled">
        {{ $t('addTournamentSave') }}
      </Button>
    </div>
  </form>
</template>
