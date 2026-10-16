import { createContext } from 'react'
import type { InboxCounts } from '../lib/inbox'

export interface InboxState extends InboxCounts {
  /** Vuelve a pedir los contadores (p. ej. tras leer una conversación). */
  refresh: () => void
}

export const InboxContext = createContext<InboxState>({ notifications: 0, messages: 0, refresh: () => {} })
