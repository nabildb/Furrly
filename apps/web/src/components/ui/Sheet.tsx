import { useEffect, useId, type ReactNode } from 'react'
import { CloseIcon } from './icons'
import { iconButtonClass } from './styles'

interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/** Hoja modal: sube desde abajo en móvil y es un diálogo centrado en escritorio. Se cierra con Esc. */
export function Sheet({ title, onClose, children }: SheetProps) {
  const titleId = useId()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    // Sin esto, en móvil se desplaza la página de detrás al hacer scroll dentro de la hoja.
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-bg px-5 pt-5 pb-[max(24px,env(safe-area-inset-bottom))] sm:rounded-[28px]"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="font-display text-xl font-extrabold tracking-[-0.5px]">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className={iconButtonClass()}>
            <CloseIcon size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
