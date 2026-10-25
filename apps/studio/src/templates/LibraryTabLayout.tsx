import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { ListArea } from './ListArea'

export interface LibraryTabLayoutProps {
  header: ReactNode
  /** `ListToolbar`, on its own row above the list and the aside (P20). */
  toolbar?: ReactNode
  /** The list, filling the remaining height. */
  children: ReactNode
  /** The detail aside: beside the list at wide widths, over it below 1280 px (1.1.1). */
  aside?: ReactNode
  /** Back to the list, from the narrow window's Close. */
  onCloseAside?: () => void
}

/**
 * Header · toolbar · list · optional aside. 24px at the sides (05_STUDIO_DESIGN.md
 * §2.4), 16px above, none below: the list runs down to the status bar, which
 * carries its pages (beta.9); 12px from the header to the list.
 */
export function LibraryTabLayout({ header, toolbar, children, aside, onCloseAside }: LibraryTabLayoutProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14, ease: [0.2, 0, 0, 1] }}
      className="flex h-full min-h-0 flex-col gap-3 px-6 pt-4"
    >
      {header}
      <ListArea toolbar={toolbar} aside={aside} onCloseAside={onCloseAside}>
        {children}
      </ListArea>
    </motion.div>
  )
}
