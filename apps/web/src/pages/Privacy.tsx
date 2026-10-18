import type { ReactNode } from 'react'
import { Page } from '../components/Page'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-extrabold">{title}</h2>
      <div className="space-y-2 text-[15px] leading-relaxed text-body [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </section>
  )
}

/** Política de privacidad (la pide Google para "Continuar con Google" y el RGPD para cualquier app con cuentas). */
export function Privacy() {
  return (
    <Page title="Privacidad" back="/avisos">
      <div className="space-y-7">
        <p className="text-[15px] leading-relaxed text-body">
          Furrly es un proyecto educativo de portfolio (2.º de DAW) para ayudar a encontrar mascotas perdidas. Aquí se explica
          qué datos guarda, para qué y cómo borrarlos. Última actualización: 18 de octubre de 2026.
        </p>

        <Section title="Qué datos guardamos">
          <ul className="space-y-1">
            <li>
              <strong>Cuenta:</strong> email, nombre de usuario y nombre visible. Si entras con Google o Apple, recibimos de ellos
              solo tu nombre y tu email; nunca tu contraseña.
            </li>
            <li>
              <strong>Lo que publicas:</strong> mascotas, avisos (con su ubicación aproximada), avistamientos, publicaciones,
              comentarios, likes, fotos y, si los añades a un aviso, un teléfono o email de contacto.
            </li>
            <li>
              <strong>Mensajes</strong> privados con otros usuarios.
            </li>
            <li>
              <strong>Zona de alertas</strong> (un punto y un radio) si la configuras, y los datos técnicos de los avisos push
              del dispositivo si los activas.
            </li>
          </ul>
        </Section>

        <Section title="Para qué los usamos">
          <p>
            Solo para que la app funcione: mostrar avisos en el mapa, avisar a los vecinos de la zona, enviar mensajes y
            notificaciones, y prevenir abusos (bloqueos, denuncias, límites contra el spam y, si se incumplen las normas, suspender la cuenta). No hay publicidad, no se venden
            datos y no se usan para otros fines.
          </p>
        </Section>

        <Section title="Quién puede verlos">
          <ul className="space-y-1">
            <li>Tus avisos, mascotas y publicaciones son públicos, como en cualquier red social.</li>
            <li>El teléfono o email de contacto de un aviso solo lo ven usuarios con sesión iniciada.</li>
            <li>El microchip de tu mascota, tu zona de alertas y tu email solo los ves tú.</li>
            <li>
              Los mensajes solo los ven las dos personas de la conversación. Si una de ellas la denuncia, la moderación
              puede leerla para revisar la denuncia.
            </li>
          </ul>
        </Section>

        <Section title="Dónde se guardan">
          <p>
            En <strong>Supabase</strong> (base de datos, cuentas y fotos) y <strong>Vercel</strong> (web y API), ambos en
            servidores de la Unión Europea (Fráncfort). El mapa usa OpenStreetMap. Para saber cuántas visitas tiene Furrly se usa
            Vercel Web Analytics, que <strong>no usa cookies</strong> ni identifica a nadie: solo cuenta páginas vistas, país y
            tipo de dispositivo.
          </p>
        </Section>

        <Section title="Cuánto tiempo y cómo borrarlos">
          <p>
            Mientras tengas la cuenta. Desde <strong>Perfil → Borrar mi cuenta</strong> se eliminan al momento tu cuenta y todo lo
            que has publicado, incluidas las fotos y los mensajes. También puedes editar o borrar cualquier contenido por separado.
          </p>
        </Section>

        <Section title="Tus derechos y contacto">
          <p>
            Puedes acceder, corregir o borrar tus datos desde la propia app. Para cualquier otra consulta, escribe a través del{' '}
            <a
              href="https://github.com/nabildb/Furrly"
              className="font-extrabold text-lost-text underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              repositorio del proyecto en GitHub
            </a>
            .
          </p>
        </Section>
      </div>
    </Page>
  )
}
