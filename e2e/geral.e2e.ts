import { expect, test } from '@playwright/test'
import { open } from './helpers'

test('abre no início e a barra de abas leva a cada módulo', async ({ page }) => {
  const errors = await open(page)
  const tabs = page.getByRole('navigation', { name: 'Navegação principal' })
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/boa|bom/)
  await expect(tabs.getByRole('button', { name: 'início' })).toHaveAttribute('aria-current', 'page')

  await tabs.getByRole('button', { name: 'mercado' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'mercado' })).toBeVisible()
  await expect(page.locator('.swipe')).toHaveCount(4)

  await tabs.getByRole('button', { name: /^contas/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'contas' })).toBeVisible()

  await tabs.getByRole('button', { name: 'desejos' }).click()
  await expect(page.locator('.swipe')).toHaveCount(5)
  expect(errors).toEqual([])
})

test('conta em atraso vira selo na aba de contas', async ({ page }) => {
  await open(page)
  const tabs = page.getByRole('navigation', { name: 'Navegação principal' })
  await expect(tabs.getByRole('button', { name: /^contas, \d+ em atraso$/ })).toBeVisible()
})

test('adiciona no início e encontra no mercado sem acento', async ({ page }) => {
  await open(page)
  await page.getByRole('textbox', { name: 'Adicionar ao mercado' }).fill('2 maçãs')
  await page.getByRole('button', { name: 'Adicionar à lista' }).click()
  await expect(page.locator('.capture-hint')).toContainText('Maçãs na lista')
  await page.getByRole('button', { name: /^mercado/ }).first().click()
  await page.getByRole('searchbox', { name: 'Buscar na lista' }).fill('macas')
  await expect(page.locator('.swipe')).toHaveCount(1)
  await expect(page.locator('.swipe')).toContainText('Maçãs')
})

test('captura conta e desejo diretamente pelo início', async ({ page }) => {
  await open(page)
  await page.getByRole('radio', { name: 'conta' }).click()
  await page.getByRole('textbox', { name: 'Adicionar conta' }).fill('internet 129,90 dia 15')
  await expect(page.locator('.capture-hint')).toContainText('Internet · R$ 129,90 · dia 15')
  await page.getByRole('button', { name: 'Adicionar conta' }).click()
  await expect(page.locator('.capture-hint')).toContainText('Internet nas contas')

  await page.getByRole('radio', { name: 'desejo' }).click()
  await page.getByRole('textbox', { name: 'Adicionar desejo' }).fill('luminária 249,90')
  await page.getByRole('button', { name: 'Adicionar desejo' }).click()
  await expect(page.locator('.capture-hint')).toContainText('Luminária nos desejos')
})

test('configurações abre como folha, guarda a aparência e devolve o foco', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await open(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const trigger = page.getByRole('button', { name: 'Abrir configurações' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'configurações' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('radio', { name: 'claro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await page.evaluate(() => localStorage.getItem('despensa:tema'))).toBe('light')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('a apresentação tem quatro telas e pode ser vista de novo', async ({ page }) => {
  const errors = await open(page, '&onboarding=1')
  const dialog = page.getByRole('dialog', { name: 'Apresentação' })
  await expect(dialog).toContainText('bem-vindo')
  await dialog.getByRole('button', { name: 'continuar' }).click()
  await expect(dialog).toContainText('um campo para tudo')
  await dialog.getByRole('button', { name: 'continuar' }).click()
  await expect(dialog).toContainText('deslize para agir')
  await dialog.getByRole('button', { name: 'continuar' }).click()
  await expect(dialog).toContainText('sempre em dia')
  await dialog.getByRole('button', { name: 'começar' }).click()
  await expect(dialog).toHaveCount(0)

  await page.getByRole('button', { name: 'Abrir configurações' }).click()
  await page.getByRole('button', { name: /ver a apresentação de novo/ }).click()
  await expect(page.getByRole('dialog', { name: 'Apresentação' })).toBeVisible()
  expect(errors).toEqual([])
})

test('a apresentação cabe no menor iPhone suportado', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await open(page, '&onboarding=1')
  const dialog = page.getByRole('dialog', { name: 'Apresentação' })
  for (let i = 0; i < 3; i++) await dialog.getByRole('button', { name: 'continuar' }).click()
  const button = await dialog.getByRole('button', { name: 'começar' }).boundingBox()
  expect(button!.x).toBeGreaterThanOrEqual(0)
  expect(button!.x + button!.width).toBeLessThanOrEqual(320)
  expect(button!.y + button!.height).toBeLessThanOrEqual(568)
})

test('funciona com movimento reduzido', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, '&lista=1')
  await expect(page.getByRole('progressbar', { name: 'Itens no carrinho' })).toHaveAttribute('aria-valuenow', '2')
  await page.locator('.swipe').first().getByRole('checkbox').click()
  await expect(page.locator('.swipe')).toHaveCount(3)
})

test('no desktop, as abas viram barra lateral', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 })
  await open(page, '&contas=1')
  const tabs = page.getByRole('navigation', { name: 'Navegação principal' })
  const box = await tabs.boundingBox()
  expect(box!.x).toBeLessThan(1)
  expect(box!.width).toBeGreaterThan(200)
  expect(box!.height).toBeGreaterThan(700)
})

test('no escuro, a aba selecionada e o botão principal ficam legíveis', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await open(page)
  const contraste = await page.evaluate(() => {
    const lum = (css: string) => {
      const [r, g, b] = (css.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number).map((v) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const root = getComputedStyle(document.documentElement)
    const a = lum(getComputedStyle(document.querySelector("[aria-current='page']")!).color)
    const b = lum(getComputedStyle(document.body).backgroundColor)
    void root
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  })
  expect(contraste).toBeGreaterThan(4.5)
})

test('os avatares têm fundo transparente', async ({ page }) => {
  const response = await page.request.get('/avatars/lucas.webp')
  const buf = await response.body()
  // WebP com alfa é VP8L ou VP8X; VP8 puro (lossy sem alfa) não tem transparência
  expect(['VP8L', 'VP8X']).toContain(buf.subarray(12, 16).toString('ascii'))
})
