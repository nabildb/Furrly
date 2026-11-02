import { useState } from 'react'
import { api } from '../lib/api'
import { cleanFields, type Decision } from '../lib/moderation'
import { DecisionSheet } from './DecisionSheet'

/** Quitar lo ofensivo de un perfil sin tocar la cuenta ni lo publicado. Solo para moderadores. */
export function CleanProfileButton({ username, onDone }: { username: string; onDone: (username: string) => void }) {
  const [open, setOpen] = useState(false)

  async function clean(decision: Decision, form: FormData) {
    const fields = form.getAll('fields')
    const result = await api<{ username: string }>(`/admin/users/${username}/clean`, {
      method: 'POST',
      body: JSON.stringify({ ...decision, fields }),
    })
    setOpen(false)
    onDone(result.username)
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-[13px] font-extrabold text-danger hover:underline">
        Limpiar perfil
      </button>
      {open && (
        <DecisionSheet title={`Limpiar el perfil de @${username}`} confirmLabel="Limpiar perfil" onConfirm={clean} onClose={() => setOpen(false)}>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-[15px] font-semibold text-muted">Qué quieres quitar</legend>
            {Object.entries(cleanFields).map(([value, label]) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-card-line bg-surface px-4 py-3 text-[15px] font-bold has-[:checked]:border-ink"
              >
                <input type="checkbox" name="fields" value={value} className="accent-ink" />
                {label}
              </label>
            ))}
          </fieldset>
          <p className="text-sm font-semibold text-muted">Si quitas el nombre de usuario, tendrá que elegir otro la próxima vez que entre.</p>
        </DecisionSheet>
      )}
    </>
  )
}
