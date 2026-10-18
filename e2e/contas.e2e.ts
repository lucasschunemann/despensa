import { expect, test, type Page } from '@playwright/test'
import { open, swipe, tapCenter } from './helpers'

test.beforeEach(async ({ page }) => {
  await open(page, '&contas=1')
})

const row = (page: Page, name: string) => page.locator('.swipe', { hasText: name })

test('pagar pelo círculo move a conta para as pagas', async ({ page }) => {
  await expect(page.locator('.section-head', { hasText: 'a pagar' })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Pagar Academia' }).click()
  await expect(page.getByRole('checkbox', { name: 'Desmarcar Academia' })).toBeVisible()
  await expect(page.locator('.section-head', { hasText: 'pagas' })).toContainText('3')
})

test('pagar arrastando para a direita', async ({ page }) => {
  await swipe(page, row(page, 'Luz').locator('.swipe-face'), 120)
  await expect(page.getByRole('checkbox', { name: 'Desmarcar Luz' })).toBeVisible()
})

test('arrastar para apagar começando no círculo não paga a conta', async ({ page }) => {
  // bug real: soltar o dedo depois do arrasto contava como toque no círculo
  await swipe(page, row(page, 'Academia').locator('.swipe-face'), -120)
  await tapCenter(page, row(page, 'Academia').locator('.swipe-trail'))
  await expect(row(page, 'Academia')).toHaveCount(0)
  await expect(page.locator('.section-head', { hasText: 'pagas' })).toContainText('2')
})

test('apagar conta que se repete pergunta o alcance', async ({ page }) => {
  await swipe(page, row(page, 'Aluguel').locator('.swipe-face'), -120)
  await tapCenter(page, row(page, 'Aluguel').locator('.swipe-trail'))
  const dialog = page.getByRole('dialog', { name: /apagar Aluguel/ })
  await expect(dialog).toContainText('se repete todo mês')
  await dialog.getByRole('button', { name: /em diante/ }).click()
  await expect(row(page, 'Aluguel')).toHaveCount(0)
})

test('editar conta que se repete oferece só deste mês ou em diante', async ({ page }) => {
  await row(page, 'Luz').locator('.item-name').click()
  const input = page.getByRole('textbox', { name: 'Editar conta' })
  await expect(input).toHaveValue(/Luz 187,40 dia 20/)
  await input.fill('Luz 213,50 dia 22')
  const dialog = page.getByRole('dialog', { name: 'editar conta' })
  await expect(dialog.locator('.field-hint').first()).toContainText('213,50')
  await expect(dialog.getByRole('button', { name: /^só de/ })).toBeVisible()
  await dialog.getByRole('button', { name: /em diante/ }).click()
  await expect(row(page, 'Luz')).toContainText('213,50')
})

test('mudar a divisão pela edição', async ({ page }) => {
  await row(page, 'Luz').locator('.item-name').click()
  await page.getByRole('radio', { name: /só Bela/ }).click()
  await page.keyboard.press('Escape')
  await expect(row(page, 'Luz')).toContainText('só Bela')
})

test('acertamos zera a dívida', async ({ page }) => {
  await page.getByRole('button', { name: 'acertamos' }).click()
  await expect(page.locator('.debt')).toHaveCount(0)
  await expect(page.locator('.quits')).toBeVisible()
})

test('cria pasta e move várias contas de uma vez', async ({ page }) => {
  await page.getByRole('button', { name: 'Nova pasta' }).click()
  await page.getByRole('textbox', { name: 'Nome da pasta' }).fill('serviços')
  await page.getByRole('radio', { name: 'Cor mint' }).click()
  await page.getByRole('button', { name: 'criar pasta' }).click()
  await expect(page.locator('.chip', { hasText: 'serviços' })).toBeVisible()

  await page.getByRole('button', { name: 'selecionar' }).click()
  await row(page, 'Aluguel').locator('.item-name').click()
  await row(page, 'Luz').locator('.item-name').click()
  await expect(page.locator('.selection-bar')).toContainText('2 selecionadas')
  await page.getByRole('button', { name: 'mover' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'serviços' }).click()

  await page.locator('.chip', { hasText: 'serviços' }).click()
  await expect(page.locator('.swipe')).toHaveCount(2)
  await expect(page.locator('.swipe')).toContainText(['Aluguel', 'Luz'])
})

test('"todo mês" liga dentro do campo e some o rótulo enquanto digita', async ({ page }) => {
  const repeat = page.getByRole('switch', { name: 'todo mês' })
  await repeat.click()
  await expect(repeat).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('textbox', { name: 'Nova conta' }).fill('luz 180 dia 10')
  await expect(repeat.locator('span')).toHaveCount(0)
  await expect(page.locator('.composer-chip')).toContainText('180,00')
})

test('mostra conta já na primeira tela e mantém o campo acima da barra', async ({ page }) => {
  const first = await page.locator('.swipe').first().boundingBox()
  const composer = await page.locator('.composer').boundingBox()
  const tabs = await page.getByRole('navigation', { name: 'Navegação principal' }).boundingBox()
  expect(first!.y).toBeLessThan(composer!.y)
  expect(composer!.y + composer!.height).toBeLessThanOrEqual(tabs!.y + 1)
})

test('sheet cabe acima do teclado', async ({ page }) => {
  await page.getByRole('button', { name: 'Nova pasta' }).click()
  await expect(page.getByRole('textbox', { name: 'Nome da pasta' })).toBeFocused()
  // é o mesmo valor que useViewportFit escreve quando a visualViewport encolhe com o teclado
  await page.evaluate(() => document.documentElement.style.setProperty('--app-height', '430px'))
  const sheet = page.locator('.sheet')
  await expect(sheet).toBeVisible()
  // espera a mola assentar
  await expect.poll(async () => { const b = await sheet.boundingBox(); return b ? Math.round(b.y + b.height) : 0 }).toBeLessThanOrEqual(431)
  const box = await sheet.boundingBox()
  expect(box!.y).toBeGreaterThanOrEqual(0)
})
