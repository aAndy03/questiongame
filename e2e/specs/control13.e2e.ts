import { $, $$, browser } from '@wdio/globals'
import { closeWhatsNew, onStage, onStudio, openGame, press, sees, shot, stageScreen } from '../support/app'

/**
 * beta.13 (P27), through the real host: a turn played to its verdict, and
 * what Control says about the token after it; the Timeline strip filling from
 * the real log (it read the wire's field names wrong, so this is where that
 * shows); a display aid reaching the Stage window; and the Screens canvas
 * naming its elements. Photographs land in `e2e/.artifacts/look-p27-*.png`.
 */
describe('beta.13: Control and Screens', () => {
  it('Screens names what can be clicked', async () => {
    // Before any Play: Screens is refused while one is playing.
    await onStudio()
    await closeWhatsNew()
    await browser.setWindowSize(1440, 900)
    await press('Screens')
    await browser.waitUntil(async () => (await $$('[data-node-handle]').length) > 0, { timeout: 20_000, timeoutMsg: 'no handles on the canvas' })
    await shot('p27-1440-screens')
    const handle = await $('[data-node-id="idle.eyebrow"]')
    await handle.click()
    await sees('Idle ▸ Eyebrow')
    await sees('Now:')
    await shot('p27-1440-screens-selected')
    await press('Decor')
    await browser.waitUntil(async () => await $('[data-decor-guide="anchor"]').isExisting(), { timeoutMsg: 'no anchor drawn' })
    await shot('p27-1440-screens-decor')
  })

  it('a turn to its verdict says what the token does, and the Timeline draws it', async () => {
    await press('Games')
    await openGame('Demo')
    await press('Load into Control')
    await browser.waitUntil(async () => (await browser.getWindowHandles()).length >= 2, { timeout: 30_000, timeoutMsg: 'no Stage window' })
    await onStudio()
    await press('Start Play')
    const geography = await $('button*=Geography')
    await geography.waitForClickable()
    await geography.click()
    await press('Question')
    await shot('p27-1440-control-question')

    // Reveal before Lock arms: the first press says it counts as wrong.
    await press('Reveal outcome')
    await sees('counts as a wrong answer')
    await press('Reveal outcome')
    await sees('The token is free')
    await shot('p27-1440-control-handover')

    // The Timeline strip draws the turn from the real log: a card, a verdict.
    await browser.waitUntil(async () => (await $$('[data-track-turn]').length) >= 1, { timeoutMsg: 'the Timeline drew no turn' })
    const strip = await $('[data-timeline-strip]').getText()
    if (strip.includes('No events yet')) throw new Error('the strip says No events over a count')
    if (!strip.includes('Incorrect')) throw new Error(`the strip has no verdict: ${strip}`)

    await browser.setWindowSize(1100, 760)
    await shot('p27-1100-control-handover')
    await browser.setWindowSize(1440, 900)
  })

  it('a display aid reaches the Stage window', async () => {
    await onStudio()
    const greyscale = await $('[data-viewer-controls] button*=Greyscale')
    if (await greyscale.isExisting()) await greyscale.click()
    else {
      await $('[data-viewer-options]').click()
      await $('button*=Greyscale').click()
    }
    await onStage()
    await browser.waitUntil(async () => ((await $('[data-stage-frame]').getAttribute('data-stage-filter')) ?? '').includes('grayscale'), {
      timeoutMsg: 'Stage drew no greyscale',
    })
    await onStudio()
    const normal = await $('[data-viewer-controls] button*=Normal')
    if (await normal.isExisting()) await normal.click()
    await onStage()
    await browser.waitUntil(async () => (await stageScreen()) !== null)
    await onStudio()
  })
})
