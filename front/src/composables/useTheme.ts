import { ref, watch } from 'vue'

const isDark = ref(false)

export function useTheme() {
  const applyTheme = () => {
    const html = document.documentElement
    if (isDark.value) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  }

  const initTheme = () => {
    const stored = localStorage.getItem('theme')
    if (stored) {
      isDark.value = stored === 'dark'
    } else {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyTheme()
  }

  const toggleTheme = (value?: boolean) => {
    isDark.value = typeof value === 'boolean' ? value : !isDark.value
  }

  watch(isDark, applyTheme)

  return {
    isDark,
    toggleTheme,
    initTheme
  }
}
