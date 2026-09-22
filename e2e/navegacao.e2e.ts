import { expect, test } from '@playwright/test'
import { edgeSwipe, open } from './helpers'

test('abre sempre no início, mesmo com módulo no endereço', async ({ page }) => {
  await page.goto('/?demo=1#contas')
  await expect(page.locator('.home-hello')).toBeVisible()
})

test('abre um módulo, volta pela seta e volta arrastando da borda', async ({ page }) => {
  const errors = await open(page)
  await page.locator('.home-bills').click()
  await expect(page.locator('.ticket-wrap')).toHaveCount(3)

  await page.locator('.wordmark-button').click()
  await expect(page.locator('.view.is-top')).toHaveCount(0)

  // a linha do início vira a tela (zoom): só dá para puxar da borda depois que ela ocupa tudo
  await page.locator('.home-market').click()
  await expect(page.locator('.mrow')).toHaveCount(4)
  await expect(page.locator('.view.is-top.is-zoom')).toHaveCSS('clip-path', 'inset(0px)')
  await edgeSwipe(page, 280)
  await expect(page.locator('.view.is-top')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('pela barra o módulo desliza, e volta arrastando da borda', async ({ page }) => {
  await open(page)
  await page.locator('.app-dock button', { hasText: 'mercado' }).click()
  await expect(page.locator('.view.is-top')).not.toHaveClass(/is-zoom/)
  // a borda anda junto com a tela: só dá para puxar depois que ela chega
  await expect(page.locator('.view.is-top')).toHaveCSS('transform', 'none')
  await edgeSwipe(page, 280)
  await expect(page.locator('.view.is-top')).toHaveCount(0)
})

test('entre módulos, o novo entra do lado da aba dele', async ({ page }) => {
  await open(page, '&lista=1')
  await page.locator('.app-dock button', { hasText: 'desejos' }).click()
  // desejos fica à direita de mercado: entra vindo da direita
  const entering = page.locator('.module-surface').last()
  const x = await entering.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41)
  expect(x).toBeGreaterThan(0)
  await expect(page.locator('.wish')).toHaveCount(5)
  await expect(page.locator('.module-surface')).toHaveCount(1)
})

test('abrir o menu empurra o app para trás, como as folhas do iOS', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Abrir menu' }).first().click()
  await expect(page.locator('.stage')).toHaveClass(/is-receded/)
  await expect.poll(() => page.locator('.stage-card').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a)).toBeLessThan(0.95)
  await page.keyboard.press('Escape')
  await expect(page.locator('.stage')).not.toHaveClass(/is-receded/)
})

test('menu troca de módulo', async ({ page }) => {
  await open(page, '&lista=1')
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.locator('.module', { hasText: 'desejos' }).click()
  await expect(page.locator('.wish')).toHaveCount(5)
})

test('barra Liquid Glass permanece visível e acompanha o módulo atual', async ({ page }) => {
  await open(page)
  const dock = page.getByRole('navigation', { name: 'Navegação principal' })
  await expect(dock).toBeVisible()
  await expect(dock.getByRole('button', { name: 'início' })).toHaveAttribute('aria-current', 'page')

  await dock.getByRole('button', { name: 'mercado' }).click()
  await expect(page.locator('.mrow')).toHaveCount(4)
  await expect(dock).toBeVisible()
  await expect(dock.getByRole('button', { name: 'mercado' })).toHaveAttribute('aria-current', 'page')

  await dock.getByRole('button', { name: 'contas' }).click()
  await expect(page.locator('.ticket-wrap')).toHaveCount(3)
  await expect(dock.getByRole('button', { name: 'contas' })).toHaveAttribute('aria-current', 'page')
})

test('a barra encolhe até a aba atual quando a tela desce, e volta ao toque', async ({ page }) => {
  await open(page)
  const dock = page.getByRole('navigation', { name: 'Navegação principal' })
  await expect(dock).toHaveAttribute('data-mini', 'false')
  await expect(dock.getByRole('button')).toHaveCount(4)

  await page.mouse.move(200, 400)
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 60); await page.waitForTimeout(30) }
  await expect(dock).toHaveAttribute('data-mini', 'true')
  // sobra só a aba em que a pessoa está
  await expect(dock.getByRole('button')).toHaveCount(1)
  await expect(dock.getByRole('button').first()).toHaveAttribute('aria-current', 'page')

  // tocar na pílula abre a barra de volta, sem trocar de módulo
  await dock.getByRole('button').first().click()
  await expect(dock).toHaveAttribute('data-mini', 'false')
  await expect(dock.getByRole('button')).toHaveCount(4)
  await expect(page.locator('.home-hello')).toBeVisible()
})

test('voltar ao topo devolve a barra, mas rolar um pouco para cima não', async ({ page }) => {
  await open(page)
  const dock = page.getByRole('navigation', { name: 'Navegação principal' })
  await page.mouse.move(200, 400)
  for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 60); await page.waitForTimeout(30) }
  await expect(dock).toHaveAttribute('data-mini', 'true')

  // as HIG só devolvem a barra ao tocar numa aba ou ao voltar ao topo
  await page.mouse.wheel(0, -90)
  await page.waitForTimeout(350)
  await expect(dock).toHaveAttribute('data-mini', 'true')

  await page.evaluate(() => { const s = document.querySelector('.home-v3 .scroll'); if (s) s.scrollTop = 0 })
  await expect(dock).toHaveAttribute('data-mini', 'false')
})

test('conta em atraso vira selo na aba de contas', async ({ page }) => {
  await open(page)
  const dock = page.getByRole('navigation', { name: 'Navegação principal' })
  await expect(dock.getByRole('button', { name: /^contas, \d+ em atraso$/ })).toBeVisible()
})

test('o vidro da barra acompanha o tema escuro', async ({ page }) => {
  await open(page)
  const dock = page.locator('.app-dock')
  const claro = await dock.evaluate((el) => getComputedStyle(el).backgroundColor)

  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
  await page.waitForTimeout(200)
  const escuro = await dock.evaluate((el) => getComputedStyle(el).backgroundColor)
  const filtro = await dock.evaluate((el) => getComputedStyle(el).backdropFilter || (getComputedStyle(el) as CSSStyleDeclaration & { webkitBackdropFilter?: string }).webkitBackdropFilter || '')

  expect(escuro).not.toBe(claro)
  // a variante "regular" ajusta a luminosidade do que está atrás, não só desfoca
  expect(filtro).toContain('brightness')
})
