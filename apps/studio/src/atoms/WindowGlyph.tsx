/**
 * The four caption glyphs Windows draws on its own title bar — minimize,
 * maximize, restore, close — as the same 10px hairlines (beta.10), so
 * Studio's title bar reads as the window's, not as an app's buttons. Not in
 * the icon set on purpose: they are the OS's shapes, used nowhere else.
 */
export type WindowGlyphName = 'minimize' | 'maximize' | 'restore' | 'close'

export function WindowGlyph({ name }: { name: WindowGlyphName }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden fill="none" stroke="currentColor" strokeWidth="1" shapeRendering="crispEdges">
      {name === 'minimize' ? <path d="M0 5.5h10" /> : null}
      {name === 'maximize' ? <rect x="0.5" y="0.5" width="9" height="9" /> : null}
      {name === 'restore' ? (
        <>
          <rect x="0.5" y="2.5" width="7" height="7" />
          <path d="M2.5 2.5V0.5h7v7h-2" />
        </>
      ) : null}
      {name === 'close' ? <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" shapeRendering="geometricPrecision" /> : null}
    </svg>
  )
}
