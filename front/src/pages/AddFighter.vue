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
              <div class="fieldsets-batch fieldsets-batch--with-single-field">
                <SelectComponent
                  :placeholder="'Страна'"
                  :values="countryNames"
                  v-model:value="newFighter.country"
                />
                <button type="button" class="btn btn-link btn-medium" @click="addCountry">
                  Добавить страну
                </button>
              </div>
              <div class="fieldsets-batch fieldsets-batch--with-single-field">
                <SelectComponent
                  :placeholder="'Город'"
                  :values="cityNames"
                  v-model:value="newFighter.city"
                />
                <button
                  v-show="newFighter.country"
                  type="button"
                  class="btn btn-link btn-medium"
                  @click="addCity"
                >
                  Добавить город
                </button>
              </div>
              <div class="fieldsets-batch fieldsets-batch--with-single-field">
                <SelectComponent
                  :placeholder="'Клуб'"
                  :values="clubsNames"
                  v-model:value="newFighter.club"
                />
                <button
                  v-show="newFighter.city"
                  type="button"
                  class="btn btn-link btn-medium"
                  @click="addClub"
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
import { computed, onMounted, ref, watch, reactive } from 'vue'
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

const countries = ref<Country[]>([])
const cities = ref<City[]>([])
const clubs = ref<Club[]>([])

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

onMounted(async () => {
  try {
    countries.value = await commonDataStore.fetchCountries()
  } catch (e) {
    console.error('Failed to fetch countries', e)
    alertData.title.value = 'Ошибка'
    alertData.mainText.value = 'Не удалось загрузить список стран.'
    alertData.isError.value = true
    showAlert.value = true
  }
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
    if (country && country.name) acc[country.name] = country.id
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

watch(
  () => newFighter.country,
  async (newValue: string) => {
    const countryId = countryIds.value[newValue]
    newFighter.countryID = countryId ?? 0
    if (!countryId) {
      cities.value = []
      newFighter.city = ''
      newFighter.cityID = 0
      return
    }
    try {
      cities.value = await commonDataStore.fetchCities(countryId)
      newFighter.city = ''
      newFighter.club = ''
    } catch (e) {
      console.error('Failed to fetch cities', e)
    }
  }
)

watch(
  () => newFighter.city,
  async (newValue: string) => {
    if (!newValue) {
      newFighter.cityID = 0
      clubs.value = []
      newFighter.club = ''
      return
    }
    const cityId = cityIds.value[newValue]
    newFighter.cityID = cityId ?? 0
    if (!cityId) {
      clubs.value = []
      newFighter.club = ''
      return
    }
    try {
      clubs.value = await commonDataStore.fetchClubs(cityId)
      newFighter.club = ''
    } catch (e) {
      console.error('Failed to fetch clubs', e)
    }
  }
)

watch(
  () => newFighter.club,
  (newValue: string) => {
    const clubId = clubIds.value[newValue]
    newFighter.clubID = clubId
    console.log('clubId:', clubId)
  }
)

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
    await axios.post('http://localhost:3000/api/hmbtr/v1/fighters', saveData)
    router.push('/fighters')
  } catch (error: any) {
    alertData.title.value = error?.response?.data?.error ?? 'Ошибка'
    alertData.mainText.value = 'Сохранение отменено.'
    showAlert.value = true
  } finally {
    loading.value = false
  }
}

const addCountry = () => {
  alertPrefetch('Добавление страны')
  alertData.buttonAction = async () => {
    const newCountry = commonDataStore.alertData.trim()
    if (newCountry) {
      try {
        await axios.post('http://localhost:3000/api/hmbtr/v1/countries', { name: newCountry })
        countries.value = await commonDataStore.fetchCountries()
        postFetch()
      } catch (error: any) {
        errorFetch('страны')
      }
    } else {
      alertData.mainText.value = 'Введите название страны.'
    }
  }
  showAlert.value = true
}

const addCity = () => {
  alertPrefetch('Добавление города')
  alertData.buttonAction = async () => {
    const newCity = commonDataStore.alertData.trim()
    if (newCity) {
      try {
        await axios.post('http://localhost:3000/api/hmbtr/v1/cities', {
          name: newCity,
          id: Number(newFighter.countryID)
        })
        cities.value = await commonDataStore.fetchCities(newFighter.countryID)
        postFetch()
      } catch (error: any) {
        errorFetch('города')
      }
    } else {
      alertData.mainText.value = 'Введите название города.'
    }
  }
  showAlert.value = true
}

const addClub = () => {
  alertPrefetch('Добавление клуба')
  alertData.buttonAction = async () => {
    const newClub = commonDataStore.alertData.trim()
    if (newClub) {
      try {
        await axios.post('http://localhost:3000/api/hmbtr/v1/clubs', {
          name: newClub,
          id: Number(newFighter.cityID)
        })
        clubs.value = await commonDataStore.fetchClubs(newFighter.cityID)
        postFetch()
      } catch (error: any) {
        errorFetch('клуба')
      }
    } else {
      alertData.mainText.value = 'Введите название клуба.'
    }
  }
  showAlert.value = true
}

const alertPrefetch = (title: string) => {
  alertData.isError.value = false
  alertData.title.value = `${title}`
  alertData.mainText.value = ''
  alertData.buttonText = 'ОК'
  alertData.showInput.value = true
}

const postFetch = () => {
  commonDataStore.alertData = ''
  alertData.showInput.value = false
  alertData.isError.value = true
  showAlert.value = false
}

const errorFetch = (entity: string) => {
  alertData.title.value = 'Ошибка'
  alertData.mainText.value = `Произошла ошибка при добавлении ${entity}.`
  alertData.showInput.value = false
  alertData.isError.value = true
  showAlert.value = true
}
</script>

<style scoped>
#undefined-wrapper {
  border: 1px solid #808f9d;
}
</style>
