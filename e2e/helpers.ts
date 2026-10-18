import type { Locator, Page } from '@playwright/test'

export async function open(page: Page, query = '') {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto(`/?demo=1${query}`)
  await page.waitForTimeout(900)
  return errors
}

/** Arrasta como um dedo, a partir da borda que faz sentido para a direção. */
export async function swipe(page: Page, target: Locator, dx: number) {
  // no meio da tela: embaixo ficam o campo e a barra de abas, que flutuam por cima da lista
  await target.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  const box = await target.boundingBox()
  if (!box) throw new Error('alvo invisível')
  const startX = dx < 0 ? box.x + box.width - 40 : box.x + 60
  const y = box.y + box.height / 2
  await page.mouse.move(startX, y)
  await page.mouse.down()
  // ritmo de dedo: sem pausa, os movimentos chegam juntos e o arrasto não é reconhecido
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(startX + (dx / 10) * i, y)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
  await page.waitForTimeout(450)
}

/** Toca no centro exato de um elemento, como o dedo faria (sem atalhos do Playwright). */
export async function tapCenter(page: Page, target: Locator) {
  // no meio da tela: embaixo ficam o campo e a barra de abas, que flutuam por cima da lista
  await target.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  const box = await target.boundingBox()
  if (!box) throw new Error('alvo invisível')
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}
