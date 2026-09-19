import { expect, test } from '@playwright/test'
import { open, swipe, tapCenter } from './helpers'

test.beforeEach(async ({ page }) => {
  await open(page, '&contas=1')
})

test('pagar pelo canhoto: lê, carimba, rasga e vai para pagas', async ({ page }) => {
  await page.locator('.ticket-stub').first().click()
  await expect(page.locator('.stamp')).toBeVisible()
  await expect(page.locator('.ticket-wrap')).toHaveCount(2, { timeout: 3000 })
  await expect(page.locator('.paid')).toHaveCount(3)
})

test('arrastar para apagar começando no canhoto não paga a conta', async ({ page }) => {
  // bug real: soltar o dedo depois do arrasto contava como toque no canhoto
  await swipe(page, page.locator('.ticket').first(), -120)
  await tapCenter(page, page.locator('.ticket-behind.is-delete').first())
  await expect(page.locator('.ticket-wrap')).toHaveCount(2)
  await expect(page.locator('.paid')).toHaveCount(2)
})

test('apagar conta que se repete pergunta o alcance', async ({ page }) => {
  const aluguel = page.locator('.ticket-wrap', { hasText: 'Aluguel' })
  await swipe(page, aluguel.locator('.ticket'), -120)
  await tapCenter(page, aluguel.locator('.ticket-behind.is-delete'))
  await expect(page.locator('.choice')).toContainText('Essa conta se repete')
  await page.locator('.choice-option.is-danger').click()
  await expect(aluguel).toHaveCount(0)
})

test('editar conta que se repete oferece só deste mês ou em diante', async ({ page }) => {
  await page.locator('.ticket-wrap', { hasText: 'Luz' }).locator('.ticket-title').click()
  const input = page.locator('.edit-card input')
  await expect(input).toHaveValue(/Luz 187,40 dia 20/)
  await input.fill('Luz 213,50 dia 22')
  await expect(page.locator('.edit-preview')).toContainText('213,50')
  await expect(page.locator('.edit-card .choice-option')).toHaveCount(2)
  await page.locator('.edit-card .choice-option').first().click()
  await expect(page.locator('.ticket-wrap', { hasText: 'Luz' })).toContainText('213,50')
})

test('acertamos destaca o cupom', async ({ page }) => {
  await page.locator('.coupon-cut').click()
  await expect(page.locator('.coupon')).toHaveCount(0)
  await expect(page.locator('.coupon-clear')).toBeVisible()
})

test('cria pasta e move várias contas de uma vez', async ({ page }) => {
  await page.getByRole('button', { name: 'Nova pasta' }).click()
  await page.getByPlaceholder('ex.: casa').fill('serviços')
  await page.getByRole('button', { name: 'Cor mint' }).click()
  await page.getByRole('button', { name: 'criar pasta' }).click()
  await expect(page.locator('.folder-row', { hasText: 'serviços' })).toBeVisible()

  await page.getByRole('button', { name: 'selecionar' }).click()
  await page.locator('.ticket-wrap', { hasText: 'Aluguel' }).locator('.ticket-main').click()
  await page.locator('.ticket-wrap', { hasText: 'Luz' }).locator('.ticket-main').click()
  await expect(page.locator('.selection-bar')).toContainText('2 selecionadas')
  await page.getByRole('button', { name: 'mover' }).click()
  await page.locator('.move-destinations button', { hasText: 'serviços' }).click()

  await page.locator('.folder-row', { hasText: 'serviços' }).click()
  await expect(page.locator('.ticket-wrap')).toHaveCount(2)
  await expect(page.locator('.ticket-wrap')).toContainText(['Aluguel', 'Luz'])
})

test('adapta navegação e painel inicial ao desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 })
  await page.reload()
  await expect(page.locator('.finance-folders')).toHaveCSS('width', '292px')
  await expect(page.locator('.folder-select-mode')).toBeVisible()

  await page.goto('/?demo=1')
  await expect(page.locator('.home-dashboard')).toHaveCSS('display', 'grid')
  await expect(page.locator('.home-market')).toBeVisible()
  await expect(page.locator('.home-wishes')).toBeVisible()
})
