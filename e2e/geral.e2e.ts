import { expect, test } from '@playwright/test'
import { open } from './helpers'

test('abre no início e a barra de abas leva a cada módulo', async ({ page }) => {
  const errors = await open(page)
  const tabs = page.getByRole('navigation', { name: 'Navegação principal' })
  await expect(page.getByRole('heading', { level: 1, name: 'Início' })).toBeVisible()
  await expect(tabs.getByRole('button', { name: 'Início' })).toHaveAttribute('aria-current', 'page')

  await tabs.getByRole('button', { name: 'Mercado' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Mercado' })).toBeVisible()
  await expect(page.locator('.swipe')).toHaveCount(4)

  await tabs.getByRole('button', { name: /^Contas/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Contas' })).toBeVisible()

  await tabs.getByRole('button', { name: 'Desejos' }).click()
  await expect(page.locator('.swipe')).toHaveCount(5)
  expect(errors).toEqual([])
})

test('tocar de novo na aba atual volta ao topo', async ({ page }) => {
  await open(page, '&desejos=1')
  const scroll = page.locator('.scroll')
  await scroll.evaluate((el) => { el.scrollTop = 300 })
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Desejos' }).click()
  await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBe(0)
})

test('conta em atraso vira selo na aba de contas', async ({ page }) => {
  await open(page)
  const tabs = page.getByRole('navigation', { name: 'Navegação principal' })
  await expect(tabs.getByRole('button', { name: /^Contas, \d+ em atraso$/ })).toBeVisible()
})

test('cartões do início abrem o módulo', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: /^Desejos: / }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Desejos' })).toBeVisible()
})

test('adiciona no início e encontra no mercado sem acento', async ({ page }) => {
  await open(page)
  await page.getByRole('textbox', { name: 'Adicionar ao mercado' }).fill('2 maçãs')
  await page.getByRole('button', { name: 'Adicionar à lista' }).click()
  await expect(page.locator('.toast')).toContainText('Maçãs adicionado em Mercado')
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Mercado' }).click()
  await page.getByRole('searchbox', { name: 'Buscar na lista' }).fill('macas')
  await expect(page.locator('.swipe')).toHaveCount(1)
  await expect(page.locator('.swipe')).toContainText('Maçãs')
})

test('o menu do campo escolhe onde adicionar', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Onde adicionar' }).click()
  await page.getByRole('menuitemradio', { name: 'Contas' }).click()
  await page.getByRole('textbox', { name: 'Adicionar conta' }).fill('internet 129,90 dia 15')
  await expect(page.locator('.composer-chip')).toContainText('R$ 129,90 · dia 15')
  await page.getByRole('button', { name: 'Adicionar conta' }).click()
  await expect(page.locator('.toast')).toContainText('Internet adicionado em Contas')

  await page.getByRole('button', { name: 'Onde adicionar' }).click()
  await page.getByRole('menuitemradio', { name: 'Desejos' }).click()
  await page.getByRole('textbox', { name: 'Adicionar desejo' }).fill('luminária 249,90')
  await page.getByRole('button', { name: 'Adicionar desejo' }).click()
  await expect(page.locator('.toast').last()).toContainText('Luminária adicionado em Desejos')
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

test('a apresentação aparece uma vez e pode ser vista de novo', async ({ page }) => {
  const errors = await open(page, '&onboarding=1')
  const dialog = page.getByRole('dialog', { name: 'Apresentação' })
  await expect(dialog).toContainText('Boas-vindas')
  await expect(dialog).toContainText('Deslize para concluir')
  await dialog.getByRole('button', { name: 'Continuar' }).click()
  await expect(dialog).toHaveCount(0)

  await page.getByRole('button', { name: 'Abrir configurações' }).click()
  await page.getByRole('button', { name: /Ver a apresentação/ }).click()
  await expect(page.getByRole('dialog', { name: 'Apresentação' })).toBeVisible()
  expect(errors).toEqual([])
})

test('a apresentação cabe no menor iPhone suportado', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await open(page, '&onboarding=1')
  const button = page.getByRole('dialog', { name: 'Apresentação' }).getByRole('button', { name: 'Continuar' })
  await button.scrollIntoViewIfNeeded()
  const box = await button.boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(320)
})

test('funciona com movimento reduzido', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, '&lista=1')
  await page.locator('.swipe').first().getByRole('checkbox').click()
  await expect(page.locator('.swipe')).toHaveCount(3)
})

test('no computador, as abas viram barra lateral', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 })
  await open(page, '&contas=1')
  const tabs = page.getByRole('navigation', { name: 'Navegação principal' })
  const box = await tabs.boundingBox()
  expect(box!.x).toBeLessThan(20)
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

test('a tela de entrar segue o padrão do iOS', async ({ page }) => {
  await open(page, '&acesso=1')
  await expect(page.getByRole('textbox', { name: 'E-mail' })).toBeVisible()
  await page.getByRole('radio', { name: 'Criar conta' }).click()
  await expect(page.getByRole('textbox', { name: 'Nome de usuário' })).toBeVisible()
})

test('os avatares têm fundo transparente', async ({ page }) => {
  const response = await page.request.get('/avatars/lucas.webp')
  const buf = await response.body()
  // WebP com alfa é VP8L ou VP8X; VP8 puro (lossy sem alfa) não tem transparência
  expect(['VP8L', 'VP8X']).toContain(buf.subarray(12, 16).toString('ascii'))
})
