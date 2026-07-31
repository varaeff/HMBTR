<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useTranslation } from 'i18next-vue'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useUsersListStore } from '@/stores/usersList'
import { USERS_TYPES } from '@/model'
import type { User, UserType } from '@/model'
import { tData } from '@/lib/utils'

type Language = 'ru' | 'en'

defineProps<{ users: User[] }>()

const { i18next } = useTranslation()
const activeTab = defineModel<UserType>('activeTab', {
  required: true,
  default: USERS_TYPES.ALL
})
const usersListStore = useUsersListStore()
const currentLanguage = ref<Language>(i18next.language === 'en' ? 'en' : 'ru')

const updateLanguage = (language: string) => {
  currentLanguage.value = language === 'en' ? 'en' : 'ru'
}

const localizedText = (text?: string) => tData(text ?? '', currentLanguage.value)

onMounted(() => {
  i18next.on('languageChanged', updateLanguage)
})

onUnmounted(() => {
  i18next.off('languageChanged', updateLanguage)
})

const tableHeaders: string[] = [
  'usersTableUsername',
  'usersTableName',
  'usersTableSurname',
  'usersTablePatronymic',
  'usersTableEmail',
  'usersTableIsAdmin',
  'usersTableIsOrganizer',
  'usersTableIsSecretary'
]
</script>

<template>
  <Tabs v-model="activeTab" class="w-full">
    <div class="mb-4 overflow-x-auto pb-1">
      <TabsList class="inline-flex h-auto min-h-9 min-w-max md:grid md:w-full md:min-w-0 md:grid-cols-5">
        <TabsTrigger
          v-for="value in USERS_TYPES"
          :key="value"
          :value="value"
          class="min-w-28 flex-none cursor-pointer px-3 tracking-tight md:min-w-0 md:flex-1"
        >
          {{ $t(value) }}
        </TabsTrigger>
      </TabsList>
    </div>

    <TabsContent :value="activeTab" class="mt-0 min-w-0">
      <div class="w-full overflow-hidden rounded-md border bg-muted/10">
        <div class="overflow-x-auto">
          <Table class="min-w-[46rem]">
          <TableHeader>
            <TableRow>
              <TableHead v-for="header in tableHeaders" :key="header">
                {{ $t(header) }}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="user in users" :key="user.id">
              <TableCell>
                {{ localizedText(user.username) }}
              </TableCell>
              <TableCell>{{ localizedText(user.name) }}</TableCell>
              <TableCell>{{ localizedText(user.surname) }}</TableCell>
              <TableCell>{{ localizedText(user.patronymic) }}</TableCell>
              <TableCell>{{ user.email }}</TableCell>
              <TableCell
                ><Checkbox
                  :model-value="user.is_admin"
                  @update:model-value="
                    (checked: boolean | 'indeterminate') => {
                      user.is_admin = checked === true
                      usersListStore.updateUser(user)
                    }
                  "
              /></TableCell>
              <TableCell
                ><Checkbox
                  :model-value="user.is_organizer"
                  @update:model-value="
                    (checked: boolean | 'indeterminate') => {
                      user.is_organizer = checked === true
                      usersListStore.updateUser(user)
                    }
                  "
              /></TableCell>
              <TableCell
                ><Checkbox
                  :model-value="user.is_secretary"
                  @update:model-value="
                    (checked: boolean | 'indeterminate') => {
                      user.is_secretary = checked === true
                      usersListStore.updateUser(user)
                    }
                  "
              /></TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell :colspan="tableHeaders.length - 1">
                {{ $t('usersTableTotal') }}
              </TableCell>
              <TableCell class="text-right">{{ users.length }}</TableCell>
            </TableRow>
          </TableFooter>
          </Table>
        </div>
      </div>
    </TabsContent>
  </Tabs>
</template>
