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
  <form @submit.prevent="saveNewFighter">
    <div class="promo-block">
      <div class="promo-block__picture">
        <ImageUpload v-model:imageSrc="newFighter.pic" />
      </div>
      <div class="promo-block__features">
        <div class="form-area">
          <div class="form-area__title form-area__title--medium">Введите данные бойца.</div>
          <div class="form-area__content">
            <div class="fieldsets-batch">
              <InputTextComponent :placeholder="'Фамилия'" v-model:value="newFighter.surname" />
              <InputTextComponent :placeholder="'Имя'" v-model:value="newFighter.name" />
              <InputTextComponent :placeholder="'Отчество'" v-model:value="newFighter.patronymic" />
              <SelectLocationBlock
                v-model:country="newFighter.country"
                v-model:city="newFighter.city"
                v-model:club="newFighter.club"
                v-model:countryID="newFighter.countryID"
                v-model:cityID="newFighter.cityID"
                v-model:clubID="newFighter.clubID"
                :needClub="true"
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
                :label="'Дата рождения'"
                v-model="newFighter.birthday"
                @click="newFighter.birthday = getDate(30)"
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

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useCommonDataStore } from '@/app/stores/commonData'
import { useRouter } from 'vue-router'
import ButtonAlert from '@/widgets/ButtonAlert'
import ImageUpload from '@/widgets/ImageUpload'
import InputTextComponent from '@/widgets/InputTextComponent'
import VueCtkDateTimePicker from 'vue-ctk-date-time-picker'
import 'vue-ctk-date-time-picker/dist/vue-ctk-date-time-picker.css'
import { getDate, parseDateString } from '@/features/getDates'
import axios from 'axios'
import SelectLocationBlock from '@/widgets/SelectLocationBlock/ui/SelectLocationBlock.vue'

const router = useRouter()

const newFighter = reactive({
  surname: '',
  name: '',
  patronymic: '',
  country: '',
  city: '',
  club: '',
  countryID: 0,
  cityID: 0,
  clubID: 0,
  pic: '',
  birthday: ''
})

const showAlert = ref(false)
const loading = ref(false)

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

const saveNewFighter = async () => {
  if (loading.value) return
  const errorMsg: string[] = []

  if (!newFighter.name) errorMsg.push('имя бойца')
  if (!newFighter.surname) errorMsg.push('фамилия бойца')
  if (!newFighter.country) errorMsg.push('страна')
  if (!newFighter.city) errorMsg.push('город')

  if (errorMsg.length) {
    const emptyFields = errorMsg.join(', ') + '.'
    alertData.title.value = 'Заполнены не все обязательные поля!'
    alertData.mainText.value = `Обязательны к заполнению следующие поля: ${emptyFields}`

    alertData.showInput.value = false
    alertData.buttonAction = alertData.closeAction

    showAlert.value = true
    return
  }

  const saveDate = newFighter.birthday.length
    ? parseDateString(newFighter.birthday).toISOString().split('T')[0]
    : null

  const photo = newFighter.pic ? newFighter.pic : ''
  const saveData = {
    surname: newFighter.surname,
    name: newFighter.name,
    patronymic: newFighter.patronymic,
    birthday: saveDate,
    country_id: Number(newFighter.countryID) || null,
    city_id: Number(newFighter.cityID) || null,
    club_id: Number(newFighter.clubID) || null,
    pic: photo
  }

  loading.value = true

  try {
    await axios.post(`${import.meta.env.VITE_API_BASE_URL}/fighters`, saveData)
    router.push('/fighters')
  } catch (error: any) {
    alertData.title.value = error?.response?.data?.error ?? 'Ошибка'
    alertData.mainText.value = 'Сохранение отменено.'
    showAlert.value = true
  } finally {
    loading.value = false
  }
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

<style scoped>
#undefined-wrapper {
  border: 1px solid #808f9d;
}
</style>
