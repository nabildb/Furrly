import { useEffect, useRef } from 'react'
import { supabase } from './supabase'

export type RingEvent = 'message' | 'notification'
type Listener = (event: RingEvent, payload: Record<string, string>) => void

const listeners = new Set<Listener>()

/**
 * Escucha el canal privado del usuario en Supabase Realtime (user:<id>). La API "toca el timbre"
 * cuando llega un mensaje o una notificación; por el canal no viaja contenido, así que quien lo oye
 * vuelve a pedir los datos a la API. Devuelve la función para desconectarse.
 */
export function connectRealtime(userId: string, accessToken: string) {
  // Canal privado: Supabase comprueba con el token que el canal es suyo (política RLS en realtime.messages).
  void supabase.realtime.setAuth(accessToken)
  const channel = supabase
    .channel(`user:${userId}`, { config: { private: true } })
    .on('broadcast', { event: '*' }, ({ event, payload }) => {
      for (const listener of listeners) listener(event as RingEvent, (payload ?? {}) as Record<string, string>)
    })
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

/** Ejecuta `handler` cada vez que suena el timbre (mensaje o notificación nueva). */
export function useRing(handler: Listener) {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => {
    const listener: Listener = (event, payload) => ref.current(event, payload)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])
}
