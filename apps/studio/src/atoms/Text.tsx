import { createElement, type CSSProperties, type ReactNode } from 'react'
import { StudioTransition } from '@questiongame/text/studio'
import { highlightRanges, variantTokens, type TextTransition, type TextVariant } from '@questiongame/text'

/**
 * The Studio `Text` atom — the React half of `@questiongame/text` (§2.29).
 *
 * `variant` resolves to the Studio type roles in `design-studio/tokens`;
 * nothing here is a raw size. `transition` says what happens when the content
 * *changes*: `none` is a plain node; `swap` and `count` hand the string to
 * Calligraph (Motion), which slides shared characters and fades the rest.
 * Studio has no `anim-complete` contract, so a text tween here is harmless;
 * on Stage the same prop is GSAP inside the screen timeline.
 */

export type StudioTextVariant = Extract<TextVariant, `studio-${string}`>
export type TextTone = 'default' | 'muted' | 'accent' | 'success' | 'warning' | 'danger' | 'inherit'

const TONE: Record<TextTone, string | undefined> = {
  default: 'var(--foreground)',
  muted: 'var(--muted)',
  accent: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  inherit: undefined,
}

export interface TextProps {
  variant?: StudioTextVariant
  transition?: TextTransition
  as?: keyof HTMLElementTagNameMap
  tone?: TextTone
  /** Single-line ellipsis. */
  truncate?: boolean | undefined
  /** `tabular-nums`, for columns of figures. */
  tabular?: boolean | undefined
  id?: string | undefined
  className?: string | undefined
  style?: CSSProperties | undefined
  title?: string | undefined
  /**
   * The search in force (beta.9): its words are marked where they start a
   * word of the text — case and accents aside. Plain strings only; nothing
   * marks without a search.
   */
  highlight?: string | null | undefined
  children?: ReactNode
}

export function Text({
  variant = 'studio-body',
  transition = 'none',
  as = 'span',
  tone = 'inherit',
  truncate,
  tabular,
  id,
  className,
  style,
  title,
  highlight,
  children,
}: TextProps) {
  const t = variantTokens(variant)
  const resolved: CSSProperties = {
    fontSize: t.size,
    fontFamily: t.family,
    fontWeight: t.weight,
    letterSpacing: t.tracking,
    lineHeight: t.leading,
    color: TONE[tone],
    ...(truncate ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' } : {}),
    ...(tabular ? { fontVariantNumeric: 'tabular-nums' } : {}),
    ...style,
  }
  const text = typeof children === 'string' || typeof children === 'number' ? String(children) : null
  const ranges = text !== null && transition === 'none' ? highlightRanges(text, highlight) : []
  const body =
    transition !== 'none' && text !== null ? (
      <StudioTransition transition={transition}>{text}</StudioTransition>
    ) : ranges.length > 0 && text !== null ? (
      marks(text, ranges)
    ) : (
      children
    )
  return createElement(as, { id, className, style: resolved, title }, body)
}

/** The text with its search hits in `<mark data-hit>` (studio.css draws them). */
function marks(text: string, ranges: readonly (readonly [number, number])[]): ReactNode[] {
  const out: ReactNode[] = []
  let at = 0
  for (const [a, b] of ranges) {
    if (a > at) out.push(text.slice(at, a))
    out.push(
      <mark key={a} data-hit="">
        {text.slice(a, b)}
      </mark>,
    )
    at = b
  }
  if (at < text.length) out.push(text.slice(at))
  return out
}
