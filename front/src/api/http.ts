import axios from 'axios'

const runtimeApiBaseUrl = window.__HMBTR_CONFIG__?.VITE_API_BASE_URL

const http = axios.create({
  baseURL: runtimeApiBaseUrl || import.meta.env.VITE_API_BASE_URL,
  timeout: 10000
})

export default http
