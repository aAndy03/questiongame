import { useEffect, useState } from 'react'
import { SelectField, Skeleton, Text } from '@/atoms'
import { EmptyState } from '@/molecules'
import { LayoutEditor } from '@/organisms'
import { WorkshopLayout } from '@/templates'
import { SCREENS_TAB } from '@/copy'
import { useRecipeList, useWorkspaceGeneration } from '@/host/queries'

/**
 * Screens (spec §12, §17): pick a game, then restyle its screens on the
 * canvas. The route is refused while a Play is open — that guard lives in
 * `App`, so this page never has to ask.
 */
export function ScreensPage() {
  // The game picked belongs to the workspace it was picked in: another
  // workspace starts the page over (beta.2: the editor stayed on the old one).
  return <ScreensFor key={useWorkspaceGeneration()} />
}

function ScreensFor() {
  const recipes = useRecipeList('active')
  const [recipeId, setRecipeId] = useState<string | null>(null)
  useEffect(() => {
    if (recipeId === null && recipes.data?.[0]) setRecipeId(recipes.data[0].id)
  }, [recipes.data, recipeId])

  const picker = (
    <div className="flex items-center gap-2">
      <Text variant="studio-caption" tone="muted">
        {SCREENS_TAB.game}
      </Text>
      <SelectField
        label={SCREENS_TAB.game}
        hideLabel
        value={recipeId}
        onChange={setRecipeId}
        placeholder={SCREENS_TAB.pickGame}
        options={(recipes.data ?? []).map((r) => ({ value: r.id, label: r.name }))}
        className="w-64"
      />
    </div>
  )

  if (!recipeId) {
    // Loading is not "no games" (beta.13): the list said there were none
    // for as long as it took to arrive.
    return (
      <WorkshopLayout toolbar={picker} inspector={null}>
        {recipes.isPending ? <Skeleton shape="card" className="h-full" /> : <EmptyState kind="empty" what="games" detail={SCREENS_TAB.noGames} />}
      </WorkshopLayout>
    )
  }

  return (
    <LayoutEditor
      key={recipeId}
      recipeId={recipeId}
      render={({ toolbar, status, canvas, inspector }) => (
        <WorkshopLayout
          toolbar={
            <>
              {/* The game and its save state on one line, the screens' tabs under it (beta.9). */}
              <div className="flex w-full items-center gap-3">
                {picker}
                <div className="flex-1" />
                {status}
              </div>
              <div className="w-full min-w-0">{toolbar}</div>
            </>
          }
          inspector={inspector}
        >
          {canvas}
        </WorkshopLayout>
      )}
    />
  )
}
