import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { ErrorText } from '../components/Field'
import { Loading, Page } from '../components/Page'
import { PostList } from '../components/PostList'
import { ButtonLink } from '../components/ui/Button'
import { Card, SectionTitle } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { CameraIcon, CommunityIcon, SearchIcon } from '../components/ui/icons'
import { iconButtonClass } from '../components/ui/styles'
import { usePostsPages } from '../lib/usePostsPages'

type Tab = 'siguiendo' | 'explorar'

/** Comunidad: "Siguiendo" (mascotas que sigues + las tuyas) y "Explorar" (todo lo reciente). */
export function Feed() {
  const { session, loading } = useAuth()
  const [params, setParams] = useSearchParams()
  // Sin sesión no hay a quién seguir: se muestra Explorar.
  const tab: Tab = !session || params.get('ver') === 'explorar' ? 'explorar' : 'siguiendo'
  const { posts, error, hasMore, loadMore, loadingMore } = usePostsPages(
    loading ? null : tab === 'siguiendo' ? '/feed' : '/posts',
  )

  return (
    <Page
      title="Comunidad"
      width="feed"
      action={
        <Link to="/buscar" aria-label="Buscar perfiles" className={iconButtonClass()}>
          <SearchIcon size={20} />
        </Link>
      }
    >
      <div className="mb-5 flex items-center gap-2">
        {session && (
          <>
            <Chip active={tab === 'siguiendo'} onClick={() => setParams({}, { replace: true })}>
              Siguiendo
            </Chip>
            <Chip active={tab === 'explorar'} onClick={() => setParams({ ver: 'explorar' }, { replace: true })}>
              Explorar
            </Chip>
          </>
        )}
        <ButtonLink to="/publicaciones/nueva" size="md" className="ml-auto whitespace-nowrap">
          <CameraIcon size={20} /> Publicar foto
        </ButtonLink>
      </div>

      {error && <ErrorText>{error}</ErrorText>}
      {!posts ? (
        !error && <Loading label="Cargando publicaciones…" />
      ) : posts.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-lost-soft text-lost">
            <CommunityIcon size={30} />
          </span>
          {tab === 'siguiendo' ? (
            <>
              <SectionTitle>Aún no sigues a ninguna mascota</SectionTitle>
              <p className="max-w-xs text-[15px] font-semibold text-muted">
                Sigue a las mascotas de tus vecinos para ver aquí sus fotos.
              </p>
              <ButtonLink to="/comunidad?ver=explorar" variant="dark" className="mt-2">
                Explorar
              </ButtonLink>
            </>
          ) : (
            <>
              <SectionTitle>Todavía no hay publicaciones</SectionTitle>
              <p className="max-w-xs text-[15px] font-semibold text-muted">
                {session ? (
                  'Sé el primero en compartir una foto de tu mascota.'
                ) : (
                  <>
                    <Link to="/login" className="font-extrabold text-lost-text">
                      Entra
                    </Link>{' '}
                    para compartir fotos de tu mascota.
                  </>
                )}
              </p>
            </>
          )}
        </Card>
      ) : (
        <PostList posts={posts} hasMore={hasMore} loadingMore={loadingMore} onLoadMore={loadMore} />
      )}
    </Page>
  )
}
