<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMarshalsListStore } from '@/stores/marshalsList'
import { hasMarshalManageAccess } from '@/lib/checkAccess'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FighterCard } from '@/components/ui/fighterCard'
import { Button } from '@/components/ui/button'
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
const showAddButton = computed(() => marshalsListStore.getSearchString.length > 0 && hasMarshalManageAccess())

const addMarshal = () => {
  router.push('/addMarshal')
}

watch(searchString, () => {
  marshalsList.value = marshalsListStore.filteredMarshalsList
})
</script>

<template>
  <h1 class="flex justify-center mb-4">{{ $t('marshalsPageName') }}</h1>
  <div class="w-full flex justify-center mb-5">
    <SearchWidget
      class="w-11/12 lg:w-5/12"
      :placeholder="$t('marshalsSearchPlaceholder')"
      :store="useMarshalsListStore"
    />
  </div>
  <ScrollArea class="w-full h-[calc(100vh-250px)] px-5 mb-5">
    <div class="flex flex-wrap gap-5 justify-center">
      <FighterCard
        v-for="marshal in marshalsList"
        :key="marshal.id"
        class="grow basis-50 max-w-full lg:max-w-[calc((100%-80px)/5)] min-w-50 p-4"
        :name="`${marshal.surname} ${marshal.name}`"
        :description="marshal.city"
        :pic="marshal.pic"
        @click="router.push(`/marshal/${marshal.id}`)"
      />
    </div>
  </ScrollArea>
  <div class="flex justify-center">
    <Button v-show="showAddButton" variant="default" size="default" @click="addMarshal">{{
      $t('addMarshalButton')
    }}</Button>
  </div>
</template>
