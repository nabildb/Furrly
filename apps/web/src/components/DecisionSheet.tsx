import { useState, type FormEvent, type ReactNode } from 'react'
import { readDecision, type Decision } from '../lib/moderation'
import { DecisionFields } from './DecisionFields'
import { ErrorText } from './Field'
import { Button } from './ui/Button'
import { Sheet } from './ui/Sheet'

interface DecisionSheetProps {
  title: string
  confirmLabel: string
  onConfirm: (decision: Decision) => Promise<unknown>
  onClose: () => void
  /** Qué va a pasar, antes de pedir el motivo. */
  children: ReactNode
}

/** Hoja de una decisión de moderación: explica qué va a pasar y pide el motivo. */
export function DecisionSheet({ title, confirmLabel, onConfirm, onClose, children }: DecisionSheetProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const decision = readDecision(new FormData(e.currentTarget))
    setBusy(true)
    setError(null)
    try {
      await onConfirm(decision)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <Sheet title={title} onClose={() => !busy && onClose()}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {children}
        <DecisionFields />
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Un momento…' : confirmLabel}
        </Button>
      </form>
    </Sheet>
  )
}
