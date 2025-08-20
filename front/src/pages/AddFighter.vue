<template>
  <h1 class="title">Добавление нового бойца</h1>
  <ButtonAlert
    v-show="showAlert"
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
        <ImageUpload v-model:imageSrc="newFighter.pic.value" />
      </div>
      <div class="promo-block__features">
        <div class="form-area">
          <div class="form-area__title form-area__title--medium">Введите данные бойца.</div>
          <div class="form-area__content">
            <div class="fieldsets-batch">
              <InputTextComponent
                :placeholder="'Фамилия'"
                v-model:value="newFighter.surname.value"
              />
              <InputTextComponent :placeholder="'Имя'" v-model:value="newFighter.name.value" />
              <InputTextComponent
                :placeholder="'Отчество'"
                v-model:value="newFighter.patronymic.value"
              />
              <div class="fieldsets-batch fieldsets-batch--with-single-field">
                <SelectComponent
                  :placeholder="'Страна'"
                  :values="countryNames"
                  v-model:value="newFighter.country.value"
                />
                <button type="button" class="btn btn-link btn-medium" @click="addCountry">
                  Добавить страну
                </button>
              </div>
              <div class="fieldsets-batch fieldsets-batch--with-single-field">
                <SelectComponent
                  :placeholder="'Город'"
                  :values="cityNames"
                  v-model:value="newFighter.city.value"
                />
                <button
                  v-show="newFighter.country.value"
                  type="button"
                  class="btn btn-link btn-medium"
                >
                  Добавить город
                </button>
              </div>
              <div class="fieldsets-batch fieldsets-batch--with-single-field">
                <SelectComponent
                  :placeholder="'Клуб'"
                  :values="clubsNames"
                  v-model:value="newFighter.club.value"
                />
                <button
                  v-show="newFighter.city.value"
                  type="button"
                  class="btn btn-link btn-medium"
                >
                  Добавить клуб
                </button>
              </div>
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
                v-model="newFighter.birthday.value"
                @click="newFighter.birthday.value = getDate(30)"
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
import { computed, onMounted, ref, watch } from 'vue'
import { useCommonDataStore } from '@/app/stores/commonData'
import { useRouter } from 'vue-router'
import ButtonAlert from '@/widgets/ButtonAlert'
import ImageUpload from '@/widgets/ImageUpload'
import InputTextComponent from '@/widgets/InputTextComponent'
import SelectComponent from '@/widgets/SelectComponent'
import VueCtkDateTimePicker from 'vue-ctk-date-time-picker'
import 'vue-ctk-date-time-picker/dist/vue-ctk-date-time-picker.css'
import { getDate, parseDateString } from '@/features/getDates'
import type { City, Club, Country } from '@/shared/model'
import axios from 'axios'

const router = useRouter()

const newFighter = {
  surname: ref<string>(''),
  name: ref<string>(''),
  patronymic: ref<string>(''),
  country: ref<string>(''),
  city: ref<string>(''),
  club: ref<string>(''),
  cuuntryID: ref<number>(0),
  cityID: ref<number>(0),
  clubID: ref<number>(0),
  pic: ref<string>(''),
  birthday: ref<string>('')
}

const showAlert = ref(false)

const countries = ref<Country[]>([])
const cities = ref<City[]>([])
const clubs = ref<Club[]>([])

let emptyFields = ''

const alertData = {
  title: ref(''),
  mainText: ref(''),
  buttonText: 'ОК',
  showInput: ref(false),
  buttonAction: () => {
    showAlert.value = false
  },
  closeAction: () => {
    showAlert.value = false
  }
}

const commonDataStore = useCommonDataStore()

onMounted(async () => {
  countries.value = await commonDataStore.fetchCountries()
})

const countryNames = computed(() => {
  return countries.value.map((country) => country.name)
})

const cityNames = computed(() => {
  return cities.value.map((city) => city.name)
})

const clubsNames = computed(() => {
  return clubs.value.map((club) => club.name)
})

const countryIds = computed<Record<string, number>>(() => {
  return countries.value.reduce<Record<string, number>>((acc, country) => {
    acc[country.name] = country.id
    return acc
  }, {})
})

const cityIds = computed<Record<string, number>>(() => {
  return cities.value.reduce<Record<string, number>>((acc, city) => {
    acc[city.name] = city.id
    return acc
  }, {})
})

const clubIds = computed<Record<string, number>>(() => {
  return clubs.value.reduce<Record<string, number>>((acc, club) => {
    acc[club.name] = club.id
    return acc
  }, {})
})

watch(newFighter.country, async (newValue: string) => {
  const countryId = countryIds.value[newValue]
  newFighter.cuuntryID.value = countryId
  console.log('countryId:', countryId)
  cities.value = await commonDataStore.fetchCities(countryId)
  newFighter.city.value = ''
  newFighter.club.value = ''
})

watch(newFighter.city, async (newValue: string) => {
  const cityId = cityIds.value[newValue]
  newFighter.cityID.value = cityId
  console.log('cityId:', cityId)
  clubs.value = await commonDataStore.fetchClubs(cityId)
  newFighter.club.value = ''
})

watch(newFighter.club, (newValue: string) => {
  const clubId = clubIds.value[newValue]
  newFighter.clubID.value = clubId
  console.log('clubId:', clubId)
})

const saveNewFighter = async () => {
  const errorMsg: string[] = []

  if (!newFighter.name.value) errorMsg.push('имя бойца')
  if (!newFighter.surname.value) errorMsg.push('фамилия бойца')
  if (!newFighter.country.value) errorMsg.push('страна')
  if (!newFighter.city.value) errorMsg.push('город')

  if (errorMsg.length) {
    emptyFields = errorMsg.join(', ') + '.'
    alertData.title.value = 'Заполнены не все обязательные поля!'
    alertData.mainText.value = `Обязательны к заполнению следующие поля: ${emptyFields}`
    showAlert.value = true
    return
  }

  const saveDate = newFighter.birthday.value.length
    ? parseDateString(newFighter.birthday.value).toISOString().split('T')[0]
    : null

  const photo = newFighter.pic.value ? newFighter.pic.value : ''
  const saveData = {
    surname: newFighter.surname.value,
    name: newFighter.name.value,
    patronymic: newFighter.patronymic.value,
    birthday: saveDate,
    country_id: newFighter.cuuntryID.value,
    city_id: newFighter.cityID.value,
    club_id: newFighter.clubID.value,
    pic: photo
  }
  console.log('saveData:', saveData)

  try {
    await axios.post('http://localhost:3000/api/hmbtr/v1/fighters', saveData)
    router.push('/fighters')
  } catch (error: any) {
    alertData.title.value = error.response?.data.error
    alertData.mainText.value = 'Сохранение отменено.'
    showAlert.value = true
  }
}

const addCountry = () => {
  commonDataStore.alertData = ''
  alertData.title.value = 'Добавление страны'
  alertData.mainText.value = ''
  alertData.buttonText = 'Добавить страну'
  alertData.showInput.value = true
  alertData.buttonAction = async () => {
    const newCountry = commonDataStore.alertData.trim()
    if (newCountry) {
      await axios.post('http://localhost:3000/api/hmbtr/v1/countries', { name: newCountry })
      commonDataStore.alertData = ''
      countries.value = await commonDataStore.fetchCountries()
      alertData.showInput.value = false
      showAlert.value = false
    } else {
      alertData.mainText.value = 'Введите название страны.'
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
