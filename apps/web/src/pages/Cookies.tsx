import { ContactEmail, LegalPage, Section, TextLink } from '../components/Legal'

const SESSION_KEY = `sb-${new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0]}-auth-token`

const stored = [
  {
    name: SESSION_KEY,
    what: 'Tu sesión: para que no tengas que volver a entrar en cada página.',
    where: 'Almacenamiento local del navegador (Supabase Auth)',
    until: 'Hasta que cierras sesión',
  },
  {
    name: 'Service worker (sw.js)',
    what: 'Permite instalar Furrly como app y recibir avisos con ella cerrada. No guarda datos tuyos ni páginas.',
    where: 'Navegador',
    until: 'Hasta que borras los datos del sitio',
  },
  {
    name: 'Suscripción a los avisos push',
    what: 'La dirección a la que tu navegador recibe los avisos de mascotas en tu zona. Solo si los activas y das permiso.',
    where: 'Navegador y servidor de Furrly',
    until: 'Hasta que desactivas los avisos',
  },
]

/**
 * Política de cookies (art. 22.2 LSSI). Furrly no usa cookies y lo que guarda en el navegador es
 * estrictamente necesario para lo que pide el usuario: por eso no hay banner de consentimiento.
 */
export function Cookies() {
  return (
    <LegalPage
      title="Cookies"
      intro="Qué guarda Furrly en tu navegador y por qué no te pedimos aceptar cookies."
    >
      <Section title="Furrly no usa cookies">
        <p>
          Las cookies son pequeños archivos que una web guarda en tu navegador. Furrly <strong>no pone ninguna</strong>: ni de
          publicidad, ni de análisis, ni de redes sociales. Las visitas se cuentan con Vercel Web Analytics, que funciona sin
          cookies ni guarda nada en tu dispositivo, y los errores se envían a Sentry también sin cookies.
        </p>
      </Section>

      <Section title="Lo que sí se guarda en tu navegador">
        <p>
          Solo lo imprescindible para que funcione lo que tú pides. La ley (art. 22.2 de la LSSI) no exige pedir permiso para
          esto, y por eso no verás ningún aviso de cookies.
        </p>
        <div className="space-y-3">
          {stored.map(({ name, what, where, until }) => (
            <dl key={name} className="space-y-1 rounded-2xl border border-card-line bg-surface p-4 text-sm">
              <dt className="font-extrabold break-all text-ink">{name}</dt>
              <dd>{what}</dd>
              <dd className="font-semibold text-muted">
                {where} · {until}
              </dd>
            </dl>
          ))}
        </div>
        <p>
          Además, tu navegador guarda en su caché las fuentes, el código de la web y las imágenes del mapa para cargarlas más
          rápido. Eso lo hace cualquier web y no sirve para identificarte.
        </p>
      </Section>

      <Section title="Servicios de otras empresas">
        <ul className="space-y-1">
          <li>
            <strong>Entrar con Google:</strong> al pulsar el botón vas a la web de Google, que usa sus propias cookies según su{' '}
            <TextLink to="https://policies.google.com/technologies/cookies">política de cookies</TextLink>. Furrly no las ve.
          </li>
          <li>
            <strong>Mapa:</strong> las imágenes vienen de OpenStreetMap, que no pone cookies (ver su{' '}
            <TextLink to="https://osmfoundation.org/wiki/Privacy_Policy">política de privacidad</TextLink>).
          </li>
        </ul>
      </Section>

      <Section title="Cómo borrarlo">
        <p>
          Al cerrar sesión se borra tu sesión, y los avisos se desactivan desde el perfil. También puedes borrar todo lo que
          Furrly ha guardado desde los ajustes de tu navegador («Borrar datos del sitio»).
        </p>
      </Section>

      <Section title="Si esto cambia">
        <p>
          Si algún día Furrly usara cookies que no sean imprescindibles, te pediríamos permiso antes y lo explicaríamos aquí.
          Dudas: <ContactEmail />. Más sobre tus datos en <TextLink to="/privacidad">Privacidad</TextLink>.
        </p>
      </Section>
    </LegalPage>
  )
}
