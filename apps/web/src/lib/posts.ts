import type { Species } from './pets'

export interface Post {
  id: string
  imageUrl: string
  caption: string | null
  createdAt: string
  pet: {
    id: string
    name: string
    species: Species
    photoUrl: string | null
    owner: { username: string; displayName: string }
  }
  likesCount: number
  commentsCount: number
  likedByMe: boolean
}

/** Una página del feed. nextCursor = null cuando no hay más. */
export interface PostsPage {
  posts: Post[]
  nextCursor: string | null
}

export interface PostComment {
  id: string
  body: string
  createdAt: string
  user: { username: string; displayName: string; avatarUrl: string | null }
}

export interface LikeState {
  likesCount: number
  likedByMe: boolean
}
