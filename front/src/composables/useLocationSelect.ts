import { ref, computed, watch, onMounted } from 'vue'
import { useCommonDataStore } from '@/stores/commonData'
import type { LocationProps } from '@/model'

export function useLocationSelect(props: LocationProps, emit: any) {
  const store = useCommonDataStore()

  const countries = ref<{ id: number; name: string }[]>([])
  const cities = ref<{ id: number; name: string }[]>([])
  const clubs = ref<{ id: number; name: string }[]>([])

  const localCountry = ref(props.country ?? '')
  const localCity = ref(props.city ?? '')
  const localClub = ref(props.club ?? '')

  const countryModel = computed({
    get: () => localCountry.value,
    set: (v: string) => {
      localCountry.value = v
      emit('update:country', v)
    }
  })
  const cityModel = computed({
    get: () => localCity.value,
    set: (v: string) => {
      localCity.value = v
      emit('update:city', v)
    }
  })
  const clubModel = computed({
    get: () => localClub.value,
    set: (v: string) => {
      localClub.value = v
      emit('update:club', v)
    }
  })

  const countryNames = computed(() => countries.value.map((c) => c.name))
  const cityNames = computed(() => cities.value.map((c) => c.name))
  const clubNames = computed(() => clubs.value.map((c) => c.name))

  const findIdByName = (list: { id: number; name: string }[], name: string) =>
    list.find((i) => i.name === name)?.id ?? 0

  watch(
    () => props.country,
    (v) => {
      if (v !== localCountry.value) localCountry.value = v ?? ''
    }
  )
  watch(
    () => props.city,
    (v) => {
      if (v !== localCity.value) localCity.value = v ?? ''
    }
  )
  watch(
    () => props.club,
    (v) => {
      if (v !== localClub.value) localClub.value = v ?? ''
    }
  )

  onMounted(async () => {
    countries.value = await store.fetchCountries()
  })

  watch(countryModel, async (newVal) => {
    const id = findIdByName(countries.value, newVal)
    emit('update:country_id', id)

    localCity.value = ''
    emit('update:city', '')
    emit('update:city_id', 0)
    localClub.value = ''
    emit('update:club', '')
    emit('update:club_id', 0)

    if (!id) {
      cities.value = []
      clubs.value = []
      return
    }

    cities.value = await store.fetchCities(id)
  })

  watch(cityModel, async (newVal) => {
    const id = findIdByName(cities.value, newVal)
    emit('update:city_id', id)

    localClub.value = ''
    emit('update:club', '')
    emit('update:club_id', 0)
    if (!id) {
      clubs.value = []
      return
    }

    clubs.value = await store.fetchClubs(id)
  })

  watch(clubModel, (newVal) => {
    const id = findIdByName(clubs.value, newVal)
    emit('update:club_id', id)
  })

  const safeAddEntity = async (type: 'country' | 'city' | 'club', name: string) => {
    if (!name.trim()) throw new Error('Название не может быть пустым')

    if (type === 'country') {
      await store.addCountry(name)
      countries.value = await store.fetchCountries()
    } else if (type === 'city') {
      const country_id = findIdByName(countries.value, countryModel.value)
      if (!country_id) throw new Error('Не выбрана страна')
      await store.addCity(country_id, name)
      cities.value = await store.fetchCities(country_id)
    } else if (type === 'club') {
      const city_id = findIdByName(cities.value, cityModel.value)
      if (!city_id) throw new Error('Не выбран город')
      await store.addClub(city_id, name)
      clubs.value = await store.fetchClubs(city_id)
    }
  }

  const onAddCountry = (emitRequestAdd: (payload: any) => void) => {
    emitRequestAdd({
      title: 'Добавление страны',
      performAdd: (name: string) => safeAddEntity('country', name)
    })
  }

  const onAddCity = (emitRequestAdd: (payload: any) => void) => {
    emitRequestAdd({
      title: 'Добавление города',
      performAdd: (name: string) => safeAddEntity('city', name)
    })
  }

  const onAddClub = (emitRequestAdd: (payload: any) => void) => {
    emitRequestAdd({
      title: 'Добавление клуба',
      performAdd: (name: string) => safeAddEntity('club', name)
    })
  }

  return {
    countryModel,
    cityModel,
    clubModel,
    countryNames,
    cityNames,
    clubNames,
    onAddCountry,
    onAddCity,
    onAddClub
  }
}
