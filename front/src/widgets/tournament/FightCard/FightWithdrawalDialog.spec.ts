import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import FightWithdrawalDialog from './FightWithdrawalDialog.vue'
import type { Fighter } from '@/model'

const createI18n = async () => {
  const instance = i18next.createInstance()

  await instance.init({
    lng: 'en',
    resources: {
      en: {
        translation: {
          disciplinaryCardsCancel: 'Cancel',
          disciplinaryCardsSave: 'Save',
          fighterWithdrawalDialogDescription: 'Enter withdrawal details',
          fighterWithdrawalDialogTitle: 'Withdraw fighter',
          fighterWithdrawalExcused: 'Excused reason',
          fighterWithdrawalReason: 'Withdrawal reason'
        }
      }
    }
  })

  return instance
}

const fighter: Fighter = {
  id: 1,
  name: 'Red',
  surname: 'Fighter',
  birthday: null,
  country_id: 1,
  city_id: 1,
  country: 'Country',
  city: 'City',
  club: 'Club'
}

const mountDialog = async (reason: string) => {
  const instance = await createI18n()

  return mount(FightWithdrawalDialog, {
    attachTo: document.body,
    props: {
      open: true,
      fighter,
      reason,
      isExcused: false,
      isSaving: false
    },
    global: {
      plugins: [[I18NextVue, { i18next: instance }]],
      stubs: {
        Dialog: { props: ['open'], template: '<div v-if="open"><slot /></div>' },
        DialogContent: { template: '<div><slot /></div>' },
        DialogDescription: { template: '<div><slot /></div>' },
        DialogFooter: { template: '<div><slot /></div>' },
        DialogHeader: { template: '<div><slot /></div>' },
        DialogTitle: { template: '<div><slot /></div>' }
      }
    }
  })
}

describe('FightWithdrawalDialog', () => {
  it('saves on Enter from the excused checkbox only when a reason is present', async () => {
    const wrapper = await mountDialog('   ')
    const checkbox = () => wrapper.find('[data-slot="checkbox"]')

    await checkbox().trigger('focus')
    await checkbox().trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('save')).toBeUndefined()

    await wrapper.setProps({ reason: 'injury' })
    await checkbox().trigger('focus')
    await checkbox().trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('save')).toHaveLength(1)

    wrapper.unmount()
  })
})
