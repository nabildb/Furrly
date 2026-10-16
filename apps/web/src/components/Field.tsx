import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export const controlClass =
  'mt-1.5 block w-full rounded-[14px] border border-line bg-surface px-3.5 py-3 text-base font-semibold text-ink placeholder:font-normal placeholder:text-muted/70 transition focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:opacity-60'

export function Label({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[13px] font-semibold text-muted">{hint}</span>}
    </label>
  )
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export function Field({ label, hint, ...input }: FieldProps) {
  return (
    <Label label={label} hint={hint}>
      <input {...input} className={controlClass} />
    </Label>
  )
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
  options: Record<string, string>
}

export function SelectField({ label, hint, options, ...select }: SelectFieldProps) {
  return (
    <Label label={label} hint={hint}>
      <select {...select} className={controlClass}>
        {Object.entries(options).map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </Label>
  )
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
}

export function TextAreaField({ label, hint, ...textarea }: TextAreaFieldProps) {
  return (
    <Label label={label} hint={hint}>
      <textarea {...textarea} className={controlClass} />
    </Label>
  )
}

/** Mensaje de error de formulario o de carga. */
export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-[14px] bg-lost-soft px-3.5 py-2.5 text-sm font-bold text-lost-text">
      {children}
    </p>
  )
}
