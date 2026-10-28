import { QuestionEditor } from '@/organisms'
import { RecordPageLayout } from '@/templates'
import { useEffect } from 'react'
import { tipMoment } from '@/tips/signals'

export interface QuestionPageProps {
  id: string | null
  mode: 'edit' | 'new'
  domainId?: string | undefined
}

/** A question's editor. Viewing one is the Questions list's aside (1.1.1). */
export function QuestionPage({ id, mode, domainId }: QuestionPageProps) {
  // beta.11: a new question is a moment a tip may answer (*make a domain first*).
  useEffect(() => {
    if (mode === 'new') tipMoment('editor:new-question')
  }, [mode])
  return (
    <RecordPageLayout>
      <QuestionEditor id={mode === 'edit' ? id : null} domainId={domainId} />
    </RecordPageLayout>
  )
}
