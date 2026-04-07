import { ref, watch, computed, type Ref } from 'vue'

export function useCollapsiblePersist(
  namespace: string,
  id: string | number | Ref<string | number>,
  defaultValue = true
) {
  const storageKey = computed(() => {
    const actualId = typeof id === 'object' && 'value' in id ? id.value : id
    return `HMBTR-collapsible-${namespace}-${actualId}`
  })

  const isOpen = ref(defaultValue)

  const load = () => {
    const stored = localStorage.getItem(storageKey.value)
    if (stored !== null) {
      isOpen.value = stored === 'true'
    } else {
      isOpen.value = defaultValue
    }
  }

  watch(
    storageKey,
    () => {
      load()
    },
    { immediate: true }
  )

  watch(isOpen, (newVal) => {
    localStorage.setItem(storageKey.value, String(newVal))
  })

  return isOpen
}
