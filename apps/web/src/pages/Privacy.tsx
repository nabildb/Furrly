import { ContactEmail, LegalPage, Section, TextLink } from '../components/Legal'
import { LEGAL } from '../lib/legal'

/** Política de privacidad (la pide Google para "Continuar con Google" y el RGPD para cualquier app con cuentas). */
export function Privacy() {
  return (
    <LegalPage
      title="Privacidad"
      intro="Furrly es un proyecto educativo de portfolio (2.º de DAW) para ayudar a encontrar mascotas perdidas. Aquí se explica qué datos guarda, para qué, con quién se comparten y cómo borrarlos."
    >
      <Section title="Responsable">
        <p>
          {LEGAL.owner}, autor de Furrly. Para cualquier cosa sobre tus datos escribe a <ContactEmail />.
        </p>
      </Section>

      <Section title="Qué datos guardamos">
        <ul className="space-y-1">
          <li>
            <strong>Cuenta:</strong> email, nombre de usuario, nombre visible y, si la subes, foto de perfil. Si entras con
            Google o Apple, recibimos de ellos solo tu nombre y tu email; nunca tu contraseña.
          </li>
          <li>
            <strong>Lo que publicas:</strong> mascotas, avisos (con su ubicación aproximada), avistamientos, publicaciones,
            comentarios, likes, seguidores, fotos y, si los añades a un aviso, un teléfono o email de contacto. Las fotos se
            redibujan en tu navegador antes de subirlas, así que no guardan la ubicación GPS ni otros datos de la cámara.
          </li>
          <li>
            <strong>Mensajes</strong> privados con otros usuarios.
          </li>
          <li>
            <strong>Zona de alertas</strong> (un punto y un radio) si la configuras, y los datos técnicos de los avisos push
            del dispositivo si los activas.
          </li>
          <li>
            <strong>Seguridad:</strong> denuncias que hagas o recibas, usuarios que bloqueas y, si se incumplen las normas, la
            suspensión de la cuenta.
          </li>
        </ul>
      </Section>

      <Section title="Para qué y con qué base legal">
        <ul className="space-y-1">
          <li>
            <strong>Darte el servicio</strong> que pides al crear la cuenta: mostrar tus avisos y publicaciones, avisar a los
            vecinos de la zona, enviar mensajes y notificaciones. Base: la relación que aceptas con las{' '}
            <TextLink to="/condiciones">condiciones de uso</TextLink> (art. 6.1.b del RGPD).
          </li>
          <li>
            <strong>Avisos push y ubicación del dispositivo:</strong> solo si das permiso en el navegador (consentimiento,
            art. 6.1.a). La ubicación sirve para buscar avisos cerca de ti y no se guarda, salvo que la uses en un aviso o en
            tu zona de alertas. Puedes quitar los permisos cuando quieras desde el perfil o el navegador.
          </li>
          <li>
            <strong>Proteger a la comunidad y la web</strong>: bloqueos, denuncias, límites contra el spam, registro de errores
            y estadísticas de visitas sin identificar a nadie. Base: interés legítimo en que Furrly sea segura y funcione
            (art. 6.1.f).
          </li>
        </ul>
        <p>
          No hay publicidad, no se venden datos, no se usan para otros fines y no se toman decisiones automáticas sobre ti: las
          posibles coincidencias entre avisos son solo una sugerencia que revisan las personas.
        </p>
      </Section>

      <Section title="Quién puede verlos">
        <ul className="space-y-1">
          <li>Tus avisos, mascotas y publicaciones son públicos, como en cualquier red social.</li>
          <li>El teléfono o email de contacto de un aviso solo lo ven usuarios con sesión iniciada.</li>
          <li>El microchip de tu mascota, tu zona de alertas y tu email solo los ves tú.</li>
          <li>
            Los mensajes solo los ven las dos personas de la conversación. Si una de ellas la denuncia, la moderación puede
            leerla para revisar la denuncia.
          </li>
        </ul>
      </Section>

      <Section title="Con quién se comparten">
        <p>Con nadie para su propio uso. Solo con los servicios que hacen funcionar Furrly, que tratan los datos por encargo:</p>
        <ul className="space-y-1">
          <li>
            <strong>Supabase</strong> (base de datos, cuentas y fotos) y <strong>Vercel</strong> (web y API), con servidores en
            la Unión Europea (Fráncfort). Vercel Web Analytics cuenta las visitas <strong>sin cookies</strong> y sin
            identificar a nadie: solo páginas vistas, país y tipo de dispositivo.
          </li>
          <li>
            <strong>Sentry</strong> (servidores en la UE) recibe los errores de la web sin datos personales, solo para poder
            arreglarlos.
          </li>
          <li>
            <strong>OpenStreetMap</strong> sirve las imágenes del mapa: tu navegador se las pide directamente, así que reciben
            tu dirección IP como cualquier web que visitas.
          </li>
          <li>
            <strong>Google</strong>, solo si eliges entrar con tu cuenta de Google.
          </li>
          <li>Los servicios de avisos push de tu navegador (Google, Apple, Mozilla o Microsoft), si activas los avisos.</li>
        </ul>
        <p>
          Supabase, Vercel y Sentry son empresas de Estados Unidos. Aunque los datos se guardan en la UE, sus contratos de
          tratamiento incluyen las cláusulas contractuales tipo de la Comisión Europea por si se accediera a ellos desde fuera.
        </p>
      </Section>

      <Section title="Cuánto tiempo y cómo borrarlos">
        <p>
          Mientras tengas la cuenta. Desde <strong>Perfil → Borrar mi cuenta</strong> se eliminan al momento tu cuenta y todo lo
          que has publicado, incluidas las fotos y los mensajes. También puedes editar o borrar cualquier contenido por
          separado. Las fotos que se suben y no se llegan a usar se borran solas al día siguiente.
        </p>
      </Section>

      <Section title="Menores">
        <p>
          Para crear una cuenta hay que tener {LEGAL.minAge} años o más. Si eres madre, padre o tutor y crees que un menor de
          esa edad tiene cuenta, escríbenos y la borraremos.
        </p>
      </Section>

      <Section title="Tus derechos">
        <p>
          Puedes acceder a tus datos, corregirlos o borrarlos desde la propia app. Para pedir una copia, oponerte a algún uso,
          limitarlo o cualquier otra consulta, escribe a <ContactEmail /> y te responderemos en un mes como mucho. Si crees
          que no se han respetado tus derechos, puedes reclamar ante la{' '}
          <TextLink to="https://www.aepd.es">Agencia Española de Protección de Datos</TextLink>.
        </p>
      </Section>

      <Section title="Cambios">
        <p>
          Si esta política cambia en algo importante, lo avisaremos en la app antes de que se aplique. Lo que se guarda en tu
          navegador se explica en <TextLink to="/cookies">Cookies</TextLink>.
        </p>
      </Section>
    </LegalPage>
  )
}
