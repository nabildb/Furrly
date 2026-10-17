import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../lib/api'
import { Avatar } from './Avatar'
import { BlockButton } from './BlockButton'
import { Card, SectionTitle } from './ui/Card'

interface BlockedUser {
  username: string
  displayName: string
  avatarUrl: string | null
}

/** Usuarios bloqueados, con la opción de desbloquearlos. No se pinta si no hay ninguno. */
export function BlockedUsers() {
  const [users, setUsers] = useState<BlockedUser[]>([])

  useEffect(() => {
    api<BlockedUser[]>('/me/blocks').then(setUsers, () => {})
  }, [])

  if (users.length === 0) return null

  return (
    <Card className="space-y-3">
      <SectionTitle>Usuarios bloqueados</SectionTitle>
      <ul className="divide-y divide-card-line">
        {users.map((u) => (
          <li key={u.username} className="flex items-center gap-3 py-2.5">
            <Avatar url={u.avatarUrl} name={u.displayName} className="h-9 w-9 text-sm" />
            <Link to={`/u/${u.username}`} className="min-w-0 flex-1 truncate text-[15px] font-extrabold">
              @{u.username}
            </Link>
            <BlockButton
              username={u.username}
              blockedByMe
              onChange={(blocked) => !blocked && setUsers((prev) => prev.filter((x) => x.username !== u.username))}
            />
          </li>
        ))}
      </ul>
    </Card>
  )
}
