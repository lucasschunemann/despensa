import { expect, test } from '@playwright/test'
import { open } from './helpers'

test('a luz da casa muda com a hora e nunca pega toque', async ({ page }) => {
  await open(page, '&hora=8')
  const light = page.locator('.atmosphere')
  await expect(light).toHaveClass(/is-dia/)
  await expect(light).toHaveCSS('pointer-events', 'none')
  // o toque atravessa a luz e chega no módulo
  await page.locator('.home-market').click()
  await expect(page.locator('.mrow').first()).toBeVisible()

  await open(page, '&hora=23')
  await expect(page.locator('.atmosphere')).toHaveClass(/is-noite/)
  await expect(page.locator('.atmosphere-window')).toHaveCount(0)
})

test('o camarão do início toca e solta notas', async ({ page }) => {
  await open(page)
  // o camarão flutua sem parar, então o toque é de dedo, sem esperar ele ficar parado
  const box = (await page.getByRole('button', { name: 'Tocar o saxofone do camarão' }).boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.locator('.shrimp-note').first()).toBeVisible()
})

test('o início termina no colofão da edição do dia, com a lua', async ({ page }) => {
  await open(page)
  const colophon = page.locator('.colophon')
  await colophon.scrollIntoViewIfNeeded()
  await expect(colophon).toContainText(/nº \d{3}/)
  await expect(colophon).toContainText(/lua|quarto|gibosa/)
})

test('o letreiro de abertura diz o que está carregando', async ({ page }) => {
  await open(page, '&abertura=1')
  await expect(page.getByRole('status', { name: 'abrindo sua casa…' })).toBeVisible()
})

test('com movimento reduzido, finalizar pula os créditos e pergunta o valor', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, '&lista=1')
  const button = page.locator('.button-hold')
  await button.scrollIntoViewIfNeeded()
  const box = (await button.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down(); await page.waitForTimeout(760); await page.mouse.up()
  await expect(page.locator('.market-bill')).toBeVisible({ timeout: 3000 })
  await expect(page.getByRole('dialog', { name: 'Compra finalizada' })).toHaveCount(0)
})
