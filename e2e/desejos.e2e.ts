import { expect, test, type Page } from '@playwright/test'
import { open, swipe, tapCenter } from './helpers'

test.beforeEach(async ({ page }) => {
  await open(page, '&desejos=1')
})

const card = (page: Page, name: string) => page.locator('.gallery .swipe', { hasText: name })

test('apagar desejo arrastando para a esquerda', async ({ page }) => {
  await swipe(page, page.locator('.gallery .swipe-face').first(), -120)
  await tapCenter(page, page.locator('.gallery .swipe-trail').first())
  await expect(page.locator('.gallery .swipe')).toHaveCount(4)
})

test('o coração mostra quem quer e alterna', async ({ page }) => {
  const heart = card(page, 'Cafeteira').locator('.want')
  await expect(heart).toHaveAttribute('aria-pressed', 'false')
  await heart.click()
  await expect(heart).toHaveAttribute('aria-pressed', 'true')
  await expect(heart.locator('.avatar')).toHaveCount(2)
})

test('editar nome, preço e vontade pela página do desejo', async ({ page }) => {
  await card(page, 'Jogo de panelas').locator('.card-title').click()
  const dialog = page.getByRole('dialog', { name: 'Desejo' })
  await dialog.getByRole('textbox', { name: 'Editar desejo' }).fill('panelas de ferro 950')
  await dialog.getByRole('radio', { name: 'Quero muito' }).click()
  await dialog.getByRole('button', { name: 'Salvar' }).click()
  await expect(card(page, 'Panelas de ferro')).toContainText('950,00')
  await expect(card(page, 'Panelas de ferro')).toContainText('Quero muito')
})

test('realizar arrastando pergunta quanto foi e lança nas contas', async ({ page }) => {
  await swipe(page, page.locator('.gallery .swipe-face').first(), 120)
  const dialog = page.getByRole('dialog', { name: /comprado/ })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Lançar nas contas' }).click()
  await expect(page.locator('.toast')).toContainText('lançado nas contas')
  await expect(page.locator('.group-head', { hasText: 'Já compramos' })).toContainText('2')
})

test('a poupança define quando cada desejo sai', async ({ page }) => {
  await expect(card(page, 'Abajur')).toContainText('Sai em')
  await page.getByRole('button', { name: 'Quanto dá para guardar por mês' }).click()
  const field = page.getByRole('textbox', { name: 'Quanto dá para guardar por mês' })
  await field.fill('5000')
  await field.press('Enter')
  await expect(page.locator('.prop', { hasText: 'Fila completa' })).toContainText(/Já dá|[A-Z]/)
  await expect(page.locator('.prop', { hasText: 'Poupança' })).toContainText('5.000,00')
})
