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

test('menu tem prévia interativa, fechamento e foco de teclado', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await expect(page.getByRole('dialog', { name: 'nossa casa' })).toBeVisible()
  await page.getByRole('tab', { name: 'contas', exact: true }).click()
  await expect(page.getByRole('tabpanel')).toContainText('uma coisa a menos')
  await page.getByRole('tab', { name: 'contas', exact: true }).press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'desejos' })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeFocused()
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
