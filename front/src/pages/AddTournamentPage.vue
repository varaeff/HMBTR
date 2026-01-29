<script setup lang="ts">
import { reactive } from 'vue'
import { useTournamentsListStore } from '@/stores/tournamentsList'
import { useRouter } from 'vue-router'
import ButtonAlert from '@/widgets/ButtonAlert.vue'
import InputTextComponent from '@/components/InputTextComponent.vue'
import VueCtkDateTimePicker from 'vue-ctk-date-time-picker'
import 'vue-ctk-date-time-picker/dist/vue-ctk-date-time-picker.css'
import { toISODate } from '@/features/formatDate'
import SelectLocationBlock from '@/widgets/SelectLocationBlock.vue'
import { useRequiredFields } from '@/composables/useRequiredFields'
import { useAddEntityAlert } from '@/composables/useAddEntityAlert'

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

const buttonDisabled = useRequiredFields(newTournament, ['name', 'country', 'city'])
const { showAlert, alertData, handleRequestAdd } = useAddEntityAlert()

const saveNewTournament = async () => {
  const saveData = {
    ...newTournament,
    event_date: new Date(toISODate(newTournament.event_date))
  }

  await tournamentsListStore.addNewTournament(saveData)

  router.push('/tournaments')
}
</script>

<template>
  <h1 class="title">Добавление нового турнира</h1>
  <p class="title">Обязательны к заполнению следующие поля: название, страна, город</p>
  <ButtonAlert
    v-if="showAlert"
    :isError="alertData.isError.value"
    :title="alertData.title.value"
    :mainText="alertData.mainText.value"
    :buttonText="alertData.buttonText"
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
              <InputTextComponent
                :placeholder="'Название турнира'"
                v-model:value="newTournament.name"
              />
              <SelectLocationBlock
                v-model:country="newTournament.country"
                v-model:city="newTournament.city"
                v-model:countryID="newTournament.country_id"
                v-model:cityID="newTournament.city_id"
                :needClub="false"
                @request-add="handleRequestAdd"
              />
              <VueCtkDateTimePicker
                :onlyDate="true"
                :right="true"
                :noLabel="true"
                :noHeader="true"
                :noButton="true"
                :color="'#808f9d'"
                :format="'DD-MM-YYYY'"
                :formatted="'ll'"
                :label="'Дата проведения'"
                v-model="newTournament.event_date"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="bottom-btn">
      <button type="submit" class="btn btn-primary-accent btn-large" :disabled="buttonDisabled">
        Сохранить данные
      </button>
    </div>
  </form>
</template>

<style scoped>
#undefined-wrapper {
  border: 1px solid #808f9d;
}
</style>
