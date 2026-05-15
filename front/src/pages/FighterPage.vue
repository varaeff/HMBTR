<script setup lang="ts">
import { reactive, ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFightersListStore } from '@/stores/fightersList'
import { useAuthStore } from '@/stores/auth'
import NoPhoto from '@/entities/NoPhoto.jpg'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ImageUpload } from '@/components/ui/imageUpload'
import { AlertWidget } from '@/widgets/AlertWidget'
import { DatePicker } from '@/widgets/DatePicker'
import { FullNameWidget } from '@/widgets/FullNameWidget'
import { SelectLocationBlock } from '@/widgets/SelectLocationBlock'
import { toISODate } from '@/lib/dateUtils'
import { useRequiredFields } from '@/composables/useRequiredFields'
import { useAddEntityAlert } from '@/composables/useAddEntityAlert'
import { CalendarDate } from '@internationalized/date'
import type { Fighter, FighterDB } from '@/model'
import { tData } from '@/lib/utils'
import { dateToString } from '@/lib/dateUtils'

const props = defineProps<{
  id: string
}>()

const router = useRouter()
const fighter = ref<Fighter | null | undefined>(null)
const FightersListStore = useFightersListStore()
const authStore = useAuthStore()
const fighterId = computed(() => +props.id)
const isEditing = ref(false)
const fighterBirthday = ref<CalendarDate | undefined>()
const { showAlert, alertData, handleRequestAdd } = useAddEntityAlert()

const editFighter = reactive({
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
  is_male: true
})

const buttonDisabled = useRequiredFields(editFighter, ['surname', 'name', 'country', 'city'])
const canEdit = computed(() => authStore.isAdmin)

onMounted(async () => {
  fighter.value = await FightersListStore.showFighterDetails(fighterId.value)
})

const fullName = computed(() => {
  if (!fighter.value) return ''
  const { surname, name, patronymic } = fighter.value
  return [surname, name, patronymic].filter(Boolean).join(' ')
})

const toCalendarDate = (date: Date | null | undefined) => {
  if (!date) return undefined

  return new CalendarDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

const fillEditForm = () => {
  if (!fighter.value) return

  editFighter.surname = fighter.value.surname
  editFighter.name = fighter.value.name
  editFighter.patronymic = fighter.value.patronymic ?? ''
  editFighter.country = fighter.value.country
  editFighter.city = fighter.value.city
  editFighter.club = fighter.value.club ?? ''
  editFighter.country_id = fighter.value.country_id ?? 0
  editFighter.city_id = fighter.value.city_id ?? 0
  editFighter.club_id = fighter.value.club_id ?? 0
  editFighter.pic = fighter.value.pic ?? ''
  editFighter.is_male = fighter.value.is_male ?? true
  fighterBirthday.value = toCalendarDate(fighter.value.birthday)
}

const startEditing = () => {
  fillEditForm()
  isEditing.value = true
}

const cancelEditing = () => {
  fillEditForm()
  isEditing.value = false
}

const saveFighter = async () => {
  if (!fighter.value || !canEdit.value) return

  const saveData: FighterDB = {
    id: fighter.value.id,
    surname: editFighter.surname,
    name: editFighter.name,
    patronymic: editFighter.patronymic,
    country_id: editFighter.country_id,
    city_id: editFighter.city_id,
    club_id: editFighter.club_id || null,
    pic: editFighter.pic,
    is_male: editFighter.is_male
  }

  if (fighterBirthday.value) {
    saveData.birthday = toISODate(fighterBirthday.value)
  }

  fighter.value = await FightersListStore.updateFighter(fighter.value.id, saveData)
  isEditing.value = false
}
</script>

<template>
  <h1 class="flex justify-center mb-4">{{ $t('fighterPageNamePage') }}</h1>
  <AlertWidget
    v-if="showAlert"
    :isError="alertData.isError.value"
    :title="alertData.title.value"
    :mainText="alertData.mainText.value"
    :showInput="alertData.showInput.value"
    :buttonAction="alertData.buttonAction"
    :closeAction="alertData.closeAction"
  />
  <form v-if="isEditing" @submit.prevent="saveFighter">
    <div class="flex justify-center max-w-244 pt-8 mx-auto gap-10 mb-10">
      <div class="min-w-100 flex justify-end">
        <ImageUpload v-model:imageSrc="editFighter.pic" />
      </div>
      <div class="min-w-100">
        <h5 class="mb-2">{{ $t('fighterPageEditFormLabel') }}</h5>
        <div class="flex flex-col gap-4">
          <FullNameWidget
            v-model:surname="editFighter.surname"
            v-model:name="editFighter.name"
            v-model:patronymic="editFighter.patronymic"
          />
          <SelectLocationBlock
            v-model:country="editFighter.country"
            v-model:city="editFighter.city"
            v-model:club="editFighter.club"
            v-model:country_id="editFighter.country_id"
            v-model:city_id="editFighter.city_id"
            v-model:club_id="editFighter.club_id"
            :needClub="true"
            @request-add="handleRequestAdd"
          />
          <div class="space-y-2">
            <Label>{{ $t('addFighterGenderLabel') }}</Label>
            <div class="flex gap-3">
              <Label class="flex cursor-pointer items-center gap-2">
                <input
                  v-model="editFighter.is_male"
                  type="radio"
                  name="fighter-gender"
                  :value="true"
                />
                {{ $t('addFighterGenderMale') }}
              </Label>
              <Label class="flex cursor-pointer items-center gap-2">
                <input
                  v-model="editFighter.is_male"
                  type="radio"
                  name="fighter-gender"
                  :value="false"
                />
                {{ $t('addFighterGenderFemale') }}
              </Label>
            </div>
          </div>
          <DatePicker :placeholder="$t('addFighterDateOfBirth')" v-model:date="fighterBirthday" />
        </div>
      </div>
    </div>
    <div class="flex justify-center gap-3">
      <Button type="submit" variant="default" size="default" :disabled="buttonDisabled">
        {{ $t('fighterPageSaveButton') }}
      </Button>
      <Button type="button" variant="outline" size="default" @click="cancelEditing">
        {{ $t('fighterPageCancelButton') }}
      </Button>
    </div>
  </form>
  <div v-else class="flex justify-center max-w-244 pt-8 mx-auto gap-10 mb-10">
    <div
      class="min-w-100 flex justify-end grayscale hover:grayscale-0 transition-all duration-1000 hover:scale-[1.1]"
    >
      <img :src="fighter?.pic || NoPhoto" :alt="fullName" />
    </div>
    <ul class="min-w-100">
      <li class="flex items-center gap-1">
        <h5>{{ $t('fighterPageFullName') }}</h5>
        <div>
          {{ tData(fullName) }}
        </div>
      </li>
      <li class="flex items-center gap-1">
        <h5>{{ $t('fighterPageCountry') }}</h5>
        <div>{{ tData(fighter?.country as string) }}</div>
      </li>
      <li class="flex items-center gap-1">
        <h5>{{ $t('fighterPageCity') }}</h5>
        <div>{{ tData(fighter?.city as string) }}</div>
      </li>
      <li v-show="fighter?.club" class="flex items-center gap-1">
        <h5>{{ $t('fighterPageClub') }}</h5>
        <div>{{ tData(fighter?.club as string) }}</div>
      </li>
      <li v-show="fighter?.birthday" class="flex items-center gap-1">
        <h5>{{ $t('fighterPageDateOfBirth') }}</h5>
        <div>{{ dateToString(fighter?.birthday) }}</div>
      </li>
    </ul>
  </div>
  <div v-if="!isEditing" class="flex justify-center gap-3">
    <Button v-if="canEdit" variant="outline" size="default" @click="startEditing">
      {{ $t('fighterPageEditButton') }}
    </Button>
    <Button variant="default" size="default" @click="router.push(`/fighters`)">
      {{ $t('fighterPageBackButton') }}
    </Button>
  </div>
</template>
