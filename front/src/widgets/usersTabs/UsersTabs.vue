<script setup lang="ts">
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
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

defineProps<{ users: User[] }>()

const activeTab = defineModel<UserType>('activeTab', {
  required: true,
  default: USERS_TYPES.ALL
})
const usersListStore = useUsersListStore()
</script>

<template>
  <Tabs v-model="activeTab" class="w-full">
    <TabsList class="grid w-full grid-cols-4 mb-4 h-9">
      <TabsTrigger
        v-for="value in USERS_TYPES"
        :key="value"
        :value="value"
        class="tracking-tight cursor-pointer"
      >
        {{ $t(value) }}
      </TabsTrigger>
    </TabsList>

    <TabsContent :value="activeTab" class="mt-0">
      <ScrollArea class="h-full w-full rounded-md border bg-muted/10 p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ $t('usersTableUsername') }}</TableHead>
              <TableHead>{{ $t('usersTableName') }}</TableHead>
              <TableHead>{{ $t('usersTableSurname') }}</TableHead>
              <TableHead>{{ $t('usersTablePatronymic') }}</TableHead>
              <TableHead>{{ $t('usersTableEmail') }}</TableHead>
              <TableHead>{{ $t('usersTableIsAdmin') }}</TableHead>
              <TableHead>{{ $t('usersTableIsOrganizer') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="user in users" :key="user.id">
              <TableCell>
                {{ user.username }}
              </TableCell>
              <TableCell>{{ user.name }}</TableCell>
              <TableCell>{{ user.surname }}</TableCell>
              <TableCell>{{ user.patronymic }}</TableCell>
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
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colspan="6"> {{ $t('usersTableTotal') }} </TableCell>
              <TableCell class="text-right">{{ users.length }}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </ScrollArea>
    </TabsContent>
  </Tabs>
</template>
