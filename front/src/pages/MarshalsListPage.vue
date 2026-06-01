<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMarshalsListStore } from '@/stores/marshalsList'
import { hasMarshalManageAccess } from '@/lib/checkAccess'
import { FighterCard } from '@/components/ui/fighterCard'
import { SearchWidget } from '@/widgets/SearchWidget'
import type { Marshal } from '@/model'

const router = useRouter()
const marshalsList = ref([] as Marshal[])
const marshalsListStore = useMarshalsListStore()

const getMarshals = async () => {
  await marshalsListStore.getMarshalsList()
  const data: Marshal[] = marshalsListStore.filteredMarshalsList
  return data
}

onMounted(async () => {
  marshalsListStore.clearSearchString()
  marshalsList.value = await getMarshals()
})

const searchString = computed(() => marshalsListStore.getSearchString)
const showAddButton = computed(() => hasMarshalManageAccess())

const addMarshal = () => {
  router.push('/addMarshal')
}

watch(searchString, () => {
  marshalsList.value = marshalsListStore.filteredMarshalsList
})
</script>

<template>
  <main class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
    <header class="flex flex-col items-center gap-4">
      <h1 class="text-center text-2xl font-semibold sm:text-3xl">{{ $t('marshalsPageName') }}</h1>
      <SearchWidget
        class="w-full max-w-2xl"
        :placeholder="$t('marshalsSearchPlaceholder')"
        :store="useMarshalsListStore"
        :showAddButton="showAddButton"
        :addLabel="$t('addMarshalButton')"
        :addAction="addMarshal"
      />
    </header>

    <div
      class="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] items-stretch justify-items-center gap-4 sm:gap-5"
    >
      <FighterCard
        v-for="marshal in marshalsList"
        :key="marshal.id"
        class="h-full"
        :name="`${marshal.surname} ${marshal.name}`"
        :description="marshal.city"
        :pic="marshal.pic"
        @click="router.push(`/marshal/${marshal.id}`)"
      />
    </div>
  </main>
</template>
