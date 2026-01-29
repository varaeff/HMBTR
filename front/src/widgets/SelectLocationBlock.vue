<script setup lang="ts">
import SelectComponent from '@/components/SelectComponent.vue'
import { useLocationSelect } from '@/composables/useLocationSelect'
import type { LocationProps } from '@/shared/model'

const props = defineProps({
  country: String,
  city: String,
  club: String,
  countryID: Number,
  cityID: Number,
  clubID: Number,
  needClub: Boolean
})

const locationProps: LocationProps = {
  country: props.country ?? '',
  city: props.city ?? '',
  club: props.club ?? '',
  countryID: props.countryID ?? 0,
  cityID: props.cityID ?? 0,
  clubID: props.clubID ?? 0,
  needClub: props.needClub
}

const emit = defineEmits([
  'update:country',
  'update:city',
  'update:club',
  'update:countryID',
  'update:cityID',
  'update:clubID',
  'request-add'
])

const {
  countryModel,
  cityModel,
  clubModel,
  countryNames,
  cityNames,
  clubNames,
  onAddCountry,
  onAddCity,
  onAddClub
} = useLocationSelect(locationProps, emit)

const handleAddCountry = () => onAddCountry((payload) => emit('request-add', payload))
const handleAddCity = () => onAddCity((payload) => emit('request-add', payload))
const handleAddClub = () => onAddClub((payload) => emit('request-add', payload))
</script>

<template>
  <div class="fieldsets-batch fieldsets-batch--with-single-field">
    <SelectComponent :placeholder="'Страна'" :values="countryNames" v-model:value="countryModel" />
    <button type="button" class="btn btn-link btn-medium" @click="handleAddCountry">
      Добавить страну
    </button>
  </div>

  <div class="fieldsets-batch fieldsets-batch--with-single-field">
    <SelectComponent :placeholder="'Город'" :values="cityNames" v-model:value="cityModel" />
    <button
      v-show="countryModel"
      type="button"
      class="btn btn-link btn-medium"
      @click="handleAddCity"
    >
      Добавить город
    </button>
  </div>

  <div class="fieldsets-batch fieldsets-batch--with-single-field" v-if="needClub">
    <SelectComponent :placeholder="'Клуб'" :values="clubNames" v-model:value="clubModel" />
    <button v-show="cityModel" type="button" class="btn btn-link btn-medium" @click="handleAddClub">
      Добавить клуб
    </button>
  </div>
</template>
