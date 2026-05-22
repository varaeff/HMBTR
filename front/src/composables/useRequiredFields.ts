import { computed } from 'vue'

export const useRequiredFields = <T extends Record<string, unknown>>(model: T, fields: (keyof T)[]) =>
  computed(() => fields.some((f) => !model[f]))
