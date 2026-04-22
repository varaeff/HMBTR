<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTranslation } from 'i18next-vue'
import { useCompetitionStore } from '@/stores/competition'
import { tData } from '@/lib/utils'
import { Table, TableHeader, TableBody, TableCell, TableRow } from '@/components/ui/table'
import type { GroupFighter, Group } from '@/model'

const props = defineProps<{ isFixed: boolean }>()
const competitionStore = useCompetitionStore()
const { i18next } = useTranslation()
const languageKey = computed(() => i18next.language)

const activeDrag = ref<{ fighter: GroupFighter; groupIdx: number; fighterIdx: number } | null>(null)

const onDragStart = (fighter: GroupFighter, groupIdx: number, fighterIdx: number) => {
  if (props.isFixed) return

  activeDrag.value = { fighter, groupIdx, fighterIdx }
}

const onDragEnd = () => {
  activeDrag.value = null
}

const moveFighter = (targetGroupIdx: number | 'new', targetFighterIdx?: number) => {
  if (!activeDrag.value || props.isFixed) return

  const { groupIdx: sGIdx, fighterIdx: sFIdx, fighter } = activeDrag.value

  // Создаем глубокую копию групп и их бойцов
  let nextGroups: Group[] = competitionStore.getGroups.map((group) => ({
    ...group,
    fighters: [...group.fighters]
  }))

  // 1. Удаляем бойца из исходной группы
  nextGroups[sGIdx].fighters.splice(sFIdx, 1)

  // 2. Добавляем в целевую группу или создаем новую
  if (targetGroupIdx === 'new') {
    nextGroups.push({
      letter: '', // Буква будет пересчитана ниже
      fighters: [fighter]
    })
  } else {
    nextGroups[targetGroupIdx].fighters.splice(
      targetFighterIdx ?? nextGroups[targetGroupIdx].fighters.length,
      0,
      fighter
    )
  }

  // 3. Фильтруем пустые группы и ПЕРЕСЧИТЫВАЕМ буквы по порядку
  const updatedGroups = nextGroups
    .filter((g) => g.fighters.length > 0)
    .map((g, idx) => ({
      ...g,
      letter: String.fromCharCode(65 + idx) // 65 = 'A'
    }))

  competitionStore.setGroups(updatedGroups)
}

const handleDrop = (e: DragEvent, gIdx: number | 'new', fIdx?: number) => {
  e.preventDefault()
  moveFighter(gIdx, fIdx)
}
</script>

<template>
  <div
    class="flex flex-wrap w-full justify-center gap-8 p-4 min-h-50"
    @dragover.prevent
    @drop="handleDrop($event, 'new')"
  >
    <div v-for="(group, gIdx) in competitionStore.getGroups" :key="group.letter + languageKey">
      <Table
        class="border rounded-lg p-4 bg-card w-64 shadow-sm"
        @dragover.prevent
        @drop.stop="handleDrop($event, gIdx)"
      >
        <TableHeader>
          <TableRow>
            <TableCell class="font-bold text-center">
              {{ $t('tournamentPageGroupName') }} {{ group.letter }}
            </TableCell>
          </TableRow>
          <TableRow v-if="props.isFixed">
            <TableCell class="font-bold"> № </TableCell>
            <TableCell class="font-bold"> {{ $t('groupsTableFighter') }} </TableCell>
            <TableCell class="font-bold"> {{ $t('groupsTableClub') }} </TableCell>
            <TableCell class="font-bold text-center"> {{ $t('groupsTableWins') }} </TableCell>
            <TableCell class="font-bold text-center"> {{ $t('groupsTableDifference') }} </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="(fighter, fIdx) in group.fighters"
            :key="fighter.id + languageKey"
            :draggable="!props.isFixed"
            @dragstart="onDragStart(fighter, gIdx, fIdx)"
            @dragend="onDragEnd"
            @dragover.prevent.stop="!props.isFixed && $event"
            @drop.stop="handleDrop($event, gIdx, fIdx)"
            class="transition-colors select-none"
            :class="[
              props.isFixed ? 'cursor-default' : 'cursor-move hover:bg-accent/50',
              {
                'opacity-30 grayscale': activeDrag?.fighter.id === fighter.id,
                'bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-800/30':
                  props.isFixed && fIdx < 2 && fighter.wins > 0
              }
            ]"
          >
            <TableCell class="text-muted-foreground">{{ fIdx + 1 }}.</TableCell>
            <TableCell class="font-medium"
              >{{ tData(fighter.surname) }} {{ tData(fighter.name) }}</TableCell
            >
            <TableCell class="flex text-muted-foreground">
              {{ tData(fighter.city) }}
              <p v-if="fighter.club">, {{ tData(fighter.club) }}</p>
            </TableCell>
            <TableCell v-if="props.isFixed" class="font-bold text-center">
              {{ fighter.wins }}
            </TableCell>
            <TableCell v-if="props.isFixed" class="font-bold text-center">
              {{ fighter.diff }}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
