import { expect, test, type Page } from '@playwright/test'
import { open, swipe, tapCenter } from './helpers'

test.beforeEach(async ({ page }) => {
  await open(page, '&lista=1')
})

const row = (page: Page, name: string) => page.locator('.swipe', { hasText: name })

test('adicionar entende a quantidade e mostra o emoji no campo', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Novo item' }).fill('2 banana')
  await expect(page.locator('.composer-chip')).toContainText('🍌')
  await page.keyboard.press('Enter')
  await expect(row(page, 'Banana')).toContainText('2')
})

test('pegar tocando no círculo, devolver do carrinho', async ({ page }) => {
  await row(page, 'Leite').getByRole('checkbox').click()
  await expect(row(page, 'Leite')).toHaveCount(0)
  await expect(page.getByRole('progressbar', { name: 'Itens no carrinho' })).toHaveAttribute('aria-valuenow', '3')

  await page.locator('.cart-head').click()
  await page.getByRole('checkbox', { name: 'Devolver Leite integral à lista' }).click()
  await expect(row(page, 'Leite')).toHaveCount(1)
})

test('pegar arrastando para a direita', async ({ page }) => {
  await swipe(page, row(page, 'Café').locator('.swipe-face'), 120)
  await expect(row(page, 'Café')).toHaveCount(0)
})

test('apagar arrastando para a esquerda e desfazer', async ({ page }) => {
  // o arrasto começa em cima do círculo: soltar o dedo não pode virar toque nele
  await swipe(page, row(page, 'Queijo').locator('.swipe-face'), -120)
  await expect(page.getByRole('progressbar', { name: 'Itens no carrinho' })).toHaveAttribute('aria-valuenow', '2')
  await tapCenter(page, row(page, 'Queijo').locator('.swipe-trail'))
  await expect(row(page, 'Queijo')).toHaveCount(0)
  await page.locator('.toast button').click()
  await expect(row(page, 'Queijo')).toHaveCount(1)
})

test('tocar na linha abre a edição, no mesmo formato de escrever', async ({ page }) => {
  await row(page, 'Pão').locator('.item-name').click()
  const input = page.getByRole('textbox', { name: 'Editar item' })
  await expect(input).toHaveValue('Pão de forma')
  await input.fill('2 pão integral')
  await page.getByRole('button', { name: 'salvar' }).click()
  await expect(row(page, 'Pão integral')).toContainText('2')
})

test('a edição também manda reação e apaga', async ({ page }) => {
  await row(page, 'Pão').locator('.item-name').click()
  await page.getByRole('button', { name: 'Enviar ❤️' }).click()
  await expect(page.locator('.reaction-label')).toContainText('você mandou')
  await row(page, 'Pão').locator('.item-name').click()
  await page.getByRole('button', { name: 'apagar item' }).click()
  await expect(row(page, 'Pão')).toHaveCount(0)
})

test('finalizar compra tira o carrinho e lança o valor nas contas', async ({ page }) => {
  await page.getByRole('button', { name: 'finalizar compra' }).click()
  const dialog = page.getByRole('dialog', { name: 'finalizar compra' })
  await expect(dialog).toContainText('2 itens pegos')
  await dialog.getByRole('textbox', { name: 'Valor' }).fill('123,45')
  await dialog.getByRole('button', { name: 'finalizar' }).click()
  await expect(page.locator('.cart')).toHaveCount(0)
  await expect(page.locator('.toast')).toContainText('R$ 123,45')
})
