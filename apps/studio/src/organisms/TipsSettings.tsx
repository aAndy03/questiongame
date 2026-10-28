import { Button, SwitchField } from '@/atoms'
import { SettingRow } from '@/molecules'
import { useChromeStore, useTipsPrefs } from '@/chrome/chrome'
import { toast } from '@/chrome/toast'
import { TIPS_COPY } from '@/copy/tips'

/**
 * Settings ▸ Help & tips (beta.11): *Show tips*, and *Start tips over*. Both
 * are this operator's chrome (`chrome.ts`), not the host's settings document —
 * tips are presentation, and two operators sharing a laptop learn apart.
 */
export function TipsSettings() {
  const { showTips } = useTipsPrefs()
  const setShowTips = useChromeStore((s) => s.setShowTips)
  const resetTips = useChromeStore((s) => s.resetTips)
  return (
    <>
      <SettingRow label={TIPS_COPY.showTips} description={TIPS_COPY.showTipsHint}>
        <SwitchField label={TIPS_COPY.showTips} hideLabel isSelected={showTips} onChange={setShowTips} />
      </SettingRow>
      <SettingRow label={TIPS_COPY.startOver} description={TIPS_COPY.startOverHint}>
        <Button
          size="sm"
          variant="secondary"
          icon="restore"
          onPress={() => {
            resetTips()
            toast.info(TIPS_COPY.startedOver)
          }}
        >
          {TIPS_COPY.startOver}
        </Button>
      </SettingRow>
    </>
  )
}
