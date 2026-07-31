<script setup lang="ts">
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-vue-next'
import { computed } from 'vue'
import { useTranslation } from 'i18next-vue'
import { cn, tData } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
import type { Nomination } from '@/model'
import { useTournamentFighterRegistration } from './useTournamentFighterRegistration'

const props = defineProps<{
  tournamentId: number
  nominations: Nomination[]
}>()

const { i18next } = useTranslation()
const tournamentId = computed(() => props.tournamentId)
const nominations = computed(() => props.nominations)
const {
  open,
  selectedFighter,
  selectedNominationIds,
  fighterOptions,
  selectedFighterLabel,
  matchingNominations,
  addFighter,
  selectFighter,
  setNominationSelected,
  registerFighter
} = useTournamentFighterRegistration({
  tournamentId,
  nominations
})
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        role="combobox"
        :aria-expanded="open"
        class="w-120 justify-between bg-popover text-popover-foreground shadow-sm hover:bg-popover hover:text-popover-foreground"
      >
        {{
          selectedFighter
            ? tData(selectedFighterLabel)
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
              {{ $t('fightersSelectAddFighter') }}
            </Button></CommandEmpty
          >
          <CommandGroup>
            <CommandItem
              v-for="fighter in fighterOptions"
              :key="fighter.value"
              :value="fighter.value"
              @select="selectFighter(fighter.value)"
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
      <div v-for="nom in matchingNominations" :key="nom.id" class="flex items-center gap-3">
        <Checkbox
          :id="`nom-${nom.id}`"
          :model-value="selectedNominationIds.includes(nom.id)"
          @update:model-value="
            (checked: boolean | 'indeterminate') => {
              setNominationSelected(nom.id, checked === true)
            }
          "
        />
        <Label :for="`nom-${nom.id}`">{{ nom[`name_${i18next.language as 'ru' | 'en'}`] }}</Label>
      </div>
    </div>
    <div class="flex justify-center">
      <Button
        variant="default"
        size="default"
        :disabled="!selectedNominationIds.length"
        @click="registerFighter"
      >
        {{ $t('fightersSelectRegister') }}
      </Button>
    </div>
  </div>
</template>
