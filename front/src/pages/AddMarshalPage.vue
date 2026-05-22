<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useTranslation } from 'i18next-vue'
import { useMarshalsListStore } from '@/stores/marshalsList'
import { ImageUpload } from '@/components/ui/imageUpload'
import { Button } from '@/components/ui/button'
import { AlertWidget } from '@/widgets/AlertWidget'
import { FullNameWidget } from '@/widgets/FullNameWidget'
import { SelectLocationBlock } from '@/widgets/SelectLocationBlock'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useRequiredFields } from '@/composables/useRequiredFields'
import { useAddEntityAlert } from '@/composables/useAddEntityAlert'
import type { Marshal, MarshalDB } from '@/model'

const router = useRouter()
const { i18next } = useTranslation()
const marshalsListStore = useMarshalsListStore()

const newMarshal = reactive({
  surname: '',
  name: '',
  patronymic: '',
  country: '',
  city: '',
  country_id: 0,
  city_id: 0,
  category_id: 0,
  pic: ''
})

const buttonDisabled = useRequiredFields(newMarshal, [
  'surname',
  'name',
  'country',
  'city',
  'category_id'
])
const { showAlert, alertData, handleRequestAdd } = useAddEntityAlert()

const currentLanguage = computed(() => (i18next.language === 'en' ? 'en' : 'ru'))
const categoryName = (categoryId: number) => {
  const category = marshalsListStore.categories.find((item) => item.id === categoryId)
  if (!category) return ''
  return currentLanguage.value === 'en' ? category.name_en : category.name_ru
}

const saveNewMarshal = async () => {
  const saveData: MarshalDB = {
    surname: newMarshal.surname,
    name: newMarshal.name,
    patronymic: newMarshal.patronymic,
    country_id: newMarshal.country_id,
    city_id: newMarshal.city_id,
    category_id: newMarshal.category_id,
    pic: newMarshal.pic
  }

  const storeData: Marshal = {
    id: marshalsListStore.getMaxId,
    ...newMarshal,
    category: marshalsListStore.categories.find((item) => item.id === newMarshal.category_id)
  }

  await marshalsListStore.addNewMarshal(saveData, storeData)
  router.push('/marshals')
}

onMounted(async () => {
  await marshalsListStore.fetchCategories()
})
</script>

<template>
  <h1 class="flex justify-center mb-4">{{ $t('addMarshalNamePage') }}</h1>
  <p class="flex justify-center">{{ $t('addMarshalHint') }}</p>
  <AlertWidget
    v-if="showAlert"
    :isError="alertData.isError.value"
    :title="alertData.title.value"
    :mainText="alertData.mainText.value"
    :showInput="alertData.showInput.value"
    :buttonAction="alertData.buttonAction"
    :closeAction="alertData.closeAction"
  />
  <form @submit.prevent="saveNewMarshal">
    <div class="flex justify-center max-w-244 pt-8 mx-auto gap-10 mb-10">
      <div class="min-w-100 flex justify-end">
        <ImageUpload v-model:imageSrc="newMarshal.pic" />
      </div>
      <div class="min-w-100">
        <h5 class="mb-2">{{ $t('addMarshalFormLabel') }}</h5>
        <div class="flex flex-col gap-4">
          <FullNameWidget
            v-model:surname="newMarshal.surname"
            v-model:name="newMarshal.name"
            v-model:patronymic="newMarshal.patronymic"
          />
          <SelectLocationBlock
            v-model:country="newMarshal.country"
            v-model:city="newMarshal.city"
            v-model:country_id="newMarshal.country_id"
            v-model:city_id="newMarshal.city_id"
            :needClub="false"
            @request-add="handleRequestAdd"
          />
          <div class="space-y-2">
            <Label for="marshal-category">{{ $t('marshalCategoryLabel') }}</Label>
            <NativeSelect
              id="marshal-category"
              v-model="newMarshal.category_id"
              class="w-full"
              :aria-label="$t('marshalCategoryLabel')"
            >
              <NativeSelectOption :value="0">{{ $t('marshalCategoryPlaceholder') }}</NativeSelectOption>
              <NativeSelectOption
                v-for="category in marshalsListStore.categories"
                :key="category.id"
                :value="category.id"
              >
                {{ categoryName(category.id) }}
              </NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
      </div>
    </div>
    <div class="flex justify-center">
      <Button type="submit" variant="default" size="default" :disabled="buttonDisabled">
        {{ $t('addMarshalSaveData') }}
      </Button>
    </div>
  </form>
</template>
