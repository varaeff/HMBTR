<script setup lang="ts">
import { SelectWidget } from '@/widgets/SelectWidget'
import { Button } from '@/components/ui/button'
import { useLocationSelect } from '@/composables/useLocationSelect'
import type { LocationProps } from '@/model'

const props = defineProps({
  country: String,
  city: String,
  club: String,
  country_id: Number,
  city_id: Number,
  club_id: Number,
  needClub: Boolean
})

const locationProps: LocationProps = {
  country: props.country ?? '',
  city: props.city ?? '',
  club: props.club ?? '',
  country_id: props.country_id ?? 0,
  city_id: props.city_id ?? 0,
  club_id: props.club_id ?? 0,
  needClub: props.needClub
}

const emit = defineEmits([
  'update:country',
  'update:city',
  'update:club',
  'update:country_id',
  'update:city_id',
  'update:club_id',
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
  <div class="flex">
    <SelectWidget
      :placeholder="$t('LocationBlockCountry')"
      :values="countryNames"
      v-model:value="countryModel"
    />
    <Button type="button" variant="ghost" @click="handleAddCountry">{{
      $t('LocationBlockAddCountry')
    }}</Button>
  </div>

  <div class="flex">
    <SelectWidget
      :placeholder="$t('LocationBlockCity')"
      :values="cityNames"
      v-model:value="cityModel"
    />
    <Button v-show="countryModel" type="button" variant="ghost" @click="handleAddCity">
      {{ $t('LocationBlockAddCity') }}
    </Button>
  </div>

  <div class="flex" v-if="needClub">
    <SelectWidget
      :placeholder="$t('LocationBlockClub')"
      :values="clubNames"
      v-model:value="clubModel"
    />
    <Button v-show="cityModel" type="button" variant="ghost" @click="handleAddClub">
      {{ $t('LocationBlockAddClub') }}
    </Button>
  </div>
</template>
