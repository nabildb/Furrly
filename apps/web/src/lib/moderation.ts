import { api } from './api'

export type FlagTargetType = 'report' | 'post' | 'comment' | 'user' | 'conversation'
export type ModerationAction = 'dismiss' | 'remove' | 'suspend'
export type RemovableType = 'report' | 'post' | 'comment' | 'sighting'

/** Moderación directa: borra cualquier contenido, aunque nadie lo haya denunciado. */
export const removeContent = (type: RemovableType, id: string) => api(`/admin/content/${type}/${id}`, { method: 'DELETE' })

export interface FlaggedItem {
  targetType: FlagTargetType
  targetId: string
  count: number
  lastFlaggedAt: string
  resolvedAt: string | null
  flags: { reason: 'spam' | 'inappropriate' | 'fake' | 'other'; details: string | null; by: string; createdAt: string }[]
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
}

export const targetLabels: Record<FlagTargetType, string> = {
  report: 'Aviso',
  post: 'Publicación',
  comment: 'Comentario',
  user: 'Perfil',
  conversation: 'Conversación',
}

export const reasonLabels: Record<FlaggedItem['flags'][number]['reason'], string> = {
  spam: 'Spam o publicidad',
  inappropriate: 'Inapropiado u ofensivo',
  fake: 'Falso o engañoso',
  other: 'Otro motivo',
}

/** Los perfiles y las conversaciones no se borran: como mucho se suspende al autor. */
export const canRemove = (type: FlagTargetType) => type === 'report' || type === 'post' || type === 'comment'
