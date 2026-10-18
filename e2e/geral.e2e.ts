import { expect, test } from '@playwright/test'
import { open } from './helpers'

const tabs = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Navegação principal' })

test('abre no início e a barra leva a cada página', async ({ page }) => {
  const errors = await open(page)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Bo[ma]/)
  await expect(tabs(page).getByRole('button', { name: 'Início' })).toHaveAttribute('aria-current', 'page')

  await tabs(page).getByRole('button', { name: 'Mercado' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Mercado' })).toBeVisible()
  await expect(page.locator('.todos .swipe')).toHaveCount(4)

  await tabs(page).getByRole('button', { name: /^Contas/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Contas' })).toBeVisible()

  await tabs(page).getByRole('button', { name: 'Desejos' }).click()
  await expect(page.locator('.gallery .swipe')).toHaveCount(5)
  expect(errors).toEqual([])
})

test('o caminho no topo volta para a casa', async ({ page }) => {
  await open(page, '&lista=1')
  await page.getByRole('navigation', { name: 'Caminho' }).getByRole('button', { name: 'Casa' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Bo[ma]/)
})

test('as páginas do início abrem o módulo', async ({ page }) => {
  await open(page)
  await page.locator('.links').getByRole('button', { name: /Desejos/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Desejos' })).toBeVisible()
})

test('tocar de novo na aba atual volta ao topo', async ({ page }) => {
  await open(page, '&desejos=1')
  const scroll = page.locator('.scroll')
  await scroll.evaluate((el) => { el.scrollTop = 300 })
  await tabs(page).getByRole('button', { name: 'Desejos' }).click()
  await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBe(0)
})

test('conta em atraso vira selo e aviso no início', async ({ page }) => {
  await open(page)
  await expect(tabs(page).getByRole('button', { name: /^Contas, \d+ em atraso$/ })).toBeVisible()
  await expect(page.locator('.callout.is-red')).toContainText('atrasadas')
})

test('adiciona no início e encontra no mercado sem acento', async ({ page }) => {
  await open(page)
  await page.getByRole('textbox', { name: 'Adicionar ao mercado' }).fill('2 maçãs')
  await page.getByRole('button', { name: 'Adicionar à lista' }).click()
  await expect(page.locator('.capture-hint')).toContainText('Maçãs foi para Mercado')
  await tabs(page).getByRole('button', { name: 'Mercado' }).click()
  await page.getByRole('searchbox', { name: 'Buscar na lista' }).fill('macas')
  await expect(page.locator('.todos .swipe')).toHaveCount(1)
  await expect(page.locator('.todos .swipe')).toContainText('Maçãs')
})

test('o menu do campo escolhe onde adicionar', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Onde adicionar' }).click()
  await page.getByRole('menuitemradio', { name: 'Contas' }).click()
  await page.getByRole('textbox', { name: 'Adicionar conta' }).fill('internet 129,90 dia 15')
  await expect(page.locator('.capture-hint')).toContainText('Internet · R$ 129,90 · dia 15')
  await page.getByRole('button', { name: 'Adicionar conta' }).click()
  await expect(page.locator('.capture-hint')).toContainText('Internet foi para Contas')

  await page.getByRole('button', { name: 'Onde adicionar' }).click()
  await page.getByRole('menuitemradio', { name: 'Desejos' }).click()
  await page.getByRole('textbox', { name: 'Adicionar desejo' }).fill('luminária 249,90')
  await page.getByRole('button', { name: 'Adicionar desejo' }).click()
  await expect(page.locator('.capture-hint')).toContainText('Luminária foi para Desejos')
})

test('configurações abre como folha, guarda a aparência e devolve o foco', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await open(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const trigger = page.getByRole('button', { name: 'Abrir configurações' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Configurações' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('radio', { name: 'Claro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await page.evaluate(() => localStorage.getItem('despensa:tema'))).toBe('light')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('a apresentação é uma página de primeiros passos', async ({ page }) => {
  const errors = await open(page, '&onboarding=1')
  const dialog = page.getByRole('dialog', { name: 'Apresentação' })
  await expect(dialog).toContainText('Boas-vindas')
  const step = dialog.getByRole('checkbox', { name: 'Escreva do jeito que fala' })
  await step.click()
  await expect(step).toHaveAttribute('aria-checked', 'true')
  await dialog.getByRole('button', { name: 'Começar' }).click()
  await expect(dialog).toHaveCount(0)

  await page.getByRole('button', { name: 'Abrir configurações' }).click()
  await page.getByRole('button', { name: /Ver a apresentação/ }).click()
  await expect(page.getByRole('dialog', { name: 'Apresentação' })).toBeVisible()
  expect(errors).toEqual([])
})

test('a apresentação cabe no menor iPhone suportado', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await open(page, '&onboarding=1')
  const button = page.getByRole('dialog', { name: 'Apresentação' }).getByRole('button', { name: 'Começar' })
  await button.scrollIntoViewIfNeeded()
  const box = await button.boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(320)
})

test('funciona com movimento reduzido', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, '&lista=1')
  await page.locator('.todos .swipe').first().getByRole('checkbox').click()
  await expect(page.locator('.todos .swipe')).toHaveCount(3)
})

test('no computador, as páginas ficam numa barra lateral', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 })
  await open(page, '&contas=1')
  const box = await tabs(page).boundingBox()
  expect(box!.x).toBeLessThan(1)
  expect(box!.width).toBeGreaterThan(200)
  expect(box!.height).toBeGreaterThan(700)
})

test('no escuro, a aba selecionada fica legível', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await open(page)
  const contrast = await page.evaluate(() => {
    const lum = (css: string) => {
      const [r, g, b] = (css.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number).map((v) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const a = lum(getComputedStyle(document.querySelector("[aria-current='page'] .tab-label")!).color)
    const b = lum(getComputedStyle(document.body).backgroundColor)
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  })
  expect(contrast).toBeGreaterThan(4.5)
})

test('a tela de entrar alterna para criar conta', async ({ page }) => {
  await open(page, '&acesso=1')
  await expect(page.getByRole('textbox', { name: 'E-mail' })).toBeVisible()
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByRole('textbox', { name: 'Nome' })).toBeVisible()
})

test('os avatares têm fundo transparente', async ({ page }) => {
  const response = await page.request.get('/avatars/lucas.webp')
  const buf = await response.body()
  // WebP com alfa é VP8L ou VP8X; VP8 puro (lossy sem alfa) não tem transparência
  expect(['VP8L', 'VP8X']).toContain(buf.subarray(12, 16).toString('ascii'))
})
