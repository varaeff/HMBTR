<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFightersListStore } from '@/stores/fightersList'
import { hasAccess } from '@/lib/checkAccess'
import { FighterCard } from '@/components/ui/fighterCard'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { SearchWidget } from '@/widgets/SearchWidget'
import type { Fighter } from '@/model'

const router = useRouter()
const fightersList = ref([] as Fighter[])
const fightersListStore = useFightersListStore()

const getFighters = async () => {
  await fightersListStore.getFightersList()
  const data: Fighter[] = fightersListStore.filteredFightersList
  return data
}

onMounted(async () => {
  fightersListStore.clearSearchString()
  fightersList.value = await getFighters()
})

const searchString = computed(() => fightersListStore.getSearchString)
const showAddButton = computed(() => hasAccess())
const showGenderFilter = ref(false)
const isMale = ref(true)

const addFighter = () => {
  router.push('/addFighter')
}

watch([searchString, showGenderFilter, isMale], () => {
  if (!showGenderFilter.value) {
    fightersList.value = fightersListStore.filteredFightersList
  } else {
    fightersList.value = fightersListStore.filteredFightersList.filter(
      (fighter) => fighter.is_male === isMale.value
    )
  }
})
</script>

<template>
  <main class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
    <header class="flex flex-col items-center gap-4">
      <h1 class="text-center text-2xl font-semibold sm:text-3xl">{{ $t('fightersPageName') }}</h1>
      <div class="w-full max-w-2xl">
        <SearchWidget
          :placeholder="$t('fightersSearchPlaceholder')"
          :store="useFightersListStore"
          :showAddButton="showAddButton"
          :addLabel="$t('addFighterButton')"
          :addAction="addFighter"
        />

        <div class="w-full flex mt-1">
          <Label class="flex cursor-pointer text-sm text-muted-foreground items-center mr-3 gap-2">
            <Checkbox v-model="showGenderFilter" />
            {{ $t('fightersPageShowGenderFilter') }}
          </Label>

          <div v-if="showGenderFilter" class="flex gap-3">
            <Label class="flex cursor-pointer text-sm text-muted-foreground items-center gap-2">
              <input v-model="isMale" type="radio" name="fighter-gender" :value="true" />
              {{ $t('addFighterGenderMale') }}
            </Label>
            <Label class="flex cursor-pointer text-sm text-muted-foreground items-center gap-2">
              <input v-model="isMale" type="radio" name="fighter-gender" :value="false" />
              {{ $t('addFighterGenderFemale') }}
            </Label>
          </div>
        </div>
      </div>
    </header>

    <div
      class="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] items-stretch justify-items-center gap-4 sm:gap-5"
    >
      <FighterCard
        v-for="fighter in fightersList"
        :key="fighter.id"
        class="h-full"
        :name="`${fighter.surname} ${fighter.name}`"
        :description="`${fighter.city} ${fighter.club || ''}`"
        :pic="fighter.pic"
        @click="router.push(`/fighter/${fighter.id}`)"
      />
    </div>
  </main>
</template>
