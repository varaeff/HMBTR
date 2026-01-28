<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFightersListStore } from '@/stores/fightersList'
import NoPhoto from '@/entities/NoPhoto.jpg'

const route = useRoute()
const router = useRouter()
const fighter = ref<any>(null)
const FightersListStore = useFightersListStore()
const fighterId = +route.params.id

onMounted(async () => {
  try {
    fighter.value = await FightersListStore.showFighterDetails(fighterId)
  } catch (error) {
    console.error('Error loading fighter details:', error)
    fighter.value = null
  }
})

const fullName = computed(() => {
  if (!fighter.value) return ''
  const { surname, name, patronymic } = fighter.value
  return [surname, name, patronymic].filter(Boolean).join(' ')
})

const club = computed(() => fighter.value?.club ?? 'Без клуба')
</script>

<template>
  <h1 class="title">Карточка бойца</h1>
  <div class="promo-block">
    <div class="promo-block__picture grey-image">
      <img class="card__image" :src="fighter?.pic || NoPhoto" :alt="fullName" />
    </div>
    <div class="promo-block__features">
      <ul class="titled-items-list">
        <li class="titled-item titled-items-list__item">
          <div class="titled-item__title">ФИО:</div>
          <div class="titled-item__content">
            {{ fullName }}
          </div>
        </li>
        <li class="titled-item titled-items-list__item">
          <div class="titled-item__title">Город</div>
          <div class="titled-item__content">{{ fighter?.city }}</div>
        </li>
        <li class="titled-item titled-items-list__item">
          <div class="titled-item__title">Клуб</div>
          <div class="titled-item__content">{{ club }}</div>
        </li>
      </ul>
    </div>
  </div>
  <div class="center">
    <button class="btn btn-primary-accent btn-large" @click="router.push(`/fighters`)">
      К списку бойцов
    </button>
  </div>
</template>

<style scoped>
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.grey-image {
  filter: grayscale(1);
  transition: 1s;
}
.grey-image:hover {
  filter: grayscale(0);
  transform: scale(1.1);
}
</style>
