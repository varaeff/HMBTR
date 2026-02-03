import { ref } from 'vue'
import { useCommonDataStore } from '@/stores/commonData'

export function useAddEntityAlert() {
  const commonDataStore = useCommonDataStore()
  const showAlert = ref(false)

  const alertData = {
    isError: ref(false),
    title: ref(''),
    mainText: ref(''),
    showInput: ref(false),
    buttonAction: () => {
      showAlert.value = false
    },
    closeAction: () => {
      commonDataStore.alertData = ''
      showAlert.value = false
    }
  }

  const handleRequestAdd = async ({
    title,
    performAdd
  }: {
    title: string
    performAdd: (name: string) => Promise<void>
  }) => {
    alertData.isError.value = false
    alertData.title.value = title
    alertData.mainText.value = ''
    alertData.showInput.value = true

    alertData.buttonAction = async () => {
      const value = commonDataStore.alertData?.trim() || ''
      await performAdd(value)
      commonDataStore.alertData = ''
      showAlert.value = false
    }

    showAlert.value = true
  }

  return { showAlert, alertData, handleRequestAdd }
}
