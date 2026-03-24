<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'

const router = useRouter()
</script>

<template>
  <div class="flex flex-col items-center justify-center h-[80vh] text-center">
    <h1 class="text-[6rem] leading-none m-0 text-[#e74c3c] font-bold">
      {{ $t('forbiddenPageTitle') }}
    </h1>
    <p class="text-[1.2rem] my-5">{{ $t('forbiddenPageMessage') }}</p>
    <Button @click="router.push('/')">{{ $t('forbiddenPageHomeButton') }}</Button>
  </div>
</template>
