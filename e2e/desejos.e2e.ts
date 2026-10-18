import { expect, test, type Page } from '@playwright/test'
import { open, swipe, tapCenter } from './helpers'

test.beforeEach(async ({ page }) => {
  await open(page, '&desejos=1')
})

const row = (page: Page, name: string) => page.locator('.swipe', { hasText: name })

test('apagar desejo arrastando para a esquerda', async ({ page }) => {
  await swipe(page, page.locator('.swipe-face').first(), -120)
  await tapCenter(page, page.locator('.swipe-trail').first())
  await expect(page.locator('.swipe')).toHaveCount(4)
})

test('o coração mostra quem quer e alterna', async ({ page }) => {
  const heart = row(page, 'Cafeteira').locator('.want')
  await expect(heart).toHaveAttribute('aria-pressed', 'false')
  await heart.click()
  await expect(heart).toHaveAttribute('aria-pressed', 'true')
  await expect(heart.locator('.avatar')).toHaveCount(2)
})

test('editar nome, preço e nível pela folha', async ({ page }) => {
  await row(page, 'Jogo de panelas').locator('.item-name').click()
  const dialog = page.getByRole('dialog', { name: 'Editar desejo' })
  await dialog.getByRole('textbox', { name: 'Editar desejo' }).fill('panelas de ferro 950')
  await dialog.getByRole('radio', { name: 'Quero muito' }).click()
  await dialog.getByRole('button', { name: 'Salvar' }).click()
  await expect(row(page, 'Panelas de ferro')).toContainText('950,00')
  await expect(row(page, 'Panelas de ferro')).toContainText('Quero muito')
})

test('realizar arrastando pergunta quanto foi e lança nas contas', async ({ page }) => {
  await swipe(page, page.locator('.swipe-face').first(), 120)
  const dialog = page.getByRole('dialog', { name: /comprado/ })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Lançar nas contas' }).click()
  await expect(page.locator('.toast')).toContainText('lançado nas contas')
  await expect(page.locator('.section-header', { hasText: 'Já compramos' })).toContainText('2')
})

test('o cofre diz quando cada desejo sai', async ({ page }) => {
  await expect(page.locator('.summary-note')).toContainText('a fila toda sai')
  await expect(row(page, 'Abajur')).toContainText('Sai em')
})

test('quanto guardar por mês muda a previsão', async ({ page }) => {
  const field = page.getByRole('textbox', { name: 'Quanto dá para guardar por mês' })
  await field.click()
  await field.fill('5000')
  await field.press('Enter')
  await expect(page.locator('.summary-note')).toContainText('R$ 5.000,00')
})
