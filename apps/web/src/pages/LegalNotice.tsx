import { ContactEmail, LegalPage, Section, TextLink } from '../components/Legal'
import { LEGAL } from '../lib/legal'

/** Aviso legal: quién está detrás de la web (art. 10 LSSI) y responsabilidades. */
export function LegalNotice() {
  return (
    <LegalPage title="Aviso legal" intro="Quién está detrás de Furrly y qué condiciones generales tiene la web.">
      <Section title="Titular">
        <ul className="space-y-1">
          <li>
            <strong>Responsable:</strong> {LEGAL.owner}
          </li>
          <li>
            <strong>Contacto:</strong> <ContactEmail />
          </li>
          <li>
            <strong>Web:</strong> furrly-rouge.vercel.app
          </li>
        </ul>
        <p>
          Furrly es un <strong>proyecto educativo</strong> de portfolio (2.º de Desarrollo de Aplicaciones Web), gratuito, sin
          publicidad y sin ánimo de lucro.
        </p>
      </Section>

      <Section title="Para qué sirve">
        <p>
          Ayudar a encontrar mascotas perdidas: avisos de mascotas perdidas y encontradas, avistamientos, alertas por zona y una
          comunidad para compartir fotos. Usarla implica aceptar las <TextLink to="/condiciones">condiciones de uso</TextLink>.
        </p>
      </Section>

      <Section title="Responsabilidad">
        <ul className="space-y-1">
          <li>
            Cada persona es responsable de lo que publica. Furrly no comprueba de antemano los avisos ni los mensajes, pero
            retira lo que incumple las normas en cuanto lo conoce (puedes denunciarlo desde la propia app).
          </li>
          <li>
            Furrly ayuda a difundir avisos, pero <strong>no garantiza</strong> que una mascota aparezca. Si pierdes o
            encuentras un animal, avisa también a la policía local, a tu ayuntamiento y a tu veterinario para que lean el
            microchip.
          </li>
          <li>
            Se intenta que la web funcione siempre, pero puede tener fallos o interrupciones. Los enlaces a otras webs se
            ofrecen por comodidad y Furrly no responde de su contenido.
          </li>
        </ul>
      </Section>

      <Section title="Propiedad intelectual">
        <p>
          El diseño, el logotipo y el código de Furrly son de su autor. El código se puede consultar en{' '}
          <TextLink to="https://github.com/nabildb/Furrly">GitHub</TextLink>. Las fotos de la demo son de dominio público o CC0
          (Wikimedia Commons) y el mapa es © colaboradores de{' '}
          <TextLink to="https://www.openstreetmap.org/copyright">OpenStreetMap</TextLink>. Las fotos y textos que suben los
          usuarios son suyos.
        </p>
      </Section>

      <Section title="Ley aplicable">
        <p>
          Se rige por la ley española. Datos personales: <TextLink to="/privacidad">Privacidad</TextLink>. Lo que se guarda en
          el navegador: <TextLink to="/cookies">Cookies</TextLink>.
        </p>
      </Section>
    </LegalPage>
  )
}
