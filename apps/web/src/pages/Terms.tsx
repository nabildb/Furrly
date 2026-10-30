import { ContactEmail, LegalPage, Section, TextLink } from '../components/Legal'
import { LEGAL } from '../lib/legal'

/** Condiciones de uso y normas de la comunidad: lo que se acepta al crear la cuenta y lo que aplica la moderación. */
export function Terms() {
  return (
    <LegalPage
      title="Condiciones de uso"
      intro="Las normas para usar Furrly. Están pensadas para que los avisos sean fiables y nadie se aproveche de quien ha perdido a su mascota."
    >
      <Section title="Quién puede usar Furrly">
        <p>
          Cualquiera puede ver el mapa y la comunidad sin cuenta. Para publicar, escribir mensajes o recibir alertas hace falta
          una cuenta, y para crearla hay que tener <strong>{LEGAL.minAge} años o más</strong>. Al crearla aceptas estas
          condiciones.
        </p>
      </Section>

      <Section title="Tu cuenta">
        <ul className="space-y-1">
          <li>Una cuenta por persona, con un email que sea tuyo.</li>
          <li>Eres responsable de lo que se haga con ella: no compartas tu contraseña.</li>
          <li>Puedes borrarla cuando quieras desde Perfil → Borrar mi cuenta.</li>
        </ul>
      </Section>

      <Section title="Normas de la comunidad">
        <ul className="space-y-1">
          <li>
            <strong>Avisos reales.</strong> Publica solo mascotas que se han perdido o que has encontrado de verdad, y marca el
            aviso como resuelto cuando aparezca.
          </li>
          <li>
            <strong>Nada de vender animales</strong> ni anunciar productos o servicios: Furrly no es una tienda.
          </li>
          <li>
            <strong>Respeto.</strong> Sin insultos, acoso, amenazas, contenido violento, sexual o discriminatorio.
          </li>
          <li>
            <strong>Sin datos de otras personas</strong> (teléfonos, direcciones, fotos de caras) sin su permiso.
          </li>
          <li>
            <strong>Fotos tuyas</strong> o que tengas derecho a usar.
          </li>
          <li>
            <strong>Sin spam</strong> ni mensajes en masa, y sin intentar saltarse los límites o la seguridad de la web.
          </li>
        </ul>
      </Section>

      <Section title="Lo que publicas">
        <p>
          Lo que subes sigue siendo tuyo. Al publicarlo nos permites mostrarlo en Furrly (en el mapa, la comunidad, el cartel para
          imprimir y la vista previa al compartir) mientras no lo borres. Los avisos, mascotas y publicaciones son públicos.
        </p>
      </Section>

      <Section title="Seguridad al devolver una mascota">
        <ul className="space-y-1">
          <li>Queda en un sitio público y, si puedes, acompañado.</li>
          <li>
            <strong>No pagues nada por adelantado</strong>: es la estafa más habitual con mascotas perdidas. Pide una foto actual
            o un detalle que solo conozca quien la tiene.
          </li>
          <li>Si algo no te cuadra, bloquea al usuario y denúncialo desde la conversación.</li>
        </ul>
      </Section>

      <Section title="Moderación">
        <p>
          Cualquiera puede denunciar avisos, publicaciones, comentarios, perfiles o conversaciones. La moderación revisa las
          denuncias y, aunque no las haya, puede borrar el contenido o suspender o eliminar la cuenta de quien incumpla estas
          normas. Si retira algo tuyo, te lo decimos con el motivo. Si crees que se ha equivocado, escribe a <ContactEmail />.
        </p>
      </Section>

      <Section title="El servicio">
        <p>
          Furrly es un proyecto educativo gratuito: se ofrece tal cual, sin garantías de que esté siempre disponible ni de que
          una mascota aparezca, y podría cambiar o cerrarse avisándolo antes. Si cambian estas condiciones en algo importante,
          lo avisaremos en la app. Más detalles en el <TextLink to="/aviso-legal">aviso legal</TextLink> y en{' '}
          <TextLink to="/privacidad">Privacidad</TextLink>.
        </p>
      </Section>
    </LegalPage>
  )
}
