<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useTournamentsListStore } from '@/stores/tournamentsList'
import { useRouter } from 'vue-router'
import ButtonAlert from '@/widgets/ButtonAlert.vue'
import { Button } from '@/components/ui/button'
import { DynamicLabeledInput } from '@/widgets/DynamicLabeledInput'
import { DatePicker } from '@/widgets/DatePicker'
import { toDateFormat } from '@/features/formatDate'
import { SelectLocationBlock } from '@/widgets/SelectLocationBlock'
import { useRequiredFields } from '@/composables/useRequiredFields'
import { useAddEntityAlert } from '@/composables/useAddEntityAlert'
import type { CalendarDate } from '@internationalized/date'

const router = useRouter()
const tournamentsListStore = useTournamentsListStore()

const newTournament = reactive({
  name: '',
  country: '',
  city: '',
  country_id: 0,
  city_id: 0,
  event_date: new Date()
})

const eventDate = ref<CalendarDate | undefined>()

const buttonDisabled = useRequiredFields(newTournament, ['name', 'country', 'city'])
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
  <h1 class="flex justify-center">Добавление нового турнира</h1>
  <p class="flex justify-center">
    Обязательны к заполнению следующие поля: название, страна, город
  </p>
  <ButtonAlert
    v-if="showAlert"
    :isError="alertData.isError.value"
    :title="alertData.title.value"
    :mainText="alertData.mainText.value"
    :showInput="alertData.showInput.value"
    :buttonAction="alertData.buttonAction"
    :closeAction="alertData.closeAction"
  />
  <form @submit.prevent="saveNewTournament">
    <div class="promo-block">
      <div class="promo-block__features">
        <div class="form-area">
          <div class="form-area__title form-area__title--medium">Введите данные турнира.</div>
          <div class="form-area__content">
            <div class="fieldsets-batch">
              <DynamicLabeledInput
                :placeholder="'Название турнира'"
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
              <DatePicker placeholder="Дата проведения" v-model:date="eventDate" />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="flex justify-center">
      <Button type="submit" variant="default" size="default" :disabled="buttonDisabled">
        Сохранить данные
      </Button>
    </div>
  </form>
</template>
