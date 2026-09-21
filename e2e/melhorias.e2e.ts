import { expect, test } from '@playwright/test'
import { open } from './helpers'

test('adiciona no início e encontra no mercado sem acento', async ({ page }) => {
  await open(page)
  await page.getByRole('textbox', { name: 'Adicionar ao mercado' }).fill('2 maçãs')
  await page.getByRole('button', { name: 'Adicionar à lista' }).click()
  await expect(page.getByRole('status')).toContainText('Maçãs na lista')
  await page.locator('.home-market').click()
  await page.getByRole('searchbox', { name: 'Buscar na lista' }).fill('macas')
  await expect(page.locator('.mrow')).toHaveCount(1)
  await expect(page.locator('.mrow')).toContainText('Maçãs')
  await page.getByRole('button', { name: 'Limpar busca' }).click()
  await expect(page.locator('.mrow')).toHaveCount(5)
})

test('menu abre as configurações em painel separado e devolve o foco', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await expect(page.getByRole('dialog', { name: 'nossa casa' })).toBeVisible()
  await page.getByRole('button', { name: /Lucas/ }).click()
  await expect(page.getByRole('dialog', { name: 'configurações' })).toBeVisible()
  await page.getByRole('button', { name: 'Fechar configurações' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeFocused()
})

test('aparência acompanha o sistema e guarda a escolha do aparelho', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await open(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.getByRole('button', { name: /Lucas/ }).click()
  await page.getByRole('radio', { name: 'claro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await page.evaluate(() => localStorage.getItem('despensa:tema'))).toBe('light')
})

test('navegação e menu funcionam com movimento reduzido', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  await page.locator('.home-market').click()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
  await expect(page.locator('.view.is-home')).toHaveAttribute('inert', '')
  await page.getByRole('button', { name: 'Voltar para o início' }).click()
  await expect(page.locator('.view.is-top')).toHaveCount(0)
})

// redesign de 19/09/2026: no celular, a primeira tela de cada módulo mostra o conteúdo, não o cabeçalho
test('mercado abre no começo da lista, com o primeiro item inteiro', async ({ page }) => {
  await open(page, '&lista=1')
  const first = page.locator('.mrow').first()
  const scroller = await page.locator('.scroll').last().boundingBox()
  const box = await first.boundingBox()
  expect(box!.y).toBeGreaterThanOrEqual(scroller!.y)
  await expect(first).toContainText('Leite')
})

test('contas mostram um bilhete já na primeira tela do iPhone', async ({ page }) => {
  await open(page, '&contas=1')
  const ticket = await page.locator('.ticket-wrap').first().boundingBox()
  const dock = await page.locator('.composer').boundingBox()
  expect(ticket!.y).toBeLessThan(dock!.y)
  // pastas rolam junto com as contas no celular
  await expect(page.locator('.finance-folders.is-compact')).toBeVisible()
})

test('"todo mês" liga dentro do campo e encolhe enquanto digita', async ({ page }) => {
  await open(page, '&contas=1')
  const repeat = page.getByRole('switch', { name: 'todo mês' })
  await repeat.click()
  await expect(repeat).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('textbox', { name: 'Nova conta' }).fill('luz 180 dia 10')
  await expect(page.locator('.repeat-label')).toHaveCount(0)
  await expect(page.locator('.composer-preview')).toContainText('180,00')
})
