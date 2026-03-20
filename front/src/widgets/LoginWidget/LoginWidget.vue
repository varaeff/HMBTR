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
  SheetTrigger
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DynamicLabeledInput } from '@/widgets/DynamicLabeledInput'
import { UsernamePwdWidget } from '@/widgets/UsernamePwdWidget'
import { FullNameWidget } from '@/widgets/FullNameWidget'

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

watch(isSheetOpen, (isOpen) => {
  if (!isOpen) {
    activeTab.value = 'login'
  }
})
</script>

<template>
  <Sheet v-model:open="isSheetOpen">
    <SheetTrigger as-child>
      <Button variant="ghost" class="-mb-2"> {{ $t('menuLoginLink') }} </Button>
    </SheetTrigger>
    <SheetContent>
      <SheetHeader>
        <SheetTitle>{{ $t('menuLoginLink') }}</SheetTitle>
      </SheetHeader>
      <div class="grid flex-1 auto-rows-min gap-6 px-4">
        <Tabs v-model="activeTab" default-value="login">
          <TabsList>
            <TabsTrigger value="login"> {{ $t('LoginWidgetLoginTab') }} </TabsTrigger>
            <TabsTrigger value="register"> {{ $t('LoginWidgetRegisterTab') }} </TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <p class="text-sm text-muted-foreground mb-4">{{ $t('LoginWidgetLoginHint') }}</p>
            <div class="flex flex-col gap-2">
              <UsernamePwdWidget
                v-model:username="newUser.username"
                v-model:password="newUser.password"
              />
            </div>
          </TabsContent>
          <TabsContent value="register">
            <p class="text-sm text-muted-foreground mb-4">{{ $t('LoginWidgetRegisterHint') }}</p>
            <div class="flex flex-col gap-4">
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
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <SheetFooter>
        <Button type="submit">
          {{
            activeTab === 'login' ? $t('LoginWidgetLoginButton') : $t('LoginWidgetRegisterButton')
          }}
        </Button>
        <SheetClose as-child>
          <Button variant="outline" @click="activeTab = 'login'">
            {{ $t('LoginWidgetCloseButton') }}
          </Button>
        </SheetClose>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
