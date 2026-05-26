<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFightersListStore } from '@/stores/fightersList'
import { ImageUpload } from '@/components/ui/imageUpload'
import { Button } from '@/components/ui/button'
import { AlertWidget } from '@/widgets/AlertWidget'
import { DatePicker } from '@/widgets/DatePicker'
import { FullNameWidget } from '@/widgets/FullNameWidget'
import { SelectLocationBlock } from '@/widgets/SelectLocationBlock'
import { Label } from '@/components/ui/label'
import { toISODate, toDateFormat } from '@/lib/dateUtils'
import { useRequiredFields } from '@/composables/useRequiredFields'
import { useAddEntityAlert } from '@/composables/useAddEntityAlert'
import type { CalendarDate } from '@internationalized/date'
import type { Fighter, FighterDB } from '@/model'

const router = useRouter()
const route = useRoute()
const fightersListStore = useFightersListStore()

const tournamentId = route.hash.slice(1)

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
  is_male: true,
  birthday: null as Date | null
})

const fighterBirthday = ref<CalendarDate | undefined>()

const buttonDisabled = useRequiredFields(newFighter, ['surname', 'name', 'country', 'city'])
const { showAlert, alertData, handleRequestAdd } = useAddEntityAlert()

const saveNewFighter = async () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { birthday, ...rest } = newFighter
  const saveData: FighterDB = {
    ...rest,
    club_id: newFighter.club_id || null
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

  const url = tournamentId ? `/tournament/${tournamentId}` : '/fighters'
  router.push(url)
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
    <header class="flex flex-col items-center gap-2 text-center">
      <h1 class="text-2xl font-semibold sm:text-3xl">{{ $t('addFighterNamePage') }}</h1>
      <p class="max-w-2xl text-sm text-muted-foreground sm:text-base">{{ $t('addFighterHint') }}</p>
    </header>

    <AlertWidget
      v-if="showAlert"
      :isError="alertData.isError.value"
      :title="alertData.title.value"
      :mainText="alertData.mainText.value"
      :showInput="alertData.showInput.value"
      :buttonAction="alertData.buttonAction"
      :closeAction="alertData.closeAction"
    />

    <form class="flex flex-col gap-6" @submit.prevent="saveNewFighter">
      <div class="grid gap-6 lg:grid-cols-[minmax(16rem,24rem)_minmax(0,1fr)]">
        <div class="min-h-72 overflow-hidden rounded-lg border bg-card">
          <ImageUpload v-model:imageSrc="newFighter.pic" />
        </div>

        <section class="min-w-0 rounded-lg border bg-card p-4 sm:p-6">
          <h2 class="mb-4 text-lg font-semibold">{{ $t('addFighterFormLabel') }}</h2>
          <div class="flex flex-col gap-4">
            <FullNameWidget
              v-model:surname="newFighter.surname"
              v-model:name="newFighter.name"
              v-model:patronymic="newFighter.patronymic"
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
            <div class="flex flex-col gap-2">
              <Label>{{ $t('addFighterGenderLabel') }}</Label>
              <div class="flex flex-wrap gap-3">
                <Label class="flex cursor-pointer items-center gap-2">
                  <input
                    v-model="newFighter.is_male"
                    type="radio"
                    name="fighter-gender"
                    :value="true"
                  />
                  {{ $t('addFighterGenderMale') }}
                </Label>
                <Label class="flex cursor-pointer items-center gap-2">
                  <input
                    v-model="newFighter.is_male"
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
        </section>
      </div>

      <div class="flex justify-center">
        <Button type="submit" variant="default" size="default" :disabled="buttonDisabled">
          {{ $t('addFighterSaveData') }}
        </Button>
      </div>
    </form>
  </main>
</template>
