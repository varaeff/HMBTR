<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DynamicLabeledInput } from '@/widgets/DynamicLabeledInput'
import { UsernamePwdWidget } from '@/widgets/UsernamePwdWidget'
import { FullNameWidget } from '@/widgets/FullNameWidget'
import { useAuthService } from '@/composables/useAuthService'
import { useApiUiStore } from '@/stores/apiUi'

const authService = useAuthService()
const apiUi = useApiUiStore()

const newUser = reactive({
  username: '',
  password: '',
  surname: '',
  name: '',
  patronymic: '',
  email: ''
})

const activeTab = ref('login')
const isSheetOpen = ref(false)
const isLoading = ref(false)

watch(isSheetOpen, (isOpen) => {
  if (!isOpen) {
    activeTab.value = 'login'
    // Reset form
    newUser.username = ''
    newUser.password = ''
    newUser.surname = ''
    newUser.name = ''
    newUser.patronymic = ''
    newUser.email = ''
  }
})

const handleLogin = async () => {
  if (!newUser.username || !newUser.password) {
    apiUi.setError('Username and password are required')
    return
  }

  isLoading.value = true

  try {
    await authService.login({
      username: newUser.username,
      password: newUser.password
    })

    // Success - close the sheet
    isSheetOpen.value = false
  } catch (error: any) {
    const serverError =
      error.response?.data?.details || error.response?.data?.error || 'Ошибка входа'
    apiUi.setError(serverError)
    console.error('Login failed:', error)
  } finally {
    isLoading.value = false
  }
}

const handleRegister = async () => {
  console.log('Attempting registration with:', { ...newUser })

  if (!newUser.username || !newUser.password || !newUser.name || !newUser.surname) {
    apiUi.setError('Username, password, name, and surname are required')
    return
  }

  isLoading.value = true

  try {
    await authService.register({
      username: newUser.username,
      password: newUser.password,
      name: newUser.name,
      surname: newUser.surname,
      patronymic: newUser.patronymic || undefined,
      email: newUser.email || undefined
    })

    // Success - close the sheet
    isSheetOpen.value = false
  } catch (error) {
    // Error is already handled by interceptors
    console.error('Registration failed:', error)
  } finally {
    isLoading.value = false
  }
}

const handleSubmit = () => {
  if (activeTab.value === 'login') {
    handleLogin()
  } else {
    handleRegister()
  }
}
</script>

<template>
  <Sheet aria-describedby="undefined" v-model:open="isSheetOpen">
    <SheetTrigger as-child>
      <Button variant="ghost" class="-mb-2"> {{ $t('menuLoginLink') }} </Button>
    </SheetTrigger>
    <SheetContent :disable-outside-pointer-events="false" @interact-outside.prevent>
      <SheetHeader>
        <SheetTitle>{{ $t('menuLoginLink') }}</SheetTitle>
        <SheetDescription class="sr-only">
          Форма входа и регистрации пользователя
        </SheetDescription>
      </SheetHeader>
      <div class="grid flex-1 auto-rows-min gap-6 px-4">
        <Tabs v-model="activeTab" default-value="login">
          <TabsList>
            <TabsTrigger value="login"> {{ $t('LoginWidgetLoginTab') }} </TabsTrigger>
            <TabsTrigger value="register"> {{ $t('LoginWidgetRegisterTab') }} </TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <p class="text-sm text-muted-foreground mb-4">{{ $t('LoginWidgetLoginHint') }}</p>
            <form class="flex flex-col gap-2">
              <UsernamePwdWidget
                v-model:username="newUser.username"
                v-model:password="newUser.password"
              />
            </form>
          </TabsContent>
          <TabsContent value="register">
            <p class="text-sm text-muted-foreground mb-4">{{ $t('LoginWidgetRegisterHint') }}</p>
            <form class="flex flex-col gap-4">
              <UsernamePwdWidget
                v-model:username="newUser.username"
                v-model:password="newUser.password"
              />
              <FullNameWidget
                v-model:surname="newUser.surname"
                v-model:name="newUser.name"
                v-model:patronymic="newUser.patronymic"
              />

              <DynamicLabeledInput
                :placeholder="$t('LoginWidgetEmailPlaceholder')"
                v-model="newUser.email"
                inputType="email"
              />
            </form>
          </TabsContent>
        </Tabs>
      </div>
      <SheetFooter>
        <Button type="submit" @click="handleSubmit" :disabled="isLoading">
          {{
            activeTab === 'login' ? $t('LoginWidgetLoginButton') : $t('LoginWidgetRegisterButton')
          }}
        </Button>
        <SheetClose as-child>
          <Button variant="outline" @click="activeTab = 'login'" :disabled="isLoading">
            {{ $t('LoginWidgetCloseButton') }}
          </Button>
        </SheetClose>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
