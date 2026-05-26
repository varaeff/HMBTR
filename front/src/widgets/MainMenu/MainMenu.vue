<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { Menu } from 'lucide-vue-next'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle
} from '@/components/ui/navigation-menu'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { LangSelect } from '@/widgets/LangSelect'
import { LoginWidget } from '@/widgets/LoginWidget'
import { UserMenu } from '@/widgets/UserMenu'

const { isDark, toggleTheme } = useTheme()
const authStore = useAuthStore()
const { isAuthenticated, isAdmin } = storeToRefs(authStore)

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
    title: 'menuMarshalsLink',
    url: '/marshals'
  },
  {
    title: 'menuTournamentsLink',
    url: '/tournaments'
  },
  {
    title: 'menuRatingLink',
    url: '/ratings'
  },
  {
    title: 'menuUsersLink',
    url: '/users',
    adminOnly: true
  }
]
</script>

<template>
  <nav
    class="fixed left-0 top-0 z-10 flex h-14 w-full items-center justify-between gap-3 border-b bg-background/90 px-3 backdrop-blur-sm md:h-12 md:px-4"
  >
    <div class="flex min-w-0 items-center gap-2">
      <Sheet>
        <SheetTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="max-[830px]:flex hidden"
            :aria-label="$t('menuMainPageLink')"
          >
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" class="w-72 max-w-[85vw]">
          <SheetHeader>
            <SheetTitle class="text-lg font-semibold">Navigation</SheetTitle>
          </SheetHeader>
          <div class="flex flex-1 flex-col gap-6 px-4 pb-4">
            <div class="flex flex-col gap-1">
              <SheetClose
                v-for="link in links"
                :key="link.url"
                v-show="!link.adminOnly || isAdmin"
                as-child
              >
                <RouterLink
                  :to="link.url"
                  class="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  {{ $t(link.title) }}
                </RouterLink>
              </SheetClose>
            </div>
            <div class="flex flex-col items-start gap-3 border-t pt-4">
              <UserMenu v-if="isAuthenticated" />
              <LoginWidget v-else />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <NavigationMenu :viewport="false" class="hidden min-[831px]:flex">
        <NavigationMenuList>
          <NavigationMenuItem
            v-for="link in links"
            :key="link.url"
            v-show="!link.adminOnly || isAdmin"
          >
            <NavigationMenuLink as-child :class="navigationMenuTriggerStyle()">
              <RouterLink :to="link.url">{{ $t(link.title) }}</RouterLink>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>

    <div class="flex shrink-0 items-center gap-2">
      <div class="hidden min-[831px]:flex items-center">
        <UserMenu v-if="isAuthenticated" />
        <LoginWidget v-else />
      </div>
      <LangSelect />
      <Switch id="theme-switch" :model-value="isDark" @update:model-value="toggleTheme" />
    </div>
  </nav>
</template>
