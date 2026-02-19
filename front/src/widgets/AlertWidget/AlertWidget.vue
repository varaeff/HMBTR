<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useCommonDataStore } from '@/stores/commonData'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { DynamicLabeledInput } from '@/widgets/DynamicLabeledInput'
import { CircleX } from 'lucide-vue-next'
import { CircleAlert } from 'lucide-vue-next'

const props = defineProps<{
  isError: boolean
  title: string
  mainText: string
  showInput: boolean
  buttonAction: (event: MouseEvent) => void
  closeAction: (event: MouseEvent) => void
}>()

const commonDataStore = useCommonDataStore()
const inputData = storeToRefs(commonDataStore).alertData
const buttonDisabled = computed(() => {
  return props.showInput ? inputData.value.trim().length === 0 : false
})
</script>

<template>
  <div>
    <div class="absolute inset-0 bg-black opacity-50 z-199" />
    <div class="absolute inset-0 flex items-center justify-center z-200">
      <Card class="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{{ props.title }}</CardTitle>
          <CardAction>
            <CircleX class="cursor-pointer" @click="props.closeAction" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <div class="grid w-full items-center gap-4">
            <div class="flex flex-col space-y-1.5">
              <DynamicLabeledInput
                v-if="props.showInput"
                :placeholder="$t('LocationBlockAlertPlaceholder')"
                v-model:value="inputData"
                @keyup.enter="props.buttonAction"
              />
              <div v-if="isError" class="flex items-center gap-4">
                <CircleAlert :size="48" class="shrink-0" />
                <div
                  class="flex-1 min-w-0 wrap-break-words whitespace-normal [&_pre]:whitespace-pre-wrap [&_pre]:wrap-break-words"
                  v-html="props.mainText"
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter class="flex flex-col gap-2">
          <Button class="w-full" :disabled="buttonDisabled" @click="props.buttonAction">
            {{ $t('LocationBlockAlertButton') }}
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
