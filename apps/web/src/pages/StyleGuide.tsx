import { useState } from 'react'
import { Field } from '../components/Field'
import { Badge } from '../components/ui/Badge'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card, SectionTitle } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { EyeIcon, ShareIcon } from '../components/ui/icons'
import { Logo } from '../components/ui/Logo'
import { iconButtonClass } from '../components/ui/styles'
import { TopSearchBar } from '../components/ui/TopSearchBar'

/** Escaparate de los componentes base. Solo existe en desarrollo (ver App.tsx). */
export function StyleGuide() {
  const [filter, setFilter] = useState('all')
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 pt-6 pb-32">
      <Logo />
      <TopSearchBar place="Retiro, Madrid" onSearch={() => {}} />
      <section className="space-y-3">
        <SectionTitle>Botones</SectionTitle>
        <div className="flex flex-wrap gap-2.5">
          <Button>Publicar aviso</Button>
          <Button variant="sighting">
            <EyeIcon /> La he visto
          </Button>
          <Button variant="dark">Siguiente</Button>
          <Button variant="outline">Avisar de que se ha perdido</Button>
          <ButtonLink to="/" variant="secondary" size="md">
            Secundario
          </ButtonLink>
          <Button variant="danger" size="md">
            Borrar
          </Button>
          <button className={iconButtonClass()} aria-label="Compartir">
            <ShareIcon size={20} />
          </button>
        </div>
      </section>
      <section className="space-y-3">
        <SectionTitle>Etiquetas y chips</SectionTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="lost">Perdida</Badge>
          <Badge tone="found">Encontrada</Badge>
          <Badge tone="resolved">Resuelto</Badge>
          <Badge tone="cancelled">Cancelado</Badge>
          <Badge tone="lost" solid>
            Perdida
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ['all', 'Todos · 5 km', undefined],
            ['lost', 'Perdidas', '#C2410C'],
            ['found', 'Encontradas', '#1E5BB8'],
          ].map(([key, label, dot]) => (
            <Chip key={key} active={filter === key} dot={dot} onClick={() => setFilter(key!)}>
              {label}
            </Chip>
          ))}
        </div>
      </section>
      <Card className="space-y-3">
        <SectionTitle>Cómo es</SectionTitle>
        <p className="text-[15px] leading-relaxed text-body">Tarjeta con borde suave y radio de 22 px.</p>
        <Field label="Nombre" placeholder="Luna" />
      </Card>
    </div>
  )
}
