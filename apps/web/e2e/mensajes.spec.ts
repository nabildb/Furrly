import { expect, fullReport, logIn, mockApi, test } from './fixtures'

test('escribir al autor de un aviso abre la conversación', async ({ page }) => {
  await logIn(page)
  const sent: unknown[] = []
  const conversation = () => ({
    id: 'c1',
    other: { username: 'ana_g', displayName: 'Ana García', avatarUrl: null },
    olderCursor: null,
    messages: sent.map((body, i) => ({
      id: `m${i}`,
      body,
      fromMe: true,
      createdAt: new Date().toISOString(),
      report: i === 0 ? { id: 'r-kiwi', type: 'lost', title: 'Se ha escapado Kiwi, periquito verde' } : null,
    })),
  })
  await mockApi(page, {
    'GET /me/inbox': () => ({ notifications: 0, messages: 0 }),
    'GET /users/:username': () => ({ username: 'ana_g', displayName: 'Ana García', avatarUrl: null, bio: null, createdAt: new Date().toISOString(), petsCount: 1, reportsCount: 1 }),
    'GET /reports/:id': (_, { id }) => fullReport(id),
    'POST /conversations': (request) => {
      sent.push(request.postDataJSON().body)
      return { conversationId: 'c1' }
    },
    'GET /conversations/:id': conversation,
    'POST /conversations/:id/messages': (request) => {
      sent.push(request.postDataJSON().body)
      return { ...conversation().messages.at(-1) }
    },
  })

  await page.goto('/mensajes/nuevo?para=ana_g&aviso=r-kiwi')
  await expect(page.getByText('Sobre: Se ha escapado Kiwi, periquito verde')).toBeVisible()

  const box = page.getByRole('textbox', { name: 'Mensaje' })
  await box.fill('Creo que lo he visto en la plaza')
  await box.press('Enter')

  await expect(page).toHaveURL(/\/mensajes\/c1$/)
  await expect(page.getByText('Creo que lo he visto en la plaza')).toBeVisible()

  await box.fill('¿Sigue sin aparecer?')
  await box.press('Enter')
  await expect(page.getByText('¿Sigue sin aparecer?')).toBeVisible()
  expect(sent).toEqual(['Creo que lo he visto en la plaza', '¿Sigue sin aparecer?'])
})
