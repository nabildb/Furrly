import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { ErrorText } from '../components/Field'
import { Loading } from '../components/Page'
import { ReportDetailFields, ReportWhereWhenFields } from '../components/ReportFields'
import { Button } from '../components/ui/Button'
import { ChoiceCard } from '../components/ui/ChoiceCard'
import { ArrowRightIcon, BackIcon, CheckIcon, CloseIcon, PawIcon, PlusIcon, SearchIcon } from '../components/ui/icons'
import { chipClass, iconButtonClass } from '../components/ui/styles'
import { api } from '../lib/api'
import { cx } from '../lib/cx'
import { speciesLabels, type Pet, type Species } from '../lib/pets'
import { readReportFields, type LatLng, type Report, type ReportType } from '../lib/reports'
import { removeImage } from '../lib/storage'
import { thumbUrl } from '../lib/thumbUrl'
import { useActiveLostReports } from '../lib/useActiveLostReports'

const STEPS = [
  { title: '¿Qué ha pasado?', next: 'Siguiente: dónde y cuándo' },
  { title: '¿Dónde y cuándo?', next: 'Siguiente: detalles' },
  { title: 'Cuéntanos más', next: 'Publicar aviso' },
]

/**
 * Publicar aviso como asistente de 3 pasos. Es un único <form>: los pasos que no se ven
 * siguen montados (con `hidden`), así al final FormData tiene todos los campos y al volver
 * atrás no se pierde nada. Cada paso se valida por separado al pulsar "Siguiente".
 */
export function ReportNew() {
  const navigate = useNavigate()
  const routerLocation = useLocation()
  // /avisos/nuevo?mascota=<id> llega desde el carnet ("Avisar de que se ha perdido").
  const [params] = useSearchParams()
  const preselectedPet = params.get('mascota')
  const [step, setStep] = useState(0)
  const [type, setType] = useState<ReportType>('lost')
  const [pets, setPets] = useState<Pet[] | null>(null)
  const [location, setLocation] = useState<LatLng | null>(null)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const activeLost = useActiveLostReports()
  const formRef = useRef<HTMLFormElement>(null)
  const fieldsets = useRef<(HTMLFieldSetElement | null)[]>([])
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api<Pet[]>('/me/pets')
      .then(setPets)
      .catch((e: Error) => setError(e.message))
  }, [])

  // Al cambiar de paso, arriba del todo (en móvil el paso anterior podía estar a media página).
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step])

  const isLost = type === 'lost'
  const noPets = isLost && pets?.length === 0

  /** Valida solo los campos del paso actual; reportValidity enseña el globo del navegador. */
  function validateStep() {
    const fieldset = fieldsets.current[step]
    const fieldsOk = [...(fieldset?.elements ?? [])].every((el) => (el as HTMLInputElement).reportValidity?.() ?? true)
    if (!fieldsOk) return false
    if (step === 1 && !location) {
      setError(isLost ? 'Marca en el mapa dónde se perdió.' : 'Marca en el mapa dónde lo encontraste.')
      return false
    }
    return true
  }

  function goNext() {
    setError(null)
    if (!validateStep()) return
    if (step === 1) suggestTitle()
    setStep(step + 1)
  }

  /** Propone un título con lo elegido en el paso 1, si el usuario aún no ha escrito uno. */
  function suggestTitle() {
    const input = titleRef.current
    const form = formRef.current
    if (!input || !form || input.value) return
    const data = new FormData(form)
    const address = String(data.get('addressText') ?? '').trim()
    const where = address ? ` en ${address}` : ''
    if (isLost) {
      const pet = pets?.find((p) => p.id === data.get('petId'))
      if (pet) input.value = `Se ha perdido ${pet.name}${where}`
    } else {
      const species = speciesLabels[data.get('species') as Species]
      input.value = `${species} encontrado${where}`
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // Enter en un campo de los pasos 1-2 también envía el form: lo tratamos como "Siguiente".
    if (step < STEPS.length - 1) return goNext()
    if (!validateStep() || !location) return
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      const report = await api<Report>('/reports', {
        method: 'POST',
        body: JSON.stringify({
          type,
          ...(isLost ? { petId: form.get('petId') } : { species: form.get('species') }),
          ...readReportFields(form, location, photoUrls),
        }),
      })
      navigate(`/avisos/${report.id}`, { replace: true })
    } catch (e) {
      setError((e as Error).message)
      setSubmitting(false)
    }
  }

  async function close() {
    // Las fotos ya subidas no se han usado: no las dejamos huérfanas en Storage.
    await Promise.all(photoUrls.map(removeImage))
    if (routerLocation.key !== 'default') navigate(-1)
    else navigate('/avisos')
  }

  if ((!pets || !activeLost) && !error) return <Loading />

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="mx-auto max-w-xl pb-32 lg:pb-12">
      <header className="sticky top-0 z-[1001] space-y-3.5 bg-bg/95 px-4 pt-4 pb-3 backdrop-blur sm:pt-8">
        <div className="flex items-center justify-between">
          {step === 0 ? (
            <button type="button" onClick={close} aria-label="Cerrar" className={iconButtonClass()}>
              <CloseIcon size={20} />
            </button>
          ) : (
            <button type="button" onClick={() => setStep(step - 1)} aria-label="Paso anterior" className={iconButtonClass()}>
              <BackIcon size={22} />
            </button>
          )}
          <span className="text-sm font-extrabold text-muted">
            Paso {step + 1} de {STEPS.length}
          </span>
          <span className="w-11" />
        </div>
        <div
          role="progressbar"
          aria-label="Progreso"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          className="grid grid-cols-3 gap-1.5"
        >
          {STEPS.map((s, i) => (
            <span key={s.title} className={cx('h-1.5 rounded-full transition-colors', i <= step ? 'bg-lost' : 'bg-track')} />
          ))}
        </div>
      </header>

      <div className="px-5 pt-3">
        <h1 className="mb-5 font-display text-[28px] leading-[1.15] font-extrabold tracking-[-0.8px]">
          {STEPS[step].title}
        </h1>

        {/* Paso 1: tipo de aviso y mascota (o especie) */}
        <fieldset ref={(el) => void (fieldsets.current[0] = el)} hidden={step !== 0} className="space-y-6">
          <div role="radiogroup" aria-label="Tipo de aviso" className="flex flex-col gap-3">
            <ChoiceCard
              name="type"
              value="lost"
              checked={isLost}
              onChange={() => setType('lost')}
              tone="lost"
              icon={<SearchIcon size={28} />}
              title="He perdido a mi mascota"
              description="Avisaremos a los vecinos de la zona"
            />
            <ChoiceCard
              name="type"
              value="found"
              checked={!isLost}
              onChange={() => setType('found')}
              tone="found"
              icon={<CheckIcon size={28} />}
              title="He encontrado un animal"
              description="Ayúdale a volver a casa"
            />
          </div>

          {isLost ? (
            <div>
              <p className="mb-2.5 text-base font-extrabold">¿Quién se ha perdido?</p>
              {noPets ? (
                <p className="rounded-2xl bg-lost-soft p-4 text-[15px] font-semibold text-lost-text">
                  Para avisar de una pérdida, primero{' '}
                  <Link to="/mascotas/nueva" className="font-extrabold underline">
                    añade a tu mascota
                  </Link>
                  .
                </p>
              ) : (
                <div role="radiogroup" aria-label="Mascota" className="grid grid-cols-3 gap-2.5">
                  {pets?.map((pet) => {
                    // Ya tiene un aviso activo: la API no deja abrir otro, así que ni se ofrece.
                    const busy = !!activeLost?.has(pet.id)
                    return (
                    <label
                      key={pet.id}
                      className={cx(
                        'flex flex-col items-center gap-2 rounded-[20px] border-2 border-card-line bg-surface py-3 transition has-[:checked]:border-lost has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lost',
                        busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                      )}
                    >
                      <input
                        type="radio"
                        name="petId"
                        value={pet.id}
                        required
                        disabled={busy}
                        defaultChecked={pet.id === (preselectedPet ?? pets.find((p) => !activeLost?.has(p.id))?.id)}
                        className="sr-only"
                      />
                      <span className="flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-[20px] bg-[#F6D9C8] text-lost/40">
                        {pet.photoUrl ? <img src={thumbUrl(pet.photoUrl)} alt="" className="h-full w-full object-cover" /> : <PawIcon size={28} />}
                      </span>
                      <span className="max-w-full truncate px-1 text-[15px] font-extrabold">{pet.name}</span>
                      {busy && <span className="-mt-1.5 text-xs font-bold text-muted">Ya tiene aviso</span>}
                    </label>
                    )
                  })}
                  <Link
                    to="/mascotas/nueva"
                    className="flex flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-[#C9C5BB] py-3 text-sm font-extrabold text-muted transition hover:border-ink hover:text-ink"
                  >
                    <PlusIcon size={22} />
                    Añadir
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="mb-2.5 text-base font-extrabold">¿Qué animal es?</p>
              <div role="radiogroup" aria-label="Especie" className="flex flex-wrap gap-2">
                {Object.entries(speciesLabels).map(([value, label]) => (
                  <label
                    key={value}
                    className={cx(
                      chipClass(false),
                      'cursor-pointer has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lost',
                    )}
                  >
                    <input type="radio" name="species" value={value} defaultChecked={value === 'dog'} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </fieldset>

        {/* Paso 2: dónde y cuándo */}
        <fieldset ref={(el) => void (fieldsets.current[1] = el)} hidden={step !== 1} className="space-y-5">
          <ReportWhereWhenFields type={type} location={location} onLocationChange={setLocation} />
        </fieldset>

        {/* Paso 3: título, descripción y fotos */}
        <fieldset ref={(el) => void (fieldsets.current[2] = el)} hidden={step !== 2} className="space-y-5">
          <ReportDetailFields type={type} photoUrls={photoUrls} onPhotosChange={setPhotoUrls} titleRef={titleRef} />
        </fieldset>

      </div>

      {/* Móvil y tablet: barra fija abajo. Escritorio: el botón va justo debajo del paso. */}
      <div className="fixed right-0 bottom-0 left-(--sidebar-w) z-[1100] bg-gradient-to-t from-bg via-bg to-bg/0 pt-6 lg:static lg:bg-none lg:pt-8">
        <div className="mx-auto max-w-xl space-y-3 px-5 pb-[max(24px,env(safe-area-inset-bottom))]">
          {/* El error va pegado al botón: si estuviera al final del paso, la barra lo taparía. */}
          {error && <ErrorText>{error}</ErrorText>}
          <Button
            type="submit"
            variant={step === STEPS.length - 1 ? 'primary' : 'dark'}
            disabled={submitting || noPets}
            className="h-[60px] w-full"
          >
            {submitting ? 'Publicando…' : STEPS[step].next}
            {step < STEPS.length - 1 && <ArrowRightIcon size={20} />}
          </Button>
        </div>
      </div>
    </form>
  )
}
