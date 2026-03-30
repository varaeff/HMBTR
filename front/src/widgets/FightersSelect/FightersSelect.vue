<script setup lang="ts">
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'
import { useTranslation } from 'i18next-vue'
import { useRouter } from 'vue-router'
import { useFightersListStore } from '@/stores/fightersList'
import { cn, tData } from '@/lib/utils'
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
import { Checkbox } from '@/components/ui/checkbox'
import type { Fighter, Nomination } from '@/model'

interface fighterForSelect {
  value: string
  label: string
}

const props = defineProps<{
  tournamentId: number
  nominations: Nomination[]
}>()

const fightersListStore = useFightersListStore()
const fightersList = ref([] as fighterForSelect[])
const router = useRouter()
const { i18next } = useTranslation()
const open = ref(false)
const selectedFighter = ref<string>('')
const competitorNominationsIds = ref<number[]>([])

const getFighters = async () => {
  await fightersListStore.getFightersList()
  const data: Fighter[] = fightersListStore.filteredFightersList
  const dataForSelect = data.map((fighter) => ({
    value: fighter.id.toString(),
    label: `${fighter.surname} ${fighter.name}, ${fighter.city} ${fighter.club || ''}`
  }))
  return dataForSelect
}

const addFighter = () => {
  router.push(`/addFighter#${props.tournamentId.toString()}`)
}

const registerFighter = () => {
  selectedFighter.value = ''
  competitorNominationsIds.value = []
}

onMounted(async () => {
  fightersListStore.clearSearchString()
  fightersList.value = await getFighters()
})
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button variant="outline" role="combobox" :aria-expanded="open" class="w-120 justify-between">
        {{
          selectedFighter
            ? tData(
                fightersList.find((fighter) => fighter.value === selectedFighter)?.label as string
              )
            : $t('fightersSelectPlaceholder')
        }}
        <ChevronsUpDownIcon class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="p-0 w-120">
      <Command>
        <CommandInput :placeholder="$t('fightersSelectPlaceholder')" />
        <CommandList>
          <CommandEmpty class="flex flex-col items-center"
            >{{ $t('fightersSelectEmpty')
            }}<Button size="sm" variant="outline" class="w-1/2 mt-2" @click="addFighter">
              Добавить
            </Button></CommandEmpty
          >
          <CommandGroup>
            <CommandItem
              v-for="fighter in fightersList"
              :key="fighter.value"
              :value="fighter.value"
              @select="
                () => {
                  selectedFighter = selectedFighter === fighter.value ? '' : fighter.value
                  open = false
                }
              "
            >
              <CheckIcon
                :class="
                  cn(
                    'mr-2 h-4 w-4',
                    selectedFighter === fighter.value ? 'opacity-100' : 'opacity-0'
                  )
                "
              />
              {{ tData(fighter.label) }}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>

  <div v-if="selectedFighter" class="flex flex-col gap-4 justify-center p-4">
    <div class="flex gap-4">
      <div v-for="nom in nominations" :key="nom.id" class="flex items-center gap-3">
        <Checkbox
          :id="`nom-${nom.id}`"
          :model-value="competitorNominationsIds.includes(nom.id)"
          @update:model-value="
            (checked: boolean | 'indeterminate') => {
              if (checked === true) {
                competitorNominationsIds.push(nom.id)
              } else {
                competitorNominationsIds = competitorNominationsIds.filter((id) => id !== nom.id)
              }
            }
          "
        />
        <Label :for="`nom-${nom.id}`">{{ nom[`name_${i18next.language as 'ru' | 'en'}`] }}</Label>
      </div>
    </div>
    <div class="flex justify-center">
      <Button variant="default" size="default" @click="registerFighter">
        {{ $t('fightersSelectRegister') }}
      </Button>
    </div>
  </div>
</template>
