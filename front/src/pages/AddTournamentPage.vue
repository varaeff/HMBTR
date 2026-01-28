<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useCommonDataStore } from '@/stores/commonData'
import { useTournamentsListStore } from '@/stores/tournamentsList'
import { useRouter } from 'vue-router'
import ButtonAlert from '@/widgets/ButtonAlert.vue'
import InputTextComponent from '@/widgets/InputTextComponent.vue'
import VueCtkDateTimePicker from 'vue-ctk-date-time-picker'
import 'vue-ctk-date-time-picker/dist/vue-ctk-date-time-picker.css'
import { parseDateString } from '@/features/getDates'
import SelectLocationBlock from '@/widgets/SelectLocationBlock.vue'

const router = useRouter()

const newTournament = reactive({
  name: '',
  country: '',
  city: '',
  countryID: 0,
  cityID: 0,
  event_date: new Date()
})

const showAlert = ref(false)

const alertData = {
  isError: ref(true),
  title: ref(''),
  mainText: ref(''),
  buttonText: 'ОК',
  showInput: ref(false),
  buttonAction: () => {
    showAlert.value = false
  },
  closeAction: () => {
    alertData.isError.value = true
    alertData.showInput.value = false
    commonDataStore.alertData = ''
    showAlert.value = false
  }
}

const commonDataStore = useCommonDataStore()
const tournamentsListStore = useTournamentsListStore()

const saveNewTournament = async () => {
  const errorMsg: string[] = []

  if (!newTournament.name) errorMsg.push('название турнира')
  if (!newTournament.event_date) errorMsg.push('дата проведения')
  if (!newTournament.country) errorMsg.push('страна проведения')
  if (!newTournament.city) errorMsg.push('город проведения')

  if (errorMsg.length) {
    const emptyFields = errorMsg.join(', ') + '.'
    alertData.title.value = 'Заполнены не все обязательные поля!'
    alertData.mainText.value = `Обязательны к заполнению следующие поля: ${emptyFields}`

    alertData.showInput.value = false
    alertData.buttonAction = alertData.closeAction

    showAlert.value = true
    return
  }

  const raw = newTournament.event_date
  const dateObj = raw instanceof Date ? raw : parseDateString(String(raw))
  const pad = (n: number) => String(n).padStart(2, '0')
  const saveDate = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`

  const saveData = {
    name: newTournament.name,
    event_date: new Date(saveDate),
    country_id: Number(newTournament.countryID),
    city_id: Number(newTournament.cityID)
  }

  await tournamentsListStore.addNewTournament(saveData)

  router.push('/tournaments')
}

// Handle request-add emitted by SelectLocationBlock.
// payload: { title, performAdd }
const handleRequestAdd = ({
  title,
  performAdd
}: {
  title: string
  performAdd: (name: string) => Promise<void>
}) => {
  alertData.isError.value = false
  alertData.title.value = title
  alertData.mainText.value = ''
  alertData.buttonText = 'ОК'
  alertData.showInput.value = true

  alertData.buttonAction = async () => {
    const newName = commonDataStore.alertData?.trim() ?? ''
    if (!newName) {
      alertData.mainText.value = 'Введите название.'
      return
    }
    try {
      await performAdd(newName)
      // success: clear input and close
      commonDataStore.alertData = ''
      alertData.showInput.value = false
      alertData.isError.value = true
      showAlert.value = false
    } catch (err: any) {
      alertData.title.value = 'Ошибка'
      alertData.mainText.value = err?.response?.data?.error ?? 'Произошла ошибка при добавлении.'
      alertData.showInput.value = false
      alertData.isError.value = true
      showAlert.value = true
    }
  }

  showAlert.value = true
}
</script>

<template>
  <h1 class="title">Добавление нового бойца</h1>
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
                v-model:countryID="newTournament.countryID"
                v-model:cityID="newTournament.cityID"
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
      <button type="submit" class="btn btn-primary-accent btn-large">Сохранить данные</button>
    </div>
  </form>
</template>

<style scoped>
#undefined-wrapper {
  border: 1px solid #808f9d;
}
</style>
