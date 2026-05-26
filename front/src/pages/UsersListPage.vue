<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import type { User } from '@/model'
import { useUsersListStore } from '@/stores/usersList'
import { SearchWidget } from '@/widgets/SearchWidget'
import { UsersTabs } from '@/widgets/usersTabs'
import { USERS_TYPES, type UserType } from '@/model'

const usersList = ref([] as User[])
const usersListStore = useUsersListStore()

const activeTab = ref<UserType>(USERS_TYPES.ALL)

const getUsers = async () => {
  await usersListStore.getUsersList()
  const data: User[] = usersListStore.filteredUsersList
  return data
}

const filteredUsers = computed(() => {
  if (activeTab.value === USERS_TYPES.ADMINS) {
    return usersList.value.filter((user) => user.is_admin)
  }
  if (activeTab.value === USERS_TYPES.ORGANIZERS) {
    return usersList.value.filter((user) => user.is_organizer)
  }
  if (activeTab.value === USERS_TYPES.SECRETARIES) {
    return usersList.value.filter((user) => user.is_secretary)
  }
  if (activeTab.value === USERS_TYPES.OTHERS) {
    return usersList.value.filter(
      (user) => !user.is_admin && !user.is_organizer && !user.is_secretary
    )
  }

  return usersList.value
})

onMounted(async () => {
  usersListStore.clearSearchString()
  usersList.value = await getUsers()
})

const searchString = computed(() => usersListStore.getSearchString)

watch(searchString, () => {
  usersList.value = usersListStore.filteredUsersList
})
</script>

<template>
  <main class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
    <header class="flex flex-col items-center gap-4">
      <h1 class="text-center text-2xl font-semibold sm:text-3xl">{{ $t('usersPageName') }}</h1>
      <SearchWidget
        class="w-full max-w-2xl"
        :placeholder="$t('usersSearchPlaceholder')"
        :store="useUsersListStore"
      />
    </header>

    <UsersTabs v-model:active-tab="activeTab" :users="filteredUsers" />
  </main>
</template>
