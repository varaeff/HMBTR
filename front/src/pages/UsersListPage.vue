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
    return usersList.value
      .map((user) => (user.is_admin ? user : null))
      .filter((user) => user !== null) as User[]
  }
  if (activeTab.value === USERS_TYPES.ORGANIZERS) {
    return usersList.value
      .map((user) => (user.is_organizer ? user : null))
      .filter((user) => user !== null) as User[]
  }
  if (activeTab.value === USERS_TYPES.OTHERS) {
    return usersList.value
      .map((user) => (!user.is_admin && !user.is_organizer ? user : null))
      .filter((user) => user !== null) as User[]
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
  <h1 class="flex justify-center mb-4">{{ $t('usersPageName') }}</h1>
  <div class="w-full flex justify-center">
    <SearchWidget
      class="w-11/12 lg:w-5/12"
      :placeholder="$t('usersSearchPlaceholder')"
      :store="useUsersListStore"
    />
  </div>
  <UsersTabs class="p-10" v-model:active-tab="activeTab" :users="filteredUsers" />
</template>
