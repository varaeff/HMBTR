<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { CalendarDate } from '@internationalized/date'
import type { Fighter, FighterDB } from '@/model'

import { useFightersListStore } from '@/stores/fightersList'

import { ImageUpload } from '@/components/ui/imageUpload'
import { Button } from '@/components/ui/button'

import ButtonAlert from '@/widgets/ButtonAlert.vue'
import { DynamicLabeledInput } from '@/widgets/DynamicLabeledInput'
import { DatePicker } from '@/widgets/DatePicker'
import { SelectLocationBlock } from '@/widgets/SelectLocationBlock'

import { toISODate, toDateFormat } from '@/lib/utils'
import { useRequiredFields } from '@/composables/useRequiredFields'
import { useAddEntityAlert } from '@/composables/useAddEntityAlert'

const router = useRouter()
const fightersListStore = useFightersListStore()

const newFighter = reactive({
  surname: '',
  name: '',
  patronymic: '',
  country: '',
  city: '',
  club: '',
  country_id: 0,
  city_id: 0,
  club_id: 0,
  pic: '',
  birthday: null as Date | null
})

const fighterBirthday = ref<CalendarDate | undefined>()

const buttonDisabled = useRequiredFields(newFighter, ['surname', 'name', 'country', 'city'])
const { showAlert, alertData, handleRequestAdd } = useAddEntityAlert()

const saveNewFighter = async () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { birthday, ...rest } = newFighter
  const saveData: FighterDB = {
    ...rest
  }

  if (fighterBirthday.value) {
    saveData.birthday = toISODate(fighterBirthday.value)
    newFighter.birthday = toDateFormat(fighterBirthday.value)
  }

  const storeId = fightersListStore.getMaxId

  const storeData: Fighter = {
    id: storeId,
    ...newFighter
  }

  await fightersListStore.addNewFighter(saveData, storeData)
  router.push('/fighters')
}
</script>

<template>
  <h1 class="flex justify-center">Добавление нового бойца</h1>
  <p class="flex justify-center">
    Обязательны к заполнению следующие поля: фамилия, имя, страна, город
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
              <DynamicLabeledInput placeholder="Фамилия" v-model:value="newFighter.surname" />
              <DynamicLabeledInput :placeholder="'Имя'" v-model:value="newFighter.name" />
              <DynamicLabeledInput
                :placeholder="'Отчество'"
                v-model:value="newFighter.patronymic"
              />
              <SelectLocationBlock
                v-model:country="newFighter.country"
                v-model:city="newFighter.city"
                v-model:club="newFighter.club"
                v-model:country_id="newFighter.country_id"
                v-model:city_id="newFighter.city_id"
                v-model:club_id="newFighter.club_id"
                :needClub="true"
                @request-add="handleRequestAdd"
              />
              <DatePicker placeholder="Дата рождения" v-model:date="fighterBirthday" />
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
