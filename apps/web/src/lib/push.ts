import { api } from './api'

/**
 * Avisos push en este navegador. Estados posibles:
 * - unsupported: el navegador no tiene service workers o Push API.
 * - ios-install: iPhone/iPad sin instalar: Safari solo permite push a webs añadidas a la pantalla de inicio.
 * - denied: el usuario bloqueó las notificaciones (solo se puede cambiar desde los ajustes del navegador).
 * - unavailable: el servidor no tiene configuradas las claves VAPID.
 * - off / on.
 */
export type PushStatus = 'unsupported' | 'ios-install' | 'denied' | 'unavailable' | 'off' | 'on'

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return isIos() && !isStandalone() ? 'ios-install' : 'unsupported'
  }
  if (Notification.permission === 'denied') return 'denied'
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  return subscription && Notification.permission === 'granted' ? 'on' : 'off'
}

/** La clave VAPID viene en base64url; PushManager.subscribe la quiere en bytes. */
function base64UrlToBytes(base64url: string) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

/** Pide permiso, se suscribe al servicio de push del navegador y guarda la suscripción en la API. */
export async function enablePush(): Promise<PushStatus> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'

  let publicKey: string
  try {
    ;({ publicKey } = await api<{ publicKey: string }>('/push/key'))
  } catch {
    return 'unavailable'
  }

  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) }))
  await api('/push/subscriptions', { method: 'POST', body: JSON.stringify(subscription.toJSON()) })
  return 'on'
}

/** Se da de baja en la API y en el navegador. Se llama también al cerrar sesión. */
export async function disablePush() {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  await api('/push/subscriptions', { method: 'DELETE', body: JSON.stringify({ endpoint: subscription.endpoint }) }).catch(() => {})
  await subscription.unsubscribe()
}
