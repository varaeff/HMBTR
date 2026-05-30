/// <reference types="vite/client" />

interface HmbtrRuntimeConfig {
  VITE_API_BASE_URL?: string
}

interface Window {
  __HMBTR_CONFIG__?: HmbtrRuntimeConfig
}
