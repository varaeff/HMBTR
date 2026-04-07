<script setup lang="ts">
import { ref } from 'vue'
import { Table, TableHeader, TableBody, TableCell, TableRow } from '@/components/ui/table'
import type { Fighter } from '@/model'

const props = defineProps<{ groups: Fighter[][] }>()
const emit = defineEmits<{ 'update-groups': [groups: Fighter[][]] }>()

const activeDrag = ref<{ fighter: Fighter; groupIdx: number; fighterIdx: number } | null>(null)

const getGroupLetter = (index: number) => String.fromCharCode(65 + index)

const onDragStart = (fighter: Fighter, groupIdx: number, fighterIdx: number) => {
  activeDrag.value = { fighter, groupIdx, fighterIdx }
}

const onDragEnd = () => {
  activeDrag.value = null
}

const moveFighter = (targetGroupIdx: number | 'new', targetFighterIdx?: number) => {
  if (!activeDrag.value) return

  const { groupIdx: sGIdx, fighterIdx: sFIdx, fighter } = activeDrag.value

  let nextGroups = props.groups.map((group, idx) =>
    idx === sGIdx ? group.filter((_, i) => i !== sFIdx) : [...group]
  )

  if (targetGroupIdx === 'new') {
    nextGroups.push([fighter])
  } else {
    nextGroups[targetGroupIdx].splice(
      targetFighterIdx ?? nextGroups[targetGroupIdx].length,
      0,
      fighter
    )
  }

  emit(
    'update-groups',
    nextGroups.filter((g) => g.length > 0)
  )
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
    <div v-for="(group, gIdx) in props.groups" :key="`group-${gIdx}`">
      <Table
        class="border rounded-lg p-4 bg-card w-64 shadow-sm"
        @dragover.prevent
        @drop.stop="handleDrop($event, gIdx)"
      >
        <TableHeader>
          <TableRow>
            <TableCell class="font-bold text-center">
              {{ $t('tournamentPageGroupName') }} {{ getGroupLetter(gIdx) }}
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="(fighter, fIdx) in group"
            :key="fighter.id"
            draggable="true"
            @dragstart="onDragStart(fighter, gIdx, fIdx)"
            @dragend="onDragEnd"
            @dragover.prevent.stop
            @drop.stop="handleDrop($event, gIdx, fIdx)"
            class="cursor-move hover:bg-accent/50 transition-colors select-none"
            :class="{ 'opacity-30 grayscale': activeDrag?.fighter.id === fighter.id }"
          >
            <TableCell class="text-muted-foreground">{{ fIdx + 1 }}.</TableCell>
            <TableCell class="font-medium">{{ fighter.surname }} {{ fighter.name }}</TableCell>
            <TableCell class="flex text-muted-foreground"
              >{{ fighter.city }}
              <p v-if="fighter.club">, {{ fighter.club }}</p></TableCell
            >
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
