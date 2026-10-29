/**
 * What Control has **armed** — one press made, the confirming press to come
 * (spec §14: arm → confirm). Chrome, not Play truth: nothing here reaches the
 * host until the second press, and any move of the Play disarms it.
 *
 * One store, because three call sites arm the same things (beta.13): the
 * Action Panel's buttons, the Viewer's hit targets and the chords. Armed in
 * one place, the confirming press may come from any of them, and every one of
 * them says it is armed.
 */

import { create } from 'zustand'

export type Arm =
  /** Pass the token after a correct answer — an override, so it confirms. */
  | { readonly kind: 'pass'; readonly teamId: string }
  /** `override.after_lock = allow`: reveal the live question and pass. */
  | { readonly kind: 'reveal-and-pass'; readonly teamId: string }
  /** Reveal before Lock, which the host scores as an empty answer. */
  | { readonly kind: 'reveal-unlocked' }

interface ArmState {
  readonly armed: Arm | null
  arm(arm: Arm): void
  disarm(): void
}

export const useArmStore = create<ArmState>()((set) => ({
  armed: null,
  arm: (armed) => set({ armed }),
  disarm: () => set({ armed: null }),
}))

export function sameArm(a: Arm | null, b: Arm): boolean {
  if (!a || a.kind !== b.kind) return false
  return a.kind === 'reveal-unlocked' || (b.kind !== 'reveal-unlocked' && a.teamId === b.teamId)
}

/**
 * Arm, or — when the same thing is already armed — disarm and say "go".
 * Returns true on the confirming press.
 */
export function armOrConfirm(arm: Arm): boolean {
  const store = useArmStore.getState()
  if (sameArm(store.armed, arm)) {
    store.disarm()
    return true
  }
  store.arm(arm)
  return false
}
