<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTranslation } from 'i18next-vue'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-vue-next'
import { useMarshalsListStore } from '@/stores/marshalsList'
import { useTournamentMarshalsStore } from '@/stores/tournamentMarshals'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn, tData } from '@/lib/utils'
import type { Marshal } from '@/model'

const props = defineProps<{
  tournamentId: number
  showSelector: boolean
  canManage: boolean
}>()

const emit = defineEmits<{
  (e: 'finished'): void
}>()

const marshalsListStore = useMarshalsListStore()
const tournamentMarshalsStore = useTournamentMarshalsStore()
const router = useRouter()
const { i18next } = useTranslation()
const open = ref(false)
const selectedMarshal = ref('')
const isPending = ref(false)

const currentLanguage = computed(() => (i18next.language === 'en' ? 'en' : 'ru'))

const assignedMarshalIds = computed(
  () => new Set(tournamentMarshalsStore.tournamentMarshals.map((item) => item.marshal_id))
)

const marshalCategoryName = (marshal: Marshal) => {
  if (!marshal.category) return ''
  return currentLanguage.value === 'en' ? marshal.category.name_en : marshal.category.name_ru
}

const marshalLabel = (marshal: Marshal) =>
  `${marshal.surname} ${marshal.name}${marshalCategoryName(marshal) ? ` (${marshalCategoryName(marshal)})` : ''}`

const marshalsList = computed(() =>
  marshalsListStore.filteredMarshalsList
    .filter((marshal) => !assignedMarshalIds.value.has(marshal.id))
    .map((marshal) => ({
      value: marshal.id.toString(),
      label: marshalLabel(marshal)
    }))
)

const selectedLabel = computed(
  () => marshalsList.value.find((marshal) => marshal.value === selectedMarshal.value)?.label ?? ''
)

const addMarshal = () => {
  router.push('/addMarshal')
}

const selectMarshal = (marshalId: string) => {
  selectedMarshal.value = marshalId
  open.value = false
}

const registerMarshal = async () => {
  if (!selectedMarshal.value) return

  try {
    isPending.value = true
    await tournamentMarshalsStore.registerMarshal(+selectedMarshal.value)
    selectedMarshal.value = ''
  } finally {
    isPending.value = false
  }
}

const removeTournamentMarshal = async (tournamentMarshalId: number) => {
  try {
    isPending.value = true
    await tournamentMarshalsStore.deleteTournamentMarshal(tournamentMarshalId)
  } finally {
    isPending.value = false
  }
}

const finishMarshalRegistration = async () => {
  try {
    isPending.value = true
    await tournamentMarshalsStore.finishMarshalRegistration()
    selectedMarshal.value = ''
    emit('finished')
  } finally {
    isPending.value = false
  }
}

onMounted(async () => {
  marshalsListStore.clearSearchString()
  tournamentMarshalsStore.tournamentId = props.tournamentId

  await Promise.all([
    marshalsListStore.getMarshalsList(),
    tournamentMarshalsStore.loadTournamentMarshals(props.tournamentId)
  ])
})
</script>

<template>
  <section
    v-if="tournamentMarshalsStore.tournamentMarshals.length || showSelector"
    class="mb-5 flex flex-col items-center gap-4"
  >
    <div v-if="tournamentMarshalsStore.tournamentMarshals.length" class="max-w-full">
      <h3 class="mb-4 text-center">{{ $t('tournamentPageMarshalsTitle') }}</h3>
      <div class="inline-flex min-w-max max-w-full flex-col gap-2 overflow-x-auto">
        <div
          v-for="item in tournamentMarshalsStore.tournamentMarshals"
          :key="item.id"
          class="flex w-full items-center justify-between gap-4 rounded-md border p-2"
        >
          <div class="whitespace-nowrap">
            {{ tData(item.marshal.surname, currentLanguage) }}
            {{ tData(item.marshal.name, currentLanguage) }}
            <span v-if="marshalCategoryName(item.marshal)">
              ({{ tData(marshalCategoryName(item.marshal), currentLanguage) }})
            </span>
          </div>
          <Button
            v-if="showSelector && canManage"
            :disabled="isPending"
            variant="outline"
            size="sm"
            @click="removeTournamentMarshal(item.id)"
          >
            {{ $t('tournamentPageRemoveCompetitorButton') }}
          </Button>
        </div>
      </div>
    </div>

    <template v-if="showSelector && canManage">
      <Popover v-model:open="open">
        <PopoverTrigger as-child>
          <Button
            variant="outline"
            role="combobox"
            :aria-expanded="open"
            class="w-120 justify-between"
          >
            {{ selectedMarshal ? tData(selectedLabel, currentLanguage) : $t('marshalsSelectPlaceholder') }}
            <ChevronsUpDownIcon class="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent class="p-0 w-120">
          <Command>
            <CommandInput :placeholder="$t('marshalsSelectPlaceholder')" />
            <CommandList>
              <CommandEmpty class="flex flex-col items-center"
                >{{ $t('marshalsSelectEmpty')
                }}<Button size="sm" variant="outline" class="w-1/2 mt-2" @click="addMarshal">
                  {{ $t('addMarshalButton') }}
                </Button></CommandEmpty
              >
              <CommandGroup>
                <CommandItem
                  v-for="marshal in marshalsList"
                  :key="marshal.value"
                  :value="marshal.value"
                  @select="() => selectMarshal(marshal.value)"
                >
                  <CheckIcon
                    :class="
                      cn(
                        'mr-2 h-4 w-4',
                        selectedMarshal === marshal.value ? 'opacity-100' : 'opacity-0'
                      )
                    "
                  />
                  {{ tData(marshal.label, currentLanguage) }}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div class="flex justify-center gap-3">
        <Button
          variant="default"
          size="default"
          :disabled="!selectedMarshal || isPending"
          @click="registerMarshal"
        >
          {{ $t('marshalsSelectRegister') }}
        </Button>
        <Button
          variant="destructive"
          size="default"
          :disabled="isPending"
          @click="finishMarshalRegistration"
        >
          {{ $t('tournamentPageFinishMarshalsButton') }}
        </Button>
      </div>
    </template>
  </section>
</template>
