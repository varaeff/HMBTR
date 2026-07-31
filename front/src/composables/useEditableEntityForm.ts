import { computed, reactive, ref } from 'vue'

export interface EditableEntityFormOptions<
  Entity,
  Draft extends Record<string, unknown>,
  Payload,
  SavedEntity
> {
  createDraft: () => Draft
  requiredFields: readonly (keyof Draft)[]
  fillDraft: (draft: Draft, entity: Entity) => void
  buildPayload: (draft: Draft, entity: Entity) => Payload
  save: (entity: Entity, payload: Payload) => Promise<SavedEntity>
  canSave?: () => boolean
}

export const useEditableEntityForm = <
  Entity,
  Draft extends Record<string, unknown>,
  Payload,
  SavedEntity = Entity
>({
  createDraft,
  requiredFields,
  fillDraft,
  buildPayload,
  save,
  canSave
}: EditableEntityFormOptions<Entity, Draft, Payload, SavedEntity>) => {
  const draft = reactive(createDraft()) as Draft
  const isEditing = ref(false)
  const buttonDisabled = computed(() => requiredFields.some((field) => !draft[field]))

  const fillDraftFromEntity = (entity: Entity | null | undefined) => {
    if (!entity) return false

    fillDraft(draft, entity)
    return true
  }

  const startEditing = (entity: Entity | null | undefined) => {
    if (fillDraftFromEntity(entity)) {
      isEditing.value = true
    }
  }

  const cancelEditing = (entity: Entity | null | undefined) => {
    fillDraftFromEntity(entity)
    isEditing.value = false
  }

  const saveEntity = async (entity: Entity | null | undefined) => {
    if (!entity || canSave?.() === false) return null

    const savedEntity = await save(entity, buildPayload(draft, entity))
    isEditing.value = false
    return savedEntity
  }

  return {
    draft,
    isEditing,
    buttonDisabled,
    fillDraftFromEntity,
    startEditing,
    cancelEditing,
    saveEntity
  }
}
