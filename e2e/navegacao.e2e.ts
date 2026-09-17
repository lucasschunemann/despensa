import { expect, test } from '@playwright/test'
import { edgeSwipe, open } from './helpers'

test('abre sempre no início, mesmo com módulo no endereço', async ({ page }) => {
  await page.goto('/?demo=1#contas')
  await expect(page.locator('.hello')).toBeVisible()
})

test('abre um módulo, volta pela seta e volta arrastando da borda', async ({ page }) => {
  const errors = await open(page)
  await page.locator('.home-bills').click()
  await expect(page.locator('.ticket-wrap')).toHaveCount(3)

  await page.locator('.wordmark-button').click()
  await expect(page.locator('.view.is-top')).toHaveCount(0)

  await page.locator('.home-market').click()
  await expect(page.locator('.mrow')).toHaveCount(4)
  // a borda anda junto com a tela: só dá para puxar depois que ela chega
  await expect(page.locator('.view.is-top')).toHaveCSS('transform', 'none')
  await edgeSwipe(page, 280)
  await expect(page.locator('.view.is-top')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('menu troca de módulo', async ({ page }) => {
  await open(page, '&lista=1')
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.locator('.module', { hasText: 'desejos' }).click()
  await expect(page.locator('.wish')).toHaveCount(5)
})
