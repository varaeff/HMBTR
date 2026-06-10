<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useTranslation } from 'i18next-vue'
import { useMarshalsListStore } from '@/stores/marshalsList'
import NoPhoto from '@/entities/NoPhoto.jpg'
import { Button } from '@/components/ui/button'
import { ImageUpload } from '@/components/ui/imageUpload'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { AlertWidget } from '@/widgets/AlertWidget'
import { FullNameWidget } from '@/widgets/FullNameWidget'
import { SelectLocationBlock } from '@/widgets/SelectLocationBlock'
import { useRequiredFields } from '@/composables/useRequiredFields'
import { useAddEntityAlert } from '@/composables/useAddEntityAlert'
import { hasMarshalManageAccess } from '@/lib/checkAccess'
import { dateToString } from '@/lib/dateUtils'
import { tData } from '@/lib/utils'
import type { Marshal, MarshalDB, MarshalProfileTournament } from '@/model'

const props = defineProps<{
  id: string
}>()

const router = useRouter()
const { i18next } = useTranslation()
const marshalsListStore = useMarshalsListStore()
const marshal = ref<Marshal | null>(null)
const judgedTournaments = ref<MarshalProfileTournament[]>([])
const isEditing = ref(false)
const isLoading = ref(false)
const loadError = ref('')
const initialDocumentTitle = document.title
const { showAlert, alertData, handleRequestAdd } = useAddEntityAlert()

const editMarshal = reactive({
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

const marshalId = computed(() => +props.id)
const canEdit = computed(() => hasMarshalManageAccess())
const currentLanguage = computed(() => (i18next.language === 'en' ? 'en' : 'ru'))
const buttonDisabled = useRequiredFields(editMarshal, [
  'surname',
  'name',
  'country',
  'city',
  'category_id'
])

const fullName = computed(() => {
  if (!marshal.value) return ''
  const { surname, name, patronymic } = marshal.value
  return [surname, name, patronymic].filter(Boolean).join(' ')
})

const pageTitle = computed(() => tData(fullName.value || i18next.t('marshalPageNamePage')))
const locationLine = computed(() =>
  [marshal.value?.country, marshal.value?.city]
    .filter((item): item is string => Boolean(item))
    .map((item) => tData(item, currentLanguage.value))
    .join(', ')
)

const categoryName = (categoryId: number) => {
  const category = marshalsListStore.categories.find((item) => item.id === categoryId)
  if (!category) return ''
  return currentLanguage.value === 'en' ? category.name_en : category.name_ru
}

const formatProfileDate = (date: string | null) => dateToString(date ? new Date(date) : null)

const loadMarshal = async () => {
  isLoading.value = true
  loadError.value = ''

  try {
    const profile = await marshalsListStore.getMarshalProfile(marshalId.value)
    marshal.value = profile.marshal
    judgedTournaments.value = profile.tournaments
  } catch (error: unknown) {
    loadError.value = error instanceof Error ? error.message : i18next.t('marshalPageLoadError')
    marshal.value = null
    judgedTournaments.value = []
  } finally {
    isLoading.value = false
  }
}

const fillEditForm = () => {
  if (!marshal.value) return

  editMarshal.surname = marshal.value.surname
  editMarshal.name = marshal.value.name
  editMarshal.patronymic = marshal.value.patronymic ?? ''
  editMarshal.country = marshal.value.country
  editMarshal.city = marshal.value.city
  editMarshal.country_id = marshal.value.country_id ?? 0
  editMarshal.city_id = marshal.value.city_id ?? 0
  editMarshal.category_id = marshal.value.category_id
  editMarshal.pic = marshal.value.pic ?? ''
}

const startEditing = () => {
  fillEditForm()
  isEditing.value = true
}

const cancelEditing = () => {
  fillEditForm()
  isEditing.value = false
}

const saveMarshal = async () => {
  if (!marshal.value || !canEdit.value) return

  const saveData: MarshalDB = {
    id: marshal.value.id,
    surname: editMarshal.surname,
    name: editMarshal.name,
    patronymic: editMarshal.patronymic,
    country_id: editMarshal.country_id,
    city_id: editMarshal.city_id,
    category_id: editMarshal.category_id,
    pic: editMarshal.pic
  }

  marshal.value = await marshalsListStore.updateMarshal(marshal.value.id, saveData)
  isEditing.value = false
}

watchEffect(() => {
  document.title = pageTitle.value
})

onMounted(async () => {
  await Promise.all([marshalsListStore.fetchCategories(), loadMarshal()])
})

onUnmounted(() => {
  document.title = initialDocumentTitle
})
</script>

<template>
  <main class="w-full px-4 pb-12 pt-4">
    <div class="mx-auto max-w-6xl">
      <AlertWidget
        v-if="showAlert"
        :isError="alertData.isError.value"
        :title="alertData.title.value"
        :mainText="alertData.mainText.value"
        :showInput="alertData.showInput.value"
        :buttonAction="alertData.buttonAction"
        :closeAction="alertData.closeAction"
      />

      <p v-if="loadError" class="mb-4 text-center text-sm text-destructive">
        {{ loadError }}
      </p>
      <div v-if="isLoading" class="py-12 text-center text-sm text-muted-foreground">
        {{ $t('marshalPageLoading') }}
      </div>

      <template v-else-if="marshal">
        <header class="relative min-h-64 pb-6 pt-4">
          <img
            v-if="!isEditing"
            :src="marshal.pic || NoPhoto"
            :alt="fullName"
            class="mx-auto mb-4 size-50 rounded-full border object-cover shadow-sm sm:absolute sm:left-0 sm:top-4 sm:mx-0 sm:mb-0"
          />
          <div class="mx-auto max-w-3xl text-center">
            <h1 class="text-3xl font-semibold">{{ pageTitle }}</h1>
            <p v-if="locationLine" class="mt-2 text-sm text-muted-foreground">
              {{ locationLine }}
            </p>
          </div>
        </header>

        <form v-if="isEditing" @submit.prevent="saveMarshal">
          <div class="mx-auto mb-10 flex max-w-5xl flex-col justify-center gap-10 pt-4 md:flex-row">
            <div class="flex justify-center md:min-w-80 md:justify-end">
              <ImageUpload v-model:imageSrc="editMarshal.pic" />
            </div>
            <div class="w-full max-w-md">
              <h5 class="mb-2">{{ $t('marshalPageEditFormLabel') }}</h5>
              <div class="flex flex-col gap-4">
                <FullNameWidget
                  v-model:surname="editMarshal.surname"
                  v-model:name="editMarshal.name"
                  v-model:patronymic="editMarshal.patronymic"
                />
                <SelectLocationBlock
                  v-model:country="editMarshal.country"
                  v-model:city="editMarshal.city"
                  v-model:country_id="editMarshal.country_id"
                  v-model:city_id="editMarshal.city_id"
                  :needClub="false"
                  @request-add="handleRequestAdd"
                />
                <div class="space-y-2">
                  <Label for="marshal-category">{{ $t('marshalCategoryLabel') }}</Label>
                  <NativeSelect
                    id="marshal-category"
                    v-model="editMarshal.category_id"
                    class="w-full"
                    :aria-label="$t('marshalCategoryLabel')"
                  >
                    <NativeSelectOption :value="0">
                      {{ $t('marshalCategoryPlaceholder') }}
                    </NativeSelectOption>
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
          <div class="flex justify-center gap-3">
            <Button type="submit" variant="default" size="default" :disabled="buttonDisabled">
              {{ $t('fighterPageSaveButton') }}
            </Button>
            <Button type="button" variant="outline" size="default" @click="cancelEditing">
              {{ $t('fighterPageCancelButton') }}
            </Button>
          </div>
        </form>

        <template v-else>
          <div class="mb-8 flex justify-center gap-3">
            <Button v-if="canEdit" size="default" @click="startEditing">
              {{ $t('fighterPageEditButton') }}
            </Button>
            <Button variant="default" size="default" @click="router.push(`/marshals`)">
              {{ $t('marshalPageBackButton') }}
            </Button>
          </div>

          <section class="min-w-0">
            <h2 class="mb-4 text-center text-xl font-semibold">
              {{ $t('marshalPageTournamentsTitle') }}
            </h2>
            <div
              v-if="judgedTournaments.length === 0"
              class="rounded-md border py-8 text-center text-sm text-muted-foreground"
            >
              {{ $t('marshalPageNoTournaments') }}
            </div>
            <div v-else class="w-full min-w-0 overflow-hidden rounded-md border">
              <Table class="min-w-lg">
                <TableHeader>
                  <TableRow>
                    <TableHead>{{ $t('fighterPageTournamentName') }}</TableHead>
                    <TableHead class="w-40">{{ $t('fighterPageTournamentDate') }}</TableHead>
                    <TableHead>{{ $t('ratingPageLocation') }}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="tournament in judgedTournaments" :key="tournament.id">
                    <TableCell class="font-medium">
                      <RouterLink
                        :to="{ name: 'tournament', params: { id: tournament.id } }"
                        class="text-primary underline-offset-4 hover:underline"
                      >
                        {{ tData(tournament.name, currentLanguage) }}
                      </RouterLink>
                    </TableCell>
                    <TableCell class="text-muted-foreground">
                      {{ formatProfileDate(tournament.event_date) }}
                    </TableCell>
                    <TableCell>
                      {{ tData(tournament.country.name, currentLanguage) }},
                      {{ tData(tournament.city.name, currentLanguage) }}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </section>
        </template>
      </template>
    </div>
  </main>
</template>
