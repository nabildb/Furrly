import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const controlClass = 'mt-1 block w-full rounded border border-gray-300 px-3 py-2'

function Label({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
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
  options: Record<string, string>
}

export function SelectField({ label, options, ...select }: SelectFieldProps) {
  return (
    <Label label={label}>
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
}

export function TextAreaField({ label, ...textarea }: TextAreaFieldProps) {
  return (
    <Label label={label}>
      <textarea {...textarea} className={controlClass} />
    </Label>
  )
}
