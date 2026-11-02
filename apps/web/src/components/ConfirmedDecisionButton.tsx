import { useState, type ReactNode } from 'react'
import { readDecision, type Decision } from '../lib/moderation'
import { ConfirmUsernameSheet } from './ConfirmUsernameSheet'
import { DecisionFields } from './DecisionFields'

interface ConfirmedDecisionButtonProps {
  label: string
  title: string
  username: string
  onConfirm: (decision: Decision) => Promise<unknown>
  /** Qué va a pasar. */
  children: ReactNode
}

/** Decisión sobre una cuenta que no se puede deshacer: además del motivo, hay que escribir su nombre. */
export function ConfirmedDecisionButton({ label, title, username, onConfirm, children }: ConfirmedDecisionButtonProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm(form: FormData) {
    setBusy(true)
    setError(null)
    try {
      await onConfirm(readDecision(form))
      setBusy(false)
      setOpen(false)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-[13px] font-extrabold text-danger hover:underline">
        {label}
      </button>
      {open && (
        <ConfirmUsernameSheet title={title} username={username} deleting={busy} error={error} onConfirm={confirm} onClose={() => setOpen(false)}>
          {children}
          <DecisionFields />
        </ConfirmUsernameSheet>
      )}
    </>
  )
}
