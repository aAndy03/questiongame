import { Button, IconButton } from '@/atoms'
import { CONTROL } from '@/copy'
import { STATS } from '@/copy/stats'
import { useDisplays } from './useDisplays'

/**
 * *Open / Close Stage* (beta.10: a toggle, as Statistics) and *Show / Close Statistics*, on whatever display each window
 * is set for — above the display cards in Settings ▸ Monitors and in the
 * status bar's displays popover (P21.4; Control's top strip until then).
 */
export function DisplayWindowButtons({ iconOnly }: { /** The popover's (beta.9): icons, named in their tooltips. */ iconOnly?: boolean | undefined }) {
  const { openStage, closeStage, stageOpen, statsOpen, setStatsOpen } = useDisplays()
  const stage = stageOpen ? { label: CONTROL.closeStage, run: closeStage } : { label: CONTROL.openStage, run: openStage }
  if (iconOnly) {
    return (
      <div className="flex items-center">
        <IconButton icon="displays" size="sm" variant={stageOpen ? 'secondary' : 'ghost'} label={stage.label} onPress={stage.run} />
        <IconButton icon="statistics" size="sm" variant={statsOpen ? 'secondary' : 'ghost'} label={statsOpen ? STATS.window.close : STATS.window.show} onPress={() => setStatsOpen(!statsOpen)} />
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" variant={stageOpen ? 'ghost' : 'secondary'} icon="displays" onPress={stage.run}>
        {stage.label}
      </Button>
      <Button size="sm" variant={statsOpen ? 'ghost' : 'secondary'} icon="statistics" onPress={() => setStatsOpen(!statsOpen)}>
        {statsOpen ? STATS.window.close : STATS.window.show}
      </Button>
    </div>
  )
}
