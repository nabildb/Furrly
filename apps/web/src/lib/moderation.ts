import { api } from './api'

export type FlagTargetType = 'report' | 'post' | 'comment' | 'user' | 'conversation'
export type ModerationAction = 'dismiss' | 'remove' | 'suspend'
export type RemovableType = 'report' | 'post' | 'comment' | 'sighting' | 'pet'
export type Reason = 'spam' | 'inappropriate' | 'fake' | 'other'

/** Lo que se decide al actuar: el motivo se le explica al afectado; la nota es interna. */
export interface Decision {
  reason: Reason
  note: string | null
}

/** Lee lo elegido en DecisionFields. */
export const readDecision = (form: FormData): Decision => ({
  reason: form.get('reason') as Reason,
  note: (form.get('note') as string) || null,
})

const deleteWith = (decision: Decision) => ({ method: 'DELETE', body: JSON.stringify(decision) })

/** Moderación directa: borra cualquier contenido, aunque nadie lo haya denunciado. */
export const removeContent = (type: RemovableType, id: string, decision: Decision) => api(`/admin/content/${type}/${id}`, deleteWith(decision))

/** Borra una cuenta y todo lo suyo. */
export const removeProfile = (username: string, decision: Decision) => api(`/admin/users/${username}`, deleteWith(decision))

export type LogAction = 'remove' | 'dismiss' | 'warn' | 'suspend' | 'unsuspend' | 'delete_account' | 'clean_profile' | 'purge_content'

export interface LogEntry {
  id: string
  action: LogAction
  targetLabel: string
  reason: Reason | null
  note: string | null
  createdAt: string
  moderator: { username: string } | null
}

export interface LogPage {
  entries: LogEntry[]
  nextCursor: string | null
}

export const actionLabels: Record<LogAction, string> = {
  remove: 'ha borrado',
  dismiss: 'ha descartado la denuncia de',
  warn: 'ha advertido a',
  suspend: 'ha suspendido a',
  unsuspend: 'ha readmitido a',
  delete_account: 'ha borrado la cuenta de',
  clean_profile: 'ha limpiado el perfil de',
  purge_content: 'ha vaciado el contenido de',
}

export interface FlaggedItem {
  targetType: FlagTargetType
  targetId: string
  count: number
  lastFlaggedAt: string
  resolvedAt: string | null
  flags: { reason: Reason; details: string | null; by: string; createdAt: string }[]
  /** null = el contenido ya no existe (borrado por su autor o por moderación). */
  target: {
    title: string
    text: string | null
    url?: string
    imageUrl?: string
    messages?: { from: string; body: string; createdAt: string }[]
    author: { username: string; displayName: string; suspendedAt: string | null }
  } | null
}

export interface SuspendedUser {
  username: string
  displayName: string
  suspendedAt: string
  /** null = indefinida. */
  suspendedUntil: string | null
}

/** Cuánto puede durar una suspensión, en días. La clave vacía es indefinida. */
export const suspensionOptions = { '1': '24 horas', '7': '7 días', '30': '30 días', '': 'Indefinida' }

export const targetLabels: Record<FlagTargetType, string> = {
  report: 'Aviso',
  post: 'Publicación',
  comment: 'Comentario',
  user: 'Perfil',
  conversation: 'Conversación',
}

export const reasonLabels: Record<Reason, string> = {
  spam: 'Spam o publicidad',
  inappropriate: 'Inapropiado u ofensivo',
  fake: 'Falso o engañoso',
  other: 'Otro motivo',
}

/** Los perfiles y las conversaciones no se borran: como mucho se suspende al autor. */
export const canRemove = (type: FlagTargetType) => type === 'report' || type === 'post' || type === 'comment'
