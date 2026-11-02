import { prisma } from './prisma.js'

/**
 * Borra una cuenta. En Supabase se borra el usuario de auth.users: el trigger on_auth_user_deleted
 * borra el perfil y, en cascada, mascotas, avisos, publicaciones, mensajes... (la API se conecta
 * como postgres, que puede hacerlo). En los tests no existe el schema auth: se borra el perfil.
 */
export async function deleteAccount(userId: string) {
  const [{ hasAuth }] = await prisma.$queryRaw<{ hasAuth: boolean }[]>`
    SELECT to_regclass('auth.users') IS NOT NULL AS "hasAuth"`
  if (hasAuth) await prisma.$executeRaw`DELETE FROM auth.users WHERE id = ${userId}::uuid`
  await prisma.user.deleteMany({ where: { id: userId } })
}
