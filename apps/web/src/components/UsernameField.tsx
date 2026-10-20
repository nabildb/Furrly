import { useEffect, useId, useRef, useState } from 'react'
import { normalizeUsername, USERNAME_MAX, usernameProblem } from '../lib/username'
import { cx } from '../lib/cx'
import { controlClass } from './Field'

interface UsernameFieldProps {
  defaultValue?: string
  hint?: string
}

/**
 * Campo del nombre de usuario (registro y /bienvenida). Antes usaba `pattern`: con una mayúscula o un
 * espacio el formulario no se enviaba y solo salía la burbuja genérica del navegador ("Utiliza el
 * formato solicitado"), que en el iPhone dura un segundo. Ahora se corrige al escribir y, si aún
 * sobra algo, se explica debajo en rojo. setCustomValidity mantiene el bloqueo al enviar.
 */
export function UsernameField({ defaultValue = '', hint = '3-30 caracteres: minúsculas, números o _' }: UsernameFieldProps) {
  const id = useId()
  const ref = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(() => normalizeUsername(defaultValue))
  // El error solo se enseña cuando ya ha escrito algo o ha intentado enviar: no al abrir la página.
  const [touched, setTouched] = useState(false)
  const problem = usernameProblem(value)

  useEffect(() => {
    ref.current?.setCustomValidity(problem ?? '')
  }, [problem])

  const showProblem = touched && value !== '' && problem

  return (
    <div>
      <label htmlFor={id} className="text-sm font-extrabold">
        Nombre de usuario
      </label>
      <input
        ref={ref}
        id={id}
        name="username"
        value={value}
        onChange={(e) => {
          setValue(normalizeUsername(e.target.value))
          setTouched(true)
        }}
        onInvalid={() => setTouched(true)}
        required
        maxLength={USERNAME_MAX + 10}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        aria-invalid={showProblem ? true : undefined}
        aria-describedby={`${id}-hint`}
        className={cx(controlClass, showProblem && 'border-lost-text focus:border-lost-text')}
      />
      <span
        id={`${id}-hint`}
        aria-live="polite"
        className={cx('mt-1.5 block text-[13px] font-semibold', showProblem ? 'text-lost-text' : 'text-muted')}
      >
        {showProblem || hint}
      </span>
    </div>
  )
}
