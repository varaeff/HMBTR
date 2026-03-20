<script setup lang="ts">
import { DynamicLabeledInput } from '@/widgets/DynamicLabeledInput'

const surname = defineModel<string>('surname')
const name = defineModel<string>('name')
const patronymic = defineModel<string>('patronymic')
</script>

<template>
  <div class="flex flex-col">
    <DynamicLabeledInput :placeholder="$t('fullNameSurname')" v-model:value="surname" />
    <DynamicLabeledInput :placeholder="$t('fullNameName')" v-model:value="name" />
    <DynamicLabeledInput :placeholder="$t('fullNamePatronymic')" v-model:value="patronymic" />
  </div>
</template>
