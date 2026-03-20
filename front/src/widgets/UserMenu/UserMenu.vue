<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useAuthService } from '@/composables/useAuthService'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const authService = useAuthService()
const router = useRouter()
const isLoggingOut = ref(false)

const handleLogout = async () => {
  isLoggingOut.value = true

  try {
    await authService.logout()
    // Navigate to home after successful logout
    await router.push('/')
  } catch (error) {
    console.error('Logout error:', error)
    // Even on error, the auth store is cleared, so just proceed
    await router.push('/')
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <div v-if="user" class="flex items-center space-x-4">
    <Popover>
      <PopoverTrigger as-child>
        <Button variant="ghost" class="-mb-2"> {{ user.name }} {{ user.surname }} </Button>
      </PopoverTrigger>
      <PopoverContent class="w-64">
        <div class="space-y-4">
          <div>
            <p class="font-semibold text-sm">{{ user.username }}</p>
            <p class="text-xs text-muted-foreground mt-1">
              <span v-if="user.is_admin">{{ $t('userMenuAdmin') }}</span>
              <span v-else-if="user.is_organizer">{{ $t('userMenuOrganizer') }}</span>
              <span v-else>{{ $t('userMenuUser') }}</span>
            </p>
          </div>
          <Button @click="handleLogout" :disabled="isLoggingOut" variant="outline" class="w-full">
            {{ $t('userMenuLogout') }}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  </div>
</template>
