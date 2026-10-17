import type { ReportType } from './reports'

export interface InboxCounts {
  notifications: number
  messages: number
}

export type NotificationType =
  | 'new_report_nearby'
  | 'new_sighting'
  | 'report_resolved'
  | 'new_follower'
  | 'new_comment'
  | 'new_like'

export interface AppNotification {
  id: string
  type: NotificationType
  readAt: string | null
  createdAt: string
  actor: { username: string; displayName: string; avatarUrl: string | null } | null
  report: { id: string; type: ReportType; title: string } | null
  post: { id: string; imageUrl: string; pet: { name: string } } | null
  pet: { id: string; name: string } | null
}

export interface ConversationSummary {
  id: string
  other: { username: string; displayName: string; avatarUrl: string | null }
  lastMessage: { body: string; fromMe: boolean; createdAt: string } | null
  unread: number
}

export interface ChatMessage {
  id: string
  body: string
  fromMe: boolean
  createdAt: string
  report: { id: string; type: ReportType; title: string } | null
}

export interface ConversationDetail {
  id: string
  /** false si hay un bloqueo entre los dos (en cualquier sentido). */
  canReply: boolean
  /** Si lo has bloqueado tú (nunca se dice si te han bloqueado a ti). */
  blockedByMe: boolean
  other: ConversationSummary['other']
  messages: ChatMessage[]
  olderCursor: string | null
}
