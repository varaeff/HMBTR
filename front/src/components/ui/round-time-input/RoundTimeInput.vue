<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { formatRoundTime, parseRoundTime } from '@/lib/roundTime'

const props = defineProps<{
  modelValue: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const displayValue = ref(formatRoundTime(props.modelValue))
const editablePositions = [0, 1, 3, 4]

watch(
  () => props.modelValue,
  (value) => {
    displayValue.value = formatRoundTime(value)
  }
)

const secondsFromDigits = (digits: string) =>
  parseRoundTime(`${digits.slice(0, 2)}:${digits.slice(2, 4)}`)

const setCursor = (position: number) => {
  void nextTick(() => {
    inputRef.value?.setSelectionRange(position, position)
  })
}

const nextEditablePosition = (position: number) =>
  editablePositions.find((candidate) => candidate > position) ?? editablePositions[0]

const previousEditablePosition = (position: number) =>
  [...editablePositions].reverse().find((candidate) => candidate < position) ??
  editablePositions[editablePositions.length - 1]

const emitDigits = (digits: string) => {
  const seconds = secondsFromDigits(digits)
  if (seconds === null) return false

  displayValue.value = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`
  emit('update:modelValue', seconds)
  return true
}

const isWholeValueSelected = (input: HTMLInputElement) =>
  input.selectionStart === 0 && input.selectionEnd === input.value.length

const replaceDigitAt = (position: number, digit: string) => {
  const rawDigits = displayValue.value.replace(':', '').split('')
  const digitIndex = position > 2 ? position - 1 : position
  rawDigits[digitIndex] = digit

  return emitDigits(rawDigits.join(''))
}

const appendDigit = (digit: string) => {
  const rawDigits = displayValue.value.replace(':', '')
  return emitDigits(`${rawDigits}${digit}`.slice(-4))
}

const clearDigitAt = (position: number) => {
  const rawDigits = displayValue.value.replace(':', '').split('')
  const digitIndex = position > 2 ? position - 1 : position
  rawDigits[digitIndex] = '0'

  return emitDigits(rawDigits.join(''))
}

const handleDigit = (event: KeyboardEvent, input: HTMLInputElement) => {
  const digit = event.key
  const position = input.selectionStart ?? input.value.length

  if (!isWholeValueSelected(input) && editablePositions.includes(position)) {
    if (replaceDigitAt(position, digit)) {
      setCursor(nextEditablePosition(position))
    }
    return
  }

  if (appendDigit(digit)) {
    setCursor(input.value.length)
  }
}

const handleBackspace = (input: HTMLInputElement) => {
  if (isWholeValueSelected(input)) {
    if (emitDigits('0000')) setCursor(input.value.length)
    return
  }

  const position = input.selectionStart ?? input.value.length
  const targetPosition = editablePositions.includes(position)
    ? position
    : previousEditablePosition(position)
  if (clearDigitAt(targetPosition)) {
    setCursor(targetPosition)
  }
}

const handleDelete = (input: HTMLInputElement) => {
  if (isWholeValueSelected(input)) {
    if (emitDigits('0000')) setCursor(input.value.length)
    return
  }

  const position = input.selectionStart ?? input.value.length
  const targetPosition = editablePositions.includes(position)
    ? position
    : nextEditablePosition(position)
  if (clearDigitAt(targetPosition)) {
    setCursor(targetPosition)
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (props.disabled) return
  const input = event.target as HTMLInputElement
  const allowedKeys = ['Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']

  if (/^\d$/.test(event.key)) {
    event.preventDefault()
    handleDigit(event, input)
    return
  }

  if (event.key === 'Backspace') {
    event.preventDefault()
    handleBackspace(input)
    return
  }

  if (event.key === 'Delete') {
    event.preventDefault()
    handleDelete(input)
    return
  }

  if (!allowedKeys.includes(event.key) && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
  }
}

const handlePaste = (event: ClipboardEvent) => {
  if (props.disabled) return
  event.preventDefault()

  const pastedDigits = event.clipboardData?.getData('text').replace(/\D/g, '') ?? ''
  if (!pastedDigits) return

  void appendDigit(pastedDigits.slice(-4))
}

const selectAll = (event: FocusEvent) => {
  ;(event.target as HTMLInputElement).select()
}
</script>

<template>
  <input
    ref="inputRef"
    :value="displayValue"
    type="text"
    inputmode="numeric"
    maxlength="5"
    class="h-8 w-16 rounded border text-center tabular-nums outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-muted disabled:text-muted-foreground"
    :disabled="disabled"
    @keydown="handleKeydown"
    @paste="handlePaste"
    @focus="selectAll"
  />
</template>
