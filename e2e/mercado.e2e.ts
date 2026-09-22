import { expect, test } from '@playwright/test'
import { hold, longPress, open, swipe, tapCenter } from './helpers'

test.beforeEach(async ({ page }) => {
  await open(page, '&lista=1')
})

const row = (page: import('@playwright/test').Page, name: string) => page.locator('.mrow', { hasText: name })

test('adicionar entende quantidade e mostra o emoji', async ({ page }) => {
  await page.locator('.composer-field input').fill('2 banana')
  await expect(page.locator('.composer-emoji')).toHaveText('🍌')
  await page.keyboard.press('Enter')
  await expect(row(page, 'Banana')).toContainText('2')
})

test('pegar tocando, pegar arrastando e devolver do carrinho', async ({ page }) => {
  await page.locator('.mrow-main', { hasText: 'Leite' }).click()
  await expect(row(page, 'Leite')).toHaveCount(0)
  await expect(page.locator('.cart-stack-item')).toHaveCount(3)

  await swipe(page, page.locator('.mrow-face', { hasText: 'Café' }), 110)
  await expect(row(page, 'Café')).toHaveCount(0)

  await page.locator('.cart-head').click()
  await page.locator('.cart-item', { hasText: 'Leite' }).click()
  await expect(row(page, 'Leite')).toHaveCount(1)
})

test('apagar arrastando e desfazer', async ({ page }) => {
  await swipe(page, page.locator('.mrow-face', { hasText: 'Queijo' }), -120)
  await tapCenter(page, row(page, 'Queijo').locator('.mrow-behind.is-delete'))
  await expect(row(page, 'Queijo')).toHaveCount(0)
  await page.locator('.toast button').click()
  await expect(row(page, 'Queijo')).toHaveCount(1)
})

test('toque longo abre reações e não pega o item', async ({ page }) => {
  await longPress(page, page.locator('.mrow-face', { hasText: 'Pão' }))
  await expect(page.locator('.reaction-picker')).toBeVisible()
  await expect(row(page, 'Pão')).toHaveCount(1)
})

test('editar item pelo toque longo', async ({ page }) => {
  await longPress(page, page.locator('.mrow-face', { hasText: 'Pão' }))
  await page.locator('.action-edit').click()
  const input = page.locator('.edit-card input')
  await expect(input).toHaveValue('Pão de forma')
  await input.fill('2 pão integral')
  await page.locator('.edit-card .choice-option').click()
  await expect(row(page, 'Pão integral')).toContainText('2')
})

test('finalizar: o carrinho vai embora e pergunta quanto deu', async ({ page }) => {
  await hold(page, page.locator('.button-hold'), 760)
  // antes de perguntar, a compra rola os créditos; tocar pula
  const credits = page.getByRole('dialog', { name: 'Compra finalizada' })
  await expect(credits).toBeVisible({ timeout: 3000 })
  await expect(credits).toContainText('tomate')
  await credits.getByRole('button', { name: 'pular' }).click()
  await expect(page.locator('.market-bill')).toBeVisible({ timeout: 3000 })
  await expect(page.locator('.cart')).toHaveCount(0)
})
