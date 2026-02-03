<script setup lang="ts">
import { reactive } from 'vue'
import { useFightersListStore } from '@/stores/fightersList'
import { useRouter } from 'vue-router'
import ButtonAlert from '@/widgets/ButtonAlert.vue'
import ImageUpload from '@/components/ImageUpload.vue'
import InputTextComponent from '@/components/InputTextComponent.vue'
import VueCtkDateTimePicker from 'vue-ctk-date-time-picker'
import 'vue-ctk-date-time-picker/dist/vue-ctk-date-time-picker.css'
import { toISODate } from '@/features/formatDate'
import SelectLocationBlock from '@/widgets/SelectLocationBlock.vue'
import { useRequiredFields } from '@/composables/useRequiredFields'
import { useAddEntityAlert } from '@/composables/useAddEntityAlert'
import type { Fighter, FighterDB } from '@/shared/model'

const router = useRouter()
const fightersListStore = useFightersListStore()

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
  photo: '',
  birthday: null
})

const buttonDisabled = useRequiredFields(newFighter, ['surname', 'name', 'country', 'city'])
const { showAlert, alertData, handleRequestAdd } = useAddEntityAlert()

const saveNewFighter = async () => {
  const photo = newFighter.photo || ''
  const saveData: FighterDB = {
    surname: newFighter.surname,
    name: newFighter.name,
    patronymic: newFighter.patronymic,
    country_id: Number(newFighter.countryID),
    city_id: Number(newFighter.cityID),
    club_id: Number(newFighter.clubID),
    pic: photo
  }

  if (newFighter.birthday) {
    saveData.birthday = toISODate(newFighter.birthday)
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
  <h1 class="title">Добавление нового бойца</h1>
  <p class="title">Обязательны к заполнению следующие поля: фамилия, имя, страна, город</p>
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
        <ImageUpload v-model:imageSrc="newFighter.photo" />
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
