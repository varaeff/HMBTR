import axios from 'axios'

export async function getCountryNameById(id: number): Promise<string> {
  const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/country/${id}`)
  return response.data.name
}

export async function getCityNameById(id: number): Promise<string> {
  const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/city/${id}`)
  return response.data.name
}

export async function getClubNameById(id: number): Promise<string> {
  const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/club/${id}`)
  return response.data.name
}
