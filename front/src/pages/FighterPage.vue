<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFightersListStore } from '@/stores/fightersList'
import NoPhoto from '@/entities/NoPhoto.jpg'
import { Button } from '@/components/ui/button'
import type { Fighter } from '@/model'
import { dateToString, tData } from '@/lib/utils'

const route = useRoute()
const router = useRouter()
const fighter = ref<Fighter | null>(null)
const FightersListStore = useFightersListStore()
const fighterId = +route.params.id

onMounted(async () => {
  fighter.value = await FightersListStore.showFighterDetails(fighterId)
})

const fullName = computed(() => {
  if (!fighter.value) return ''
  const { surname, name, patronymic } = fighter.value
  return [surname, name, patronymic].filter(Boolean).join(' ')
})
</script>

<template>
  <h1 class="flex justify-center mb-4">{{ $t('fighterPageNamePage') }}</h1>
  <div class="flex justify-center max-w-244 pt-8 mx-auto gap-10 mb-10">
    <div
      class="min-w-100 flex justify-end grayscale hover:grayscale-0 transition-all duration-1000 hover:scale-[1.1]"
    >
      <img :src="fighter?.pic || NoPhoto" :alt="fullName" />
    </div>
    <ul class="min-w-100">
      <li class="flex items-center gap-1">
        <h5>{{ $t('fighterPageFullName') }}</h5>
        <div>
          {{ tData(fullName) }}
        </div>
      </li>
      <li class="flex items-center gap-1">
        <h5>{{ $t('fighterPageCountry') }}</h5>
        <div>{{ tData(fighter?.country as string) }}</div>
      </li>
      <li class="flex items-center gap-1">
        <h5>{{ $t('fighterPageCity') }}</h5>
        <div>{{ tData(fighter?.city as string) }}</div>
      </li>
      <li v-show="fighter?.club" class="flex items-center gap-1">
        <h5>{{ $t('fighterPageClub') }}</h5>
        <div>{{ tData(fighter?.club as string) }}</div>
      </li>
      <li v-show="fighter?.birthday" class="flex items-center gap-1">
        <h5>{{ $t('fighterPageDateOfBirth') }}</h5>
        <div>{{ dateToString(fighter?.birthday) }}</div>
      </li>
    </ul>
  </div>
  <div class="flex justify-center">
    <Button variant="default" size="default" @click="router.push(`/fighters`)">
      {{ $t('fighterPageBackButton') }}
    </Button>
  </div>
</template>
