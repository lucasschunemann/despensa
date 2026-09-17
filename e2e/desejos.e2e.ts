import { expect, test } from '@playwright/test'
import { open, swipe, tapCenter } from './helpers'

test.beforeEach(async ({ page }) => {
  await open(page, '&desejos=1')
})

test('apagar desejo arrastando (a camada que flutua não pode engolir o toque)', async ({ page }) => {
  await swipe(page, page.locator('.wish-face').first(), -120)
  await tapCenter(page, page.locator('.wish .row-delete').first())
  await expect(page.locator('.wish')).toHaveCount(4)
})

test('coração dos dois acende o cartão', async ({ page }) => {
  const cafeteira = page.locator('.wish', { hasText: 'Cafeteira' })
  await expect(cafeteira).not.toHaveClass(/is-loved/)
  await cafeteira.locator('.wish-hearts').click()
  await expect(cafeteira).toHaveClass(/is-loved/)
})

test('renomear tocando no nome', async ({ page }) => {
  await page.locator('.wish', { hasText: 'Jogo de panelas' }).locator('.wish-title').click()
  const input = page.locator('.inline-text-input')
  await input.fill('panelas de ferro')
  await input.press('Enter')
  await expect(page.locator('.wish', { hasText: 'Panelas de ferro' })).toHaveCount(1)
})

test('realizar arrastando pergunta quanto foi', async ({ page }) => {
  await swipe(page, page.locator('.wish-face').first(), 110)
  await expect(page.locator('.market-bill')).toBeVisible({ timeout: 3000 })
  await expect(page.locator('.wish.is-bought')).toHaveCount(2)
})
