import { reasonLabels } from '../lib/moderation'
import { TextAreaField } from './Field'

/** Motivo y nota interna de una decisión de moderación: van dentro de su formulario (ver readDecision). */
export function DecisionFields() {
  return (
    <>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-[15px] font-semibold text-muted">Motivo</legend>
        {Object.entries(reasonLabels).map(([value, label], i) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-card-line bg-surface px-4 py-3 text-[15px] font-bold has-[:checked]:border-ink"
          >
            <input type="radio" name="reason" value={value} required defaultChecked={i === 0} className="accent-ink" />
            {label}
          </label>
        ))}
      </fieldset>
      <TextAreaField label="Nota interna (opcional)" hint="La persona afectada verá el motivo, pero no esta nota." name="note" maxLength={500} rows={2} />
    </>
  )
}
