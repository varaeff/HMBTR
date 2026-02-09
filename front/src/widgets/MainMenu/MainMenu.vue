<script setup lang="ts">
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle
} from '@/components/ui/navigation-menu'
import { Switch } from '@/components/ui/switch'
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme } = useTheme()

const links = [
  {
    title: 'Главная',
    url: '/',
    exact: true
  },
  {
    title: 'Список бойцов',
    url: '/fighters'
  },
  {
    title: 'Турниры',
    url: '/tournaments'
  }
]

</script>

<template>
  <nav class="fixed left-0 top-0 w-full z-100 flex justify-between backdrop-blur-sm px-4">
    <NavigationMenu :viewport="false">
      <NavigationMenuList>
        <NavigationMenuItem v-for="link in links" :key="link.url">
          <NavigationMenuLink as-child :class="navigationMenuTriggerStyle()">
            <RouterLink :to="link.url">{{ link.title }}</RouterLink>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
    <div class="flex items-center space-x-2">
      <Switch
        id="theme-switch"
        :model-value="isDark"
        @update:model-value="toggleTheme"
      />
    </div>
  </nav>
</template>
