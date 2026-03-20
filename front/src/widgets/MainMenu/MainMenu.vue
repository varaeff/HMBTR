<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle
} from '@/components/ui/navigation-menu'
import { Switch } from '@/components/ui/switch'
import { LangSelect } from '@/widgets/LangSelect'
import { LoginWidget } from '@/widgets/LoginWidget'
import { UserMenu } from '@/widgets/UserMenu'

const { isDark, toggleTheme } = useTheme()
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

const links = [
  {
    title: 'menuMainPageLink',
    url: '/',
    exact: true
  },
  {
    title: 'menuFightersLink',
    url: '/fighters'
  },
  {
    title: 'menuTournamentsLink',
    url: '/tournaments'
  }
]
</script>

<template>
  <nav class="fixed left-0 top-0 w-full z-10 flex justify-between backdrop-blur-sm px-4">
    <NavigationMenu :viewport="false">
      <NavigationMenuList>
        <NavigationMenuItem v-for="link in links" :key="link.url">
          <NavigationMenuLink as-child :class="navigationMenuTriggerStyle()">
            <RouterLink :to="link.url">{{ $t(link.title) }}</RouterLink>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
    <div class="flex items-center space-x-2">
      <UserMenu v-if="isAuthenticated" />
      <LoginWidget v-else />
      <LangSelect />
      <Switch id="theme-switch" :model-value="isDark" @update:model-value="toggleTheme" />
    </div>
  </nav>
</template>
