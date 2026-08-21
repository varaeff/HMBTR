import { ref, watch, computed, type Ref } from 'vue'

type PersistId = string | number | Ref<string | number>
type PersistDefault = boolean | Ref<boolean>

const resolvePersistId = (id: PersistId) => (typeof id === 'object' && 'value' in id ? id.value : id)

const resolvePersistDefault = (defaultValue: PersistDefault) =>
  typeof defaultValue === 'object' && 'value' in defaultValue ? defaultValue.value : defaultValue

export const getCollapsibleStorageKey = (namespace: string, id: string | number) =>
  `HMBTR-collapsible-${namespace}-${id}`

export const hasCollapsiblePersistedState = (namespace: string, id: string | number) =>
  localStorage.getItem(getCollapsibleStorageKey(namespace, id)) !== null

export const setCollapsiblePersistedState = (
  namespace: string,
  id: string | number,
  isOpen: boolean
) => {
  localStorage.setItem(getCollapsibleStorageKey(namespace, id), String(isOpen))
}

export function useCollapsiblePersist(
  namespace: string,
  id: PersistId,
  defaultValue: PersistDefault = true
) {
  const storageKey = computed(() => {
    return getCollapsibleStorageKey(namespace, resolvePersistId(id))
  })

  const defaultOpen = computed(() => resolvePersistDefault(defaultValue))
  const isOpen = ref(defaultOpen.value)

  const load = () => {
    const stored = localStorage.getItem(storageKey.value)
    if (stored !== null) {
      isOpen.value = stored === 'true'
    } else {
      isOpen.value = defaultOpen.value
    }
  }

  watch(
    storageKey,
    () => {
      load()
    },
    { immediate: true }
  )

  watch(defaultOpen, () => {
    if (localStorage.getItem(storageKey.value) === null) {
      isOpen.value = defaultOpen.value
    }
  })

  watch(isOpen, (newVal) => {
    localStorage.setItem(storageKey.value, String(newVal))
  })

  return isOpen
}
