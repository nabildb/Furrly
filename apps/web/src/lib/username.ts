// Reglas del nombre de usuario (las mismas que valida la API: /^[a-z0-9_]{3,30}$/).

export const USERNAME_MIN = 3
export const USERNAME_MAX = 30

/**
 * Corrige al escribir lo que casi todo el mundo pone sin querer: mayúsculas, tildes y espacios.
 * "José Pérez" → "jose_perez". La ñ pasa a n (en NFD es una n más una tilde).
 */
export function normalizeUsername(raw: string) {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
}

/** Qué le pasa a un username, en español, o null si es válido. */
export function usernameProblem(username: string): string | null {
  const invalid = [...new Set(username.replace(/[a-z0-9_]/g, ''))]
  if (invalid.length > 0) {
    const list = invalid.map((c) => `«${c}»`).join(' ')
    return `No puede llevar ${list}. Usa letras sin tilde, números o _.`
  }
  if (username.length < USERNAME_MIN) return `Tiene que tener al menos ${USERNAME_MIN} caracteres.`
  if (username.length > USERNAME_MAX) return `Como mucho ${USERNAME_MAX} caracteres.`
  return null
}
