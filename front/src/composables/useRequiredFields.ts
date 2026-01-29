import { computed } from 'vue'

export const useRequiredFields = <T extends Record<string, any>>(model: T, fields: (keyof T)[]) =>
  computed(() => fields.some((f) => !model[f]))
