/**
 * Datos de demo para que la web desplegada no salga vacía.
 *
 *   npm run db:seed-demo -w @furrly/api -- --yes
 *
 * - Los vecinos de demo son solo perfiles en public.users, SIN cuenta en Supabase Auth:
 *   nadie puede iniciar sesión con ellos (public.users no tiene FK a auth.users).
 * - Usan UUIDs fijos: cada ejecución borra los perfiles de demo (y en cascada sus mascotas,
 *   avisos y avistamientos) y los vuelve a crear. Se puede repetir sin duplicar nada.
 * - Las fechas son relativas al momento de ejecutarlo, para que la demo parezca reciente.
 * - No toca nada que no sea de los perfiles de demo.
 */
import { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'

type Species = 'dog' | 'cat' | 'rabbit' | 'bird' | 'other'
type Sex = 'male' | 'female' | 'unknown'
type Point = { lat: number; lng: number }

const demoId = (n: number) => `f0f0f0f0-0000-4000-8000-${String(n).padStart(12, '0')}`
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000)
const yearsAgo = (y: number) => new Date(new Date().getFullYear() - y, 3, 15)

// Lugares de Madrid, todos a menos de 5 km de Sol (el centro por defecto del mapa).
const PLACES = {
  retiro: { lat: 40.4141, lng: -3.6854 },
  odonnell: { lat: 40.4196, lng: -3.6776 },
  goya: { lat: 40.4243, lng: -3.6758 },
  malasana: { lat: 40.4262, lng: -3.7046 },
  dosDeMayo: { lat: 40.4275, lng: -3.7032 },
  chamberi: { lat: 40.4336, lng: -3.7026 },
  latina: { lat: 40.4108, lng: -3.7107 },
  lavapies: { lat: 40.4086, lng: -3.7008 },
  chueca: { lat: 40.4228, lng: -3.6973 },
  madridRio: { lat: 40.4014, lng: -3.7186 },
  arganzuela: { lat: 40.4005, lng: -3.6995 },
} satisfies Record<string, Point>

const users = [
  { n: 1, username: 'marta_v', name: 'Marta Vidal', bio: 'Vecina del Retiro. Luna y Nala mandan en casa.' },
  { n: 2, username: 'jorge_r', name: 'Jorge Ruiz', bio: 'Paseo por Malasaña cada mañana con Toby.' },
  { n: 3, username: 'lucia_p', name: 'Lucía Pérez', bio: 'Voluntaria en una protectora de Madrid.' },
  { n: 4, username: 'dani_m', name: 'Dani Moreno', bio: null },
  { n: 5, username: 'ana_g', name: 'Ana García', bio: 'Si veo un animal suelto, aviso aquí.' },
]

interface DemoPet {
  n: number
  owner: number
  name: string
  species: Species
  breed: string | null
  sex: Sex
  age: number | null
  color: string
  description: string
}

const pets: DemoPet[] = [
  { n: 11, owner: 1, name: 'Luna', species: 'dog', breed: 'Beagle', sex: 'female', age: 3, color: 'Tricolor',
    description: 'Le encanta el Retiro y perseguir palomas. Es miedosa con los ruidos fuertes y no se deja coger por desconocidos.' },
  { n: 12, owner: 1, name: 'Nala', species: 'cat', breed: 'Europeo común', sex: 'female', age: 5, color: 'Gris',
    description: 'Muy casera y tranquila.' },
  { n: 13, owner: 2, name: 'Toby', species: 'cat', breed: 'Europeo común', sex: 'male', age: 2, color: 'Atigrado',
    description: 'Curioso y glotón. Lleva un collar verde con cascabel.' },
  { n: 14, owner: 3, name: 'Coco', species: 'rabbit', breed: 'Belier enano', sex: 'male', age: 1, color: 'Marrón claro',
    description: 'Orejas caídas, muy pequeño. Se asusta con facilidad.' },
  { n: 15, owner: 4, name: 'Rocky', species: 'dog', breed: 'Mestizo', sex: 'male', age: 7, color: 'Negro con el pecho blanco',
    description: 'Mayor y bonachón, algo sordo. Responde a gestos más que a la voz.' },
  { n: 16, owner: 4, name: 'Mía', species: 'cat', breed: null, sex: 'female', age: 4, color: 'Negra',
    description: 'No sale de casa, pero por si acaso.' },
  { n: 17, owner: 5, name: 'Kiwi', species: 'bird', breed: 'Periquito', sex: 'unknown', age: 1, color: 'Verde y amarillo',
    description: 'Silba mucho y viene si oye su nombre.' },
]

interface DemoSighting {
  user: number
  at: Point
  hoursAgo: number
  note: string
}

interface DemoReport {
  n: number
  type: 'lost' | 'found'
  reporter: number
  pet?: number
  species: Species
  title: string
  description: string
  at: Point
  address: string
  hoursAgo: number
  /** Horas desde que se resolvió (solo avisos resueltos). */
  resolvedHoursAgo?: number
  sightings?: DemoSighting[]
}

const reports: DemoReport[] = [
  {
    n: 21, type: 'lost', reporter: 1, pet: 11, species: 'dog',
    title: 'Se ha perdido Luna en el Retiro',
    description: 'Beagle tricolor con collar azul. Se asustó con un petardo junto al estanque. Es miedosa: si la ves, no la persigas y avisa.',
    at: PLACES.retiro, address: 'Parque del Retiro, junto al estanque', hoursAgo: 3,
    sightings: [
      { user: 2, at: PLACES.odonnell, hoursAgo: 2, note: "Junto a la puerta de O'Donnell, olisqueando una papelera." },
      { user: 3, at: PLACES.goya, hoursAgo: 0.6, note: 'La vi cruzando hacia Goya, iba sola y sin correa.' },
    ],
  },
  {
    n: 22, type: 'lost', reporter: 2, pet: 13, species: 'cat',
    title: 'Toby no ha vuelto a casa',
    description: 'Gato atigrado con collar verde y cascabel. Se escapó por la ventana del patio. Suele esconderse bajo los coches.',
    at: PLACES.malasana, address: 'Calle del Espíritu Santo', hoursAgo: 26,
    sightings: [{ user: 5, at: PLACES.dosDeMayo, hoursAgo: 5, note: 'Un gato así estaba en la plaza del Dos de Mayo, debajo de un banco.' }],
  },
  {
    n: 23, type: 'lost', reporter: 3, pet: 14, species: 'rabbit',
    title: 'Se ha perdido Coco, conejo enano',
    description: 'Conejo belier marrón claro, muy pequeño. Se salió del transportín en la calle. No se deja coger fácilmente.',
    at: PLACES.chamberi, address: 'Plaza de Olavide', hoursAgo: 6,
  },
  {
    n: 24, type: 'lost', reporter: 4, pet: 15, species: 'dog',
    title: 'Rocky, perro mayor perdido en La Latina',
    description: 'Mestizo negro con el pecho blanco, 7 años. Está algo sordo: acércate despacio y por delante. Necesita su medicación.',
    at: PLACES.latina, address: 'Plaza de la Cebada', hoursAgo: 50,
    sightings: [{ user: 1, at: PLACES.madridRio, hoursAgo: 20, note: 'Creo que era él, caminando por Madrid Río hacia el puente de Toledo.' }],
  },
  {
    n: 25, type: 'lost', reporter: 5, pet: 17, species: 'bird',
    title: 'Se ha escapado Kiwi, periquito verde',
    description: 'Periquito verde y amarillo. Se escapó por el balcón. Si lo oyes silbar, llámale por su nombre.',
    at: PLACES.chueca, address: 'Plaza de Chueca', hoursAgo: 0.5,
  },
  {
    n: 26, type: 'found', reporter: 5, species: 'dog',
    title: 'Perro pequeño blanco encontrado en Lavapiés',
    description: 'Perro pequeño blanco con arnés rojo, sin chapa. Muy cariñoso. Está en mi casa y lo llevaré al veterinario a leerle el chip.',
    at: PLACES.lavapies, address: 'Plaza de Lavapiés', hoursAgo: 2,
  },
  {
    n: 27, type: 'found', reporter: 4, species: 'cat',
    title: 'Gata tricolor en Madrid Río',
    description: 'Gata tricolor joven, sin collar, muy sociable. Parece doméstica. La estamos cuidando en el portal.',
    at: PLACES.arganzuela, address: 'Paseo de la Chopera', hoursAgo: 30,
  },
  {
    n: 28, type: 'lost', reporter: 1, pet: 12, species: 'cat',
    title: 'Se ha perdido Nala',
    description: 'Gata gris muy casera. Se coló en el ascensor.',
    at: PLACES.retiro, address: 'Calle de Ibiza', hoursAgo: 120, resolvedHoursAgo: 72,
  },
]

const point = ({ lat, lng }: Point) => Prisma.sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`

async function main() {
  if (!process.argv.includes('--yes')) {
    const host = new URL(process.env.DATABASE_URL ?? 'postgres://?').hostname || '(sin DATABASE_URL)'
    console.log(`Esto borra y recrea los datos de demo en ${host}. Repite con --yes para continuar.`)
    return
  }

  const ids = users.map((u) => demoId(u.n))
  await prisma.$transaction(async (tx) => {
    // Cascada: con los perfiles se van sus mascotas, avisos, fotos y avistamientos.
    await tx.$executeRaw`DELETE FROM users WHERE id = ANY(${ids}::uuid[])`

    for (const u of users) {
      await tx.$executeRaw`
        INSERT INTO users (id, username, display_name, bio, created_at)
        VALUES (${demoId(u.n)}::uuid, ${u.username}, ${u.name}, ${u.bio}, ${hoursAgo(24 * 40 + u.n * 24)})`
    }

    for (const p of pets) {
      await tx.$executeRaw`
        INSERT INTO pets (id, owner_id, name, species, breed, sex, birth_date, color, description)
        VALUES (${demoId(p.n)}::uuid, ${demoId(p.owner)}::uuid, ${p.name}, ${p.species}::species, ${p.breed},
                ${p.sex}::pet_sex, ${p.age === null ? null : yearsAgo(p.age)}::date, ${p.color}, ${p.description})`
    }

    for (const r of reports) {
      const resolved = r.resolvedHoursAgo !== undefined
      await tx.$executeRaw`
        INSERT INTO reports (id, type, status, reporter_id, pet_id, species, title, description,
                             location, address_text, happened_at, resolved_at, created_at)
        VALUES (${demoId(r.n)}::uuid, ${r.type}::report_type, ${resolved ? 'resolved' : 'active'}::report_status,
                ${demoId(r.reporter)}::uuid, ${r.pet ? demoId(r.pet) : null}::uuid, ${r.species}::species,
                ${r.title}, ${r.description}, ${point(r.at)}, ${r.address}, ${hoursAgo(r.hoursAgo)},
                ${resolved ? hoursAgo(r.resolvedHoursAgo!) : null}, ${hoursAgo(r.hoursAgo - 0.1)})`

      for (const s of r.sightings ?? []) {
        await tx.$executeRaw`
          INSERT INTO sightings (id, report_id, user_id, location, seen_at, note, created_at)
          VALUES (gen_random_uuid(), ${demoId(r.n)}::uuid, ${demoId(s.user)}::uuid, ${point(s.at)}, ${hoursAgo(s.hoursAgo)},
                  ${s.note}, ${hoursAgo(s.hoursAgo - 0.05)})`
      }
    }
  })

  const sightings = reports.reduce((sum, r) => sum + (r.sightings?.length ?? 0), 0)
  console.log(
    `Demo lista: ${users.length} vecinos, ${pets.length} mascotas, ${reports.length} avisos, ${sightings} avistamientos.`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
