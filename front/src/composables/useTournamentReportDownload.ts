import { ref, type ComputedRef, type Ref } from 'vue'
import http from '@/api/http'
import { API_ROUTES } from '@shared/routes'
import {
  type ApiErrorWithResponse,
  type ReportErrorData,
  isReportErrorData
} from './tournamentPageErrors'

type ReportLanguage = 'en' | 'ru'

interface ApiUiErrorStore {
  setError: (message: string) => void
}

const REPORT_DOWNLOAD_TIMEOUT_MS = 120000

export const useTournamentReportDownload = ({
  tournamentId,
  tournamentName,
  apiUiStore,
  hasTournament
}: {
  tournamentId: Ref<number>
  tournamentName: ComputedRef<string>
  apiUiStore: ApiUiErrorStore
  hasTournament: () => boolean
}) => {
  const isDownloading = ref(false)

  const getReportErrorMessage = async (error: unknown) => {
    const responseData = (error as ApiErrorWithResponse).response?.data

    if (responseData instanceof Blob) {
      const text = await responseData.text()

      try {
        const parsed = JSON.parse(text) as ReportErrorData
        const details = Array.isArray(parsed.details)
          ? parsed.details.join(', ')
          : typeof parsed.details === 'string'
            ? parsed.details
            : undefined

        return details || parsed.error || text || 'Failed to download tournament report'
      } catch {
        return text || 'Failed to download tournament report'
      }
    }

    if (isReportErrorData(responseData)) {
      const details = Array.isArray(responseData.details)
        ? responseData.details.join(', ')
        : typeof responseData.details === 'string'
          ? responseData.details
          : undefined

      return details || responseData.error || 'Failed to download tournament report'
    }

    return (error as ApiErrorWithResponse).message || 'Failed to download tournament report'
  }

  const getFileNameFromContentDisposition = (contentDisposition?: string) => {
    if (!contentDisposition) return `${tournamentName.value || 'tournament'}-results.pdf`

    const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/)
    if (encodedMatch?.[1]) {
      return decodeURIComponent(encodedMatch[1])
    }

    const plainMatch = contentDisposition.match(/filename="([^"]+)"/)
    return plainMatch?.[1] ?? `${tournamentName.value || 'tournament'}-results.pdf`
  }

  const download = async (language: ReportLanguage) => {
    if (!hasTournament() || isDownloading.value) return

    isDownloading.value = true

    try {
      const { data, headers } = await http.get(API_ROUTES.TOURNAMENTS.REPORT(tournamentId.value), {
        params: { lang: language },
        responseType: 'blob',
        timeout: REPORT_DOWNLOAD_TIMEOUT_MS
      })
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')

      link.href = url
      link.download = getFileNameFromContentDisposition(headers['content-disposition'])
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      const message = await getReportErrorMessage(error)
      apiUiStore.setError(message)
      console.error('Failed to download tournament report:', message, error)
    } finally {
      isDownloading.value = false
    }
  }

  return {
    isDownloading,
    getReportErrorMessage,
    download
  }
}
