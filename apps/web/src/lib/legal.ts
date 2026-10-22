/** Datos de las páginas legales: si cambia el titular o el email, se cambia solo aquí. */
export const LEGAL = {
  owner: 'Nabil Daiday Boukhrisse',
  email: 'furrly.contacto@gmail.com',
  /** Edad mínima para tener cuenta: en España se puede consentir solo desde los 14 (art. 7 LOPDGDD). */
  minAge: 14,
  updated: '22 de octubre de 2026',
}

export const legalPages = [
  { to: '/aviso-legal', label: 'Aviso legal' },
  { to: '/privacidad', label: 'Privacidad' },
  { to: '/cookies', label: 'Cookies' },
  { to: '/condiciones', label: 'Condiciones de uso' },
]

/** Se leen sin tener la cuenta lista: la guarda de cuenta no redirige desde ellas (ver accountGate). */
export const legalPaths = legalPages.map((page) => page.to)
