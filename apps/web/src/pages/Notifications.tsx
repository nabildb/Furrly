import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../components/Avatar'
import { ErrorText } from '../components/Field'
import { Loading, Page } from '../components/Page'
import { PushToggle } from '../components/PushToggle'
import { Button } from '../components/ui/Button'
import { Card, SectionTitle } from '../components/ui/Card'
import { BellIcon, CheckIcon, CommentIcon, EyeIcon, HeartIcon, PawIcon, PinIcon, PlusIcon } from '../components/ui/icons'
import { useInbox } from '../inbox/useInbox'
import { api } from '../lib/api'
import { cx } from '../lib/cx'
import type { AppNotification } from '../lib/inbox'
import { formatTimeAgo } from '../lib/reports'
import { thumbUrl } from '../lib/thumbUrl'

interface NotificationsPage {
  notifications: AppNotification[]
  nextCursor: string | null
}

/** Texto, icono y enlace de cada tipo de notificación. */
function describe(n: AppNotification): { text: ReactNode; icon: ReactNode; to: string | null; tone: string } {
  const who = <strong className="font-extrabold">@{n.actor?.username ?? 'alguien'}</strong>
  const quote = (s: string) => <strong className="font-extrabold">«{s}»</strong>
  switch (n.type) {
    case 'new_report_nearby':
      return {
        text: <>Nuevo aviso cerca de tu zona: {n.report ? quote(n.report.title) : 'un aviso que ya no existe'}</>,
        icon: <PinIcon size={18} />,
        to: n.report && `/avisos/${n.report.id}`,
        tone: n.report?.type === 'found' ? 'bg-found text-white' : 'bg-lost text-white',
      }
    case 'new_sighting':
      return {
        text: <>{who} ha visto a tu mascota{n.report && <>: {quote(n.report.title)}</>}</>,
        icon: <EyeIcon size={18} />,
        to: n.report && `/avisos/${n.report.id}`,
        tone: 'bg-sighting text-ink',
      }
    case 'report_resolved':
      return {
        text: <>¡Buenas noticias! {n.report ? quote(n.report.title) : 'Un aviso'} se ha resuelto. Gracias por ayudar.</>,
        icon: <CheckIcon size={18} />,
        to: n.report && `/avisos/${n.report.id}`,
        tone: 'bg-resolved-text text-white',
      }
    case 'new_follower':
      return {
        text: <>{who} ha empezado a seguir a {n.pet ? <strong className="font-extrabold">{n.pet.name}</strong> : 'tu mascota'}</>,
        icon: <PlusIcon size={18} />,
        to: n.pet && `/mascotas/${n.pet.id}`,
        tone: 'bg-ink text-white',
      }
    case 'new_comment':
      return {
        text: <>{who} ha comentado la foto de {n.post?.pet.name ?? 'tu mascota'}</>,
        icon: <CommentIcon size={18} />,
        to: n.post && `/publicaciones/${n.post.id}`,
        tone: 'bg-ink text-white',
      }
    case 'possible_match':
      // n.report es el OTRO aviso: el que podría ser el mismo animal que el tuyo.
      return {
        text:
          n.report?.type === 'found' ? (
            <>Puede que sea tu mascota: han encontrado un animal cerca, {quote(n.report.title)}</>
          ) : (
            <>¿Es el animal que encontraste? {n.report ? quote(n.report.title) : 'Una mascota'} se perdió cerca</>
          ),
        icon: <PawIcon size={18} />,
        to: n.report && `/avisos/${n.report.id}`,
        tone: 'bg-sighting text-ink',
      }
    case 'new_like':
      return {
        text: <>A {who} le gusta la foto de {n.post?.pet.name ?? 'tu mascota'}</>,
        icon: <HeartIcon size={18} filled />,
        to: n.post && `/publicaciones/${n.post.id}`,
        tone: 'bg-lost-soft text-lost',
      }
  }
}

function NotificationItem({ n }: { n: AppNotification }) {
  const { text, icon, to, tone } = describe(n)
  const content = (
    <>
      <span className="relative flex-none">
        {n.actor ? (
          <Avatar url={n.actor.avatarUrl} name={n.actor.displayName} className="h-11 w-11 text-base" />
        ) : (
          <span className="block h-11 w-11 rounded-full bg-subtle" />
        )}
        <span className={cx('absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-surface', tone)}>
          {icon}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-snug text-body">{text}</span>
        <span className="block text-xs font-semibold text-muted first-letter:uppercase">{formatTimeAgo(n.createdAt)}</span>
      </span>
      {n.post && <img src={thumbUrl(n.post.imageUrl)} alt="" className="h-12 w-12 flex-none rounded-xl object-cover" />}
      {!n.readAt && <span aria-label="Sin leer" className="h-2.5 w-2.5 flex-none rounded-full bg-lost" />}
    </>
  )
  const className = cx('flex items-center gap-3 rounded-2xl p-3 transition', !n.readAt && 'bg-lost-soft/50', to && 'hover:bg-subtle')
  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}

export function Notifications() {
  const inbox = useInbox()
  const [items, setItems] = useState<AppNotification[] | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const { refresh } = inbox

  useEffect(() => {
    api<NotificationsPage>('/notifications')
      .then(async (page) => {
        setItems(page.notifications)
        setCursor(page.nextCursor)
        // Se ven como "nuevas" en esta visita (vienen con readAt null), pero ya cuentan como leídas.
        if (page.notifications.some((n) => !n.readAt)) {
          await api('/notifications/read', { method: 'POST' })
          refresh()
        }
      })
      .catch((e: Error) => setError(e.message))
  }, [refresh])

  async function loadMore() {
    if (!cursor) return
    setLoadingMore(true)
    try {
      const page = await api<NotificationsPage>(`/notifications?cursor=${cursor}`)
      setItems((prev) => [...(prev ?? []), ...page.notifications])
      setCursor(page.nextCursor)
    } finally {
      setLoadingMore(false)
    }
  }

  if (!items && !error) return <Loading />

  return (
    <Page title="Notificaciones" back="/perfil" width="feed">
      {/* Invitación a activar el push, solo si aún no está activado en este dispositivo. */}
      <div className="mb-4">
        <PushToggle compact />
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      {items?.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-lost-soft text-lost">
            <BellIcon size={30} />
          </span>
          <SectionTitle>Todo tranquilo por aquí</SectionTitle>
          <p className="max-w-xs text-[15px] font-semibold text-muted">
            Te avisaremos de mascotas perdidas en tu zona, avistamientos y de lo que pase con tus publicaciones.
          </p>
          <Link to="/perfil" className="text-sm font-extrabold text-lost-text">
            Configurar mi zona de alertas
          </Link>
        </Card>
      ) : (
        <div className="space-y-1">
          {items?.map((n) => (
            <NotificationItem key={n.id} n={n} />
          ))}
          {cursor && (
            <Button variant="secondary" size="md" onClick={loadMore} disabled={loadingMore} className="mt-3 w-full">
              {loadingMore ? 'Cargando…' : 'Ver anteriores'}
            </Button>
          )}
        </div>
      )}
    </Page>
  )
}
