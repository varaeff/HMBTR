<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import CountryFlag from 'vue-country-flag-next'
import i18n from 'i18next'

const selectedLanguage = ref('')

onMounted(() => {
  const savedLng = localStorage.getItem('HMBTRi18nextLng')
  console.log(savedLng)
  selectedLanguage.value = savedLng || 'ru'
})

const handleLanguageChange = (value: string): void => {
  selectedLanguage.value = value
  i18n.changeLanguage(value)
}
</script>

<template>
  <Select
    v-model="selectedLanguage"
    @update:model-value="(val) => handleLanguageChange(val as string)"
  >
    <SelectTrigger class="w-auto border-none shadow-none bg-transparent focus:ring-0 p-0">
      <SelectValue>
        <div class="flex items-center justify-center -mt-1.5">
          <country-flag :country="selectedLanguage === 'en' ? 'gb' : 'ru'" size="normal" />
        </div>
      </SelectValue>
    </SelectTrigger>

    <SelectContent class="min-w-12.5 w-auto border-none shadow-none bg-transparent p-0">
      <SelectItem value="ru" class="cursor-pointer focus:bg-transparent justify-center p-1 -ml-3">
        <div class="flex items-center -mt-3">
          <country-flag country="ru" size="normal" />
        </div>
      </SelectItem>
      <SelectItem value="en" class="cursor-pointer focus:bg-transparent justify-center p-1 -mx-3">
        <div class="flex items-center -mt-2">
          <country-flag country="gb" size="normal" />
        </div>
      </SelectItem>
    </SelectContent>
  </Select>
</template>
