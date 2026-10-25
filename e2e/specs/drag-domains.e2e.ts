import { $$, browser } from '@wdio/globals'
import { closeWhatsNew, onStudio, press } from '../support/app'

/**
 * beta.9 on the real app: a question row dragged onto a domain in the Domains
 * pane joins it; a release away from the pane writes nothing. jsdom cannot
 * drive dnd-kit's pointer sensor, so this is where the drag itself is proved;
 * `apps/studio/src/pages/drag-domains.test.tsx` has its parts (Ctrl's move is
 * proved on the host and through the fake there).
 */
type Box = { getLocation(): Promise<{ x: number; y: number }>; getSize(): Promise<{ width: number; height: number }> }
type Point = { x: number; y: number }

const toast = async () => {
  const texts: string[] = []
  for (const t of await $$('[data-sonner-toast]')) texts.push(await t.getText())
  return texts.join(' | ')
}

async function centre(el: Box): Promise<Point> {
  const at = await el.getLocation()
  const size = await el.getSize()
  return { x: Math.round(at.x + size.width / 2), y: Math.round(at.y + size.height / 2) }
}

/** Press on `from`, move in steps (a drag starts after a few pixels), release at `to`. */
async function drag(from: Point, to: Point): Promise<void> {
  const steps = 12
  let chain = browser.action('pointer', { parameters: { pointerType: 'mouse' } }).move({ x: from.x, y: from.y }).down({ button: 0 })
  for (let i = 1; i <= steps; i++) {
    chain = chain.move({ x: Math.round(from.x + ((to.x - from.x) * i) / steps), y: Math.round(from.y + ((to.y - from.y) * i) / steps), duration: 30 })
  }
  await chain.up({ button: 0 }).perform()
}

describe('drag questions onto a domain', () => {
  it('adds on a release over a domain, and writes nothing on a release elsewhere', async () => {
    await onStudio()
    await closeWhatsNew()
    await press('Domains & Questions')
    await browser.waitUntil(async () => (await $$('[data-domain-drop]').length) > 1, { timeout: 30_000, timeoutMsg: 'no domains in the pane' })
    const boxes = await $$('[role="button"] input[type="checkbox"]')
    const row = await boxes[0]!.$('./ancestor::*[@role="button"][1]')
    const grip = await centre(row)

    // Away from the pane: nothing.
    await drag(grip, { x: grip.x, y: 20 })
    await browser.pause(500)
    expect(await toast()).not.toMatch(/Added|Moved/)

    // Onto the last domain: added (or already there).
    const domains = await $$('[data-domain-drop]')
    const target = domains[(await domains.length) - 1]!
    const name = await target.getAttribute('data-domain-name')
    await drag(grip, await centre(target))
    await browser.waitUntil(async () => new RegExp(`(Added 1 question to|already in) ${name}`).test(await toast()), {
      timeout: 10_000,
      timeoutMsg: `no toast for a drop on ${name}`,
    })
  })
})
