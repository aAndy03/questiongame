import { useState } from 'react'
import { Button, Panel, Text } from '@/atoms'
import { useNavStore } from '@/chrome/nav'
import { toast } from '@/chrome/toast'
import { CONTROL, SHELL } from '@/copy'
import { useHostCommand } from '@/host/commands'
import { usePlayList, useRecipeList } from '@/host/queries'
import type { PlayRecord, Recipe } from '@/host/types'

/** How many games Control's empty state offers (beta.10). */
export const RECENT_GAMES = 6

export interface RecentGame {
  readonly recipe: Recipe
  /** When it was last played or edited, whichever is later. */
  readonly at: number
  readonly why: 'played' | 'edited'
}

/**
 * The games to pick up again (beta.10): each by the later of when it was last
 * **played** (its Plays' start or end — a rehearsal is a Play too) and last
 * **edited**, most recent first, at most [`RECENT_GAMES`]. Pure, so the order
 * is tested without a host.
 */
export function recentGames(recipes: readonly Recipe[], plays: readonly PlayRecord[], limit = RECENT_GAMES): readonly RecentGame[] {
  const played = new Map<string, number>()
  for (const p of plays) {
    const at = Math.max(p.startedAtMs ?? 0, p.endedAtMs ?? 0)
    if (at > (played.get(p.recipeId) ?? 0)) played.set(p.recipeId, at)
  }
  return recipes
    .filter((r) => r.archivedAt === null)
    .map((recipe): RecentGame => {
      const lastPlayed = played.get(recipe.id) ?? 0
      return lastPlayed >= recipe.updatedAt ? { recipe, at: lastPlayed, why: 'played' } : { recipe, at: recipe.updatedAt, why: 'edited' }
    })
    .sort((a, b) => b.at - a.at || a.recipe.name.localeCompare(b.recipe.name))
    .slice(0, limit)
}

/** *2 days ago*, *yesterday*, *just now* — said the operator's way. */
export function ago(at: number, now = Date.now()): string {
  const seconds = Math.min(0, Math.round((at - now) / 1000))
  const units: readonly [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit)
  }
  return CONTROL.justNow
}

/**
 * **Pick up where you left off** (beta.10): Control with nothing loaded offers
 * the games most recently played or edited, each with *Load into Control*,
 * instead of only sending the operator to Games. *Go to Games* stays, under
 * the list; with no games at all the plain empty state shows instead.
 */
export function RecentGames({ empty }: { empty: React.ReactNode }) {
  const recipes = useRecipeList('active')
  const plays = usePlayList(null)
  const run = useHostCommand()
  const go = useNavStore((s) => s.go)
  const [loading, setLoading] = useState<string | null>(null)
  const games = recentGames(recipes.data ?? [], plays.data ?? [])

  if (recipes.isPending) return null
  if (games.length === 0) return <>{empty}</>

  const load = async (r: Recipe) => {
    setLoading(r.id)
    // The Game page's own Load: the verdict is the only signal, and a refusal
    // opens the collector where the click was (P12.8).
    const ok = await run.ok('play_load', { recipeId: r.id, playId: `play-${Date.now()}` }, { openCollectorOnRefusal: true, code: 'play_refused' })
    setLoading(null)
    if (ok) toast.success(SHELL.inControl(r.name), SHELL.inControlHint)
  }

  return (
    <section className="flex w-full max-w-4xl flex-col gap-4 px-6" aria-label={CONTROL.recentTitle} data-recent-games>
      <div className="flex flex-col gap-1">
        <Text as="h1" variant="studio-heading">
          {CONTROL.recentTitle}
        </Text>
        <Text variant="studio-caption" tone="muted">
          {CONTROL.noRecipeBody}
        </Text>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {games.map(({ recipe, at, why }) => {
          const questions = recipe.board.reduce((n, b) => n + b.questionIds.length, 0)
          return (
            <li key={recipe.id} className="flex" data-recent-game={recipe.id}>
              <Panel variant="secondary" className="flex flex-1 flex-col gap-3">
                <button
                  type="button"
                  className="flex min-w-0 flex-col items-start gap-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                  onClick={() => void go({ tab: 'games', id: recipe.id })}
                >
                  <Text variant="studio-label" truncate className="max-w-full">
                    {recipe.name}
                  </Text>
                  <Text variant="studio-caption" tone="muted" truncate className="max-w-full">
                    {[recipe.folder, CONTROL.recentCounts(recipe.teams.length, questions)].filter(Boolean).join(' · ')}
                  </Text>
                </button>
                <div className="flex items-center justify-between gap-2">
                  <Text variant="studio-caption" tone="muted">
                    {why === 'played' ? CONTROL.recentPlayed(ago(at)) : CONTROL.recentEdited(ago(at))}
                  </Text>
                  <Button size="sm" variant="primary" icon="control" isPending={loading === recipe.id} isDisabled={loading !== null} onPress={() => void load(recipe)}>
                    {CONTROL.recentLoad}
                  </Button>
                </div>
                </Panel>
            </li>
          )
        })}
      </ul>
      <div>
        <Button variant="secondary" icon="games" onPress={() => void go({ tab: 'games' })}>
          {CONTROL.goToGames}
        </Button>
      </div>
    </section>
  )
}
