import { expect, test, type Page } from '@playwright/test'
import { open, swipe, tapCenter } from './helpers'

test.beforeEach(async ({ page }) => {
  await open(page, '&lista=1')
})

const row = (page: Page, name: string) => page.locator('.todos .swipe', { hasText: name })

test('adicionar entende a quantidade e mostra o emoji no campo', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Novo item' }).fill('2 banana')
  await expect(page.locator('.composer-chip')).toContainText('🍌')
  await page.keyboard.press('Enter')
  await expect(row(page, 'Banana')).toContainText('2')
})

test('"Novo item" no fim da lista leva ao campo', async ({ page }) => {
  await page.getByRole('button', { name: 'Novo item' }).click()
  await expect(page.getByRole('textbox', { name: 'Novo item' })).toBeFocused()
})

test('marcar a caixa pega o item, e o carrinho devolve', async ({ page }) => {
  await page.getByRole('checkbox', { name: 'Pegar Leite integral' }).click()
  await expect(row(page, 'Leite')).toHaveCount(0)
  await expect(page.getByRole('progressbar', { name: 'Itens no carrinho' })).toHaveAttribute('aria-valuenow', '3')

  await page.getByRole('button', { name: /No carrinho/ }).click()
  await page.getByRole('checkbox', { name: 'Devolver Leite integral à lista' }).click()
  await expect(row(page, 'Leite')).toHaveCount(1)
})

test('pegar arrastando para a direita', async ({ page }) => {
  await swipe(page, row(page, 'Café').locator('.swipe-face'), 120)
  await expect(row(page, 'Café')).toHaveCount(0)
})

test('apagar arrastando para a esquerda e desfazer', async ({ page }) => {
  await swipe(page, row(page, 'Queijo').locator('.swipe-face'), -120)
  await tapCenter(page, row(page, 'Queijo').locator('.swipe-trail'))
  await expect(row(page, 'Queijo')).toHaveCount(0)
  await page.getByRole('button', { name: 'Desfazer' }).click()
  await expect(row(page, 'Queijo')).toHaveCount(1)
})

test('arrastar até o fim apaga direto', async ({ page }) => {
  await swipe(page, row(page, 'Queijo').locator('.swipe-face'), -300)
  await expect(row(page, 'Queijo')).toHaveCount(0)
  await expect(page.locator('.toast')).toContainText('Queijo minas apagado')
})

test('tocar no item abre a página dele, com o mesmo jeito de escrever', async ({ page }) => {
  await row(page, 'Pão').locator('.todo-name').click()
  const dialog = page.getByRole('dialog', { name: 'Item' })
  const input = dialog.getByRole('textbox', { name: 'Editar item' })
  await expect(input).toHaveValue('Pão de forma')
  await input.fill('2 pão integral')
  await expect(dialog.locator('.prop', { hasText: 'Quantidade' })).toContainText('2')
  await dialog.getByRole('button', { name: 'Salvar' }).click()
  await expect(row(page, 'Pão integral')).toContainText('2')
})

test('a página do item manda reação e apaga', async ({ page }) => {
  await row(page, 'Pão').locator('.todo-name').click()
  await page.getByRole('button', { name: 'Enviar ❤️' }).click()
  await expect(page.locator('.reaction-label')).toContainText('Você mandou')
  await row(page, 'Pão').locator('.todo-name').click()
  await page.getByRole('button', { name: 'Apagar item' }).click()
  await expect(row(page, 'Pão')).toHaveCount(0)
})

test('finalizar compra tira o carrinho e lança o valor nas contas', async ({ page }) => {
  await page.getByRole('button', { name: 'Finalizar compra' }).click()
  const dialog = page.getByRole('dialog', { name: 'Finalizar compra' })
  await expect(dialog).toContainText('2 itens saem')
  await dialog.getByRole('textbox', { name: 'Valor' }).fill('123,45')
  await dialog.getByRole('button', { name: 'Finalizar', exact: true }).click()
  await expect(page.getByRole('button', { name: /No carrinho/ })).toHaveCount(0)
  await expect(page.locator('.toast')).toContainText('R$ 123,45')
})
