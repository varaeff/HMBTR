<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTranslation } from 'i18next-vue'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-vue-next'
import { useMarshalsListStore } from '@/stores/marshalsList'
import { useTournamentMarshalsStore } from '@/stores/tournamentMarshals'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn, tData } from '@/lib/utils'
import type { Marshal } from '@/model'

const props = defineProps<{
  tournamentId: number
  secretaryName: string
  showSelector: boolean
  canManage: boolean
  canEdit: boolean
}>()

const emit = defineEmits<{
  (e: 'update-secretary', value: string): Promise<void> | void
}>()

const marshalsListStore = useMarshalsListStore()
const tournamentMarshalsStore = useTournamentMarshalsStore()
const router = useRouter()
const { i18next } = useTranslation()
const open = ref(false)
const selectedMarshal = ref('')
const secretaryDraft = ref(props.secretaryName)
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

const setChiefMarshal = async (tournamentMarshalId: number, checked: boolean | 'indeterminate') => {
  if (checked !== true) return

  try {
    isPending.value = true
    await tournamentMarshalsStore.setChiefMarshal(tournamentMarshalId)
  } finally {
    isPending.value = false
  }
}

const saveSecretary = async () => {
  if (secretaryDraft.value === props.secretaryName) return

  try {
    isPending.value = true
    await emit('update-secretary', secretaryDraft.value)
  } finally {
    isPending.value = false
  }
}

watch(
  () => props.secretaryName,
  (value) => {
    secretaryDraft.value = value
  }
)

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
    v-if="tournamentMarshalsStore.tournamentMarshals.length || showSelector || canManage"
    class="flex flex-col items-center gap-5"
  >
    <div v-if="tournamentMarshalsStore.tournamentMarshals.length" class="w-full max-w-4xl">
      <h3 class="mb-3 text-center text-base font-semibold">{{ $t('tournamentPageMarshalsTitle') }}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ $t('tournamentPageMarshalFullName') }}</TableHead>
            <TableHead>{{ $t('marshalCategoryLabel') }}</TableHead>
            <TableHead class="w-32 text-center">{{ $t('tournamentPageChiefJudge') }}</TableHead>
            <TableHead v-if="canEdit && canManage" class="w-24 text-right">
              {{ $t('disciplinaryCardsActions') }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="item in tournamentMarshalsStore.tournamentMarshals" :key="item.id">
            <TableCell>
              {{ tData(item.marshal.surname, currentLanguage) }}
              {{ tData(item.marshal.name, currentLanguage) }}
              <span v-if="item.marshal.patronymic">
                {{ tData(item.marshal.patronymic, currentLanguage) }}
              </span>
            </TableCell>
            <TableCell>{{ tData(marshalCategoryName(item.marshal), currentLanguage) }}</TableCell>
            <TableCell class="text-center">
              <Checkbox
                :model-value="item.is_chief_judge"
                :disabled="!canEdit || !canManage || isPending"
                :aria-label="$t('tournamentPageChiefJudge')"
                @update:model-value="(value) => setChiefMarshal(item.id, value)"
              />
            </TableCell>
            <TableCell v-if="canEdit && canManage" class="text-right">
              <Button
                :disabled="isPending"
                variant="outline"
                size="sm"
                @click="removeTournamentMarshal(item.id)"
              >
                {{ $t('tournamentPageRemoveCompetitorButton') }}
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <template v-if="showSelector && canManage && canEdit">
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
      </div>
    </template>

    <div class="flex w-full max-w-xl flex-col items-center gap-2 border-t pt-4">
      <h3 class="text-center text-base font-semibold">{{ $t('tournamentPageSecretaryTitle') }}</h3>
      <Input
        v-model="secretaryDraft"
        class="text-center"
        :disabled="!canEdit || !canManage || isPending"
        :placeholder="$t('tournamentPageSecretaryPlaceholder')"
        @blur="saveSecretary"
        @keyup.enter="saveSecretary"
      />
    </div>
  </section>
</template>
