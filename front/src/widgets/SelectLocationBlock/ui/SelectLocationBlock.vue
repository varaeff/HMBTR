<template>
  <div class="fieldsets-batch fieldsets-batch--with-single-field">
    <SelectComponent :placeholder="'Страна'" :values="countryNames" v-model:value="countryModel" />
    <button type="button" class="btn btn-link btn-medium" @click="onAddCountry">
      Добавить страну
    </button>
  </div>

  <div class="fieldsets-batch fieldsets-batch--with-single-field">
    <SelectComponent :placeholder="'Город'" :values="cityNames" v-model:value="cityModel" />
    <button v-show="countryModel" type="button" class="btn btn-link btn-medium" @click="onAddCity">
      Добавить город
    </button>
  </div>

  <div class="fieldsets-batch fieldsets-batch--with-single-field" v-if="needClub">
    <SelectComponent :placeholder="'Клуб'" :values="clubsNames" v-model:value="clubModel" />
    <button v-show="cityModel" type="button" class="btn btn-link btn-medium" @click="onAddClub">
      Добавить клуб
    </button>
  </div>
</template>

<script setup lang="ts">
import SelectComponent from '@/widgets/SelectComponent'
import { computed, ref, watch, onMounted } from 'vue'
import type { PropType } from 'vue'
import { useCommonDataStore } from '@/app/stores/commonData'
import axios from 'axios'

const props = defineProps({
  country: { type: String as PropType<string>, default: '' },
  city: { type: String as PropType<string>, default: '' },
  club: { type: String as PropType<string>, default: '' },
  countryID: { type: Number as PropType<number>, default: 0 },
  cityID: { type: Number as PropType<number>, default: 0 },
  clubID: { type: Number as PropType<number>, default: 0 },
  needClub: { type: Boolean as PropType<boolean>, default: false }
})

const emit = defineEmits([
  'update:country',
  'update:city',
  'update:club',
  'update:countryID',
  'update:cityID',
  'update:clubID',
  'request-add' // payload: { title: string, performAdd: (name: string) => Promise<void> }
])

const commonDataStore = useCommonDataStore()

const countries = ref<{ id: number; name: string }[]>([])
const cities = ref<{ id: number; name: string }[]>([])
const clubs = ref<{ id: number; name: string }[]>([])

const countryModel = computed<string>({
  get: () => props.country,
  set: (v: string) => emit('update:country', v)
})
const cityModel = computed<string>({
  get: () => props.city,
  set: (v: string) => emit('update:city', v)
})
const clubModel = computed<string>({
  get: () => props.club,
  set: (v: string) => emit('update:club', v)
})

const countryNames = computed(() => countries.value.map((c) => c.name))
const cityNames = computed(() => cities.value.map((c) => c.name))
const clubsNames = computed(() => clubs.value.map((c) => c.name))

const findCountryIdByName = (name: string) => countries.value.find((c) => c.name === name)?.id ?? 0
const findCityIdByName = (name: string) => cities.value.find((c) => c.name === name)?.id ?? 0
const findClubIdByName = (name: string) => clubs.value.find((c) => c.name === name)?.id ?? 0

onMounted(async () => {
  try {
    countries.value = await commonDataStore.fetchCountries()
  } catch (e) {
    // parent handles error UI; component stays silent
    console.error('SelectLocationBlock: fetchCountries failed', e)
  }
})

// when country changes - update countryID, load cities, reset city/club
watch(
  () => countryModel.value,
  async (newVal) => {
    const id = findCountryIdByName(newVal)
    emit('update:countryID', id)
    if (!id) {
      cities.value = []
      emit('update:city', '')
      emit('update:cityID', 0)
      emit('update:club', '')
      emit('update:clubID', 0)
      return
    }
    try {
      cities.value = await commonDataStore.fetchCities(id)
      emit('update:city', '')
      emit('update:club', '')
      emit('update:cityID', 0)
      emit('update:clubID', 0)
    } catch (e) {
      console.error('SelectLocationBlock: fetchCities failed', e)
    }
  }
)

// when city changes - update cityID, load clubs, reset club
watch(
  () => cityModel.value,
  async (newVal) => {
    const id = findCityIdByName(newVal)
    emit('update:cityID', id)
    if (!id) {
      clubs.value = []
      emit('update:club', '')
      emit('update:clubID', 0)
      return
    }
    try {
      clubs.value = await commonDataStore.fetchClubs(id)
      emit('update:club', '')
      emit('update:clubID', 0)
    } catch (e) {
      console.error('SelectLocationBlock: fetchClubs failed', e)
    }
  }
)

// when club changes - update clubID
watch(
  () => clubModel.value,
  (newVal) => {
    const id = findClubIdByName(newVal)
    emit('update:clubID', id)
  }
)

// When user clicks "Добавить X" -> emit request-add with performAdd callback.
// Parent should open input dialog and call performAdd(name) when confirmed.
// performAdd returns a promise and component will refetch lists after success.
const onAddCountry = () => {
  const title = 'Добавление страны'
  const performAdd = async (name: string) => {
    await axios.post(`${import.meta.env.VITE_API_BASE_URL}/countries`, { name })
    countries.value = await commonDataStore.fetchCountries()
  }
  emit('request-add', { title, performAdd })
}

const onAddCity = () => {
  const title = 'Добавление города'
  const performAdd = async (name: string) => {
    const country_id = findCountryIdByName(countryModel.value)
    if (!country_id) throw new Error('Не выбрана страна')
    await axios.post(`${import.meta.env.VITE_API_BASE_URL}/cities`, { name, country_id })
    cities.value = await commonDataStore.fetchCities(country_id)
  }
  emit('request-add', { title, performAdd })
}

const onAddClub = () => {
  const title = 'Добавление клуба'
  const performAdd = async (name: string) => {
    const city_id = findCityIdByName(cityModel.value)
    if (!city_id) throw new Error('Не выбран город')
    await axios.post(`${import.meta.env.VITE_API_BASE_URL}/clubs`, { name, city_id })
    clubs.value = await commonDataStore.fetchClubs(city_id)
  }
  emit('request-add', { title, performAdd })
}
</script>
