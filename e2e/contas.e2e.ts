import { expect, test, type Page } from '@playwright/test'
import { open, swipe, tapCenter } from './helpers'

test.beforeEach(async ({ page }) => {
  await open(page, '&contas=1')
})

const row = (page: Page, name: string) => page.locator('.table .swipe', { hasText: name })
const paidGroup = (page: Page) => page.locator('.group-head', { hasText: 'Pagas' })

test('marcar a caixa paga a conta', async ({ page }) => {
  await page.getByRole('checkbox', { name: 'Pagar Academia' }).click()
  await expect(page.getByRole('checkbox', { name: 'Desmarcar Academia' })).toBeVisible()
  await expect(paidGroup(page)).toContainText('3')
})

test('pagar arrastando para a direita', async ({ page }) => {
  await swipe(page, row(page, 'Luz').locator('.swipe-face'), 120)
  await expect(page.getByRole('checkbox', { name: 'Desmarcar Luz' })).toBeVisible()
})

test('arrastar para apagar não vira toque no que estava embaixo do dedo', async ({ page }) => {
  // bug real: soltar o dedo depois do arrasto contava como toque e pagava a conta
  await swipe(page, row(page, 'Academia').locator('.swipe-face'), -120)
  await tapCenter(page, row(page, 'Academia').locator('.swipe-trail'))
  await expect(row(page, 'Academia')).toHaveCount(0)
  await expect(paidGroup(page)).toContainText('2')
})

test('apagar conta que se repete pergunta o alcance', async ({ page }) => {
  await swipe(page, row(page, 'Aluguel').locator('.swipe-face'), -120)
  await tapCenter(page, row(page, 'Aluguel').locator('.swipe-trail'))
  const dialog = page.getByRole('alertdialog', { name: 'Apagar Aluguel?' })
  await expect(dialog).toContainText('se repete todo mês')
  await dialog.getByRole('button', { name: 'Esta e as próximas' }).click()
  await expect(row(page, 'Aluguel')).toHaveCount(0)
})

test('editar conta que se repete pergunta se vale só para este mês', async ({ page }) => {
  await row(page, 'Luz').locator('.bill-name strong').click()
  const dialog = page.getByRole('dialog', { name: 'Conta' })
  const input = dialog.getByRole('textbox', { name: 'Editar conta' })
  await expect(input).toHaveValue(/Luz 187,40 dia 20/)
  await input.fill('Luz 213,50 dia 22')
  await expect(dialog.locator('.prop', { hasText: 'Valor' })).toContainText('213,50')
  await dialog.getByRole('button', { name: 'Salvar' }).click()
  const ask = page.getByRole('alertdialog')
  await expect(ask.getByRole('button', { name: /^Só em/ })).toBeVisible()
  await ask.getByRole('button', { name: /em diante/ }).click()
  await expect(row(page, 'Luz')).toContainText('213,50')
})

test('mudar a divisão pela página da conta', async ({ page }) => {
  await row(page, 'Luz').locator('.bill-name strong').click()
  await page.getByRole('radio', { name: 'Só Bela' }).click()
  await page.keyboard.press('Escape')
  await expect(row(page, 'Luz')).toContainText('Só Bela')
})

test('acertar zera a dívida', async ({ page }) => {
  await page.getByRole('button', { name: 'Acertar' }).click()
  await expect(page.locator('.quits')).toBeVisible()
})

test('cria pasta e move várias contas de uma vez', async ({ page }) => {
  await page.getByRole('button', { name: 'Nova pasta' }).click()
  await page.getByRole('textbox', { name: 'Nome da pasta' }).fill('serviços')
  await page.getByRole('radio', { name: 'Cor verde' }).click()
  await page.getByRole('button', { name: 'Criar pasta' }).click()
  await expect(page.locator('.view-tab', { hasText: 'serviços' })).toBeVisible()

  await page.getByRole('button', { name: 'Selecionar' }).click()
  await row(page, 'Aluguel').locator('.bill-name strong').click()
  await row(page, 'Luz').locator('.bill-name strong').click()
  await expect(page.locator('.selection-bar')).toContainText('2 selecionadas')
  await page.getByRole('button', { name: 'Mover' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'serviços' }).click()

  await page.locator('.view-tab', { hasText: 'serviços' }).click()
  await expect(page.locator('.table .swipe')).toHaveCount(2)
  await expect(page.locator('.table .swipe')).toContainText(['Aluguel', 'Luz'])
})

test('"Todo mês" liga dentro do campo e some o rótulo enquanto digita', async ({ page }) => {
  const repeat = page.getByRole('switch', { name: 'Todo mês' })
  await repeat.click()
  await expect(repeat).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('textbox', { name: 'Nova conta' }).fill('luz 180 dia 10')
  await expect(repeat.locator('span')).toHaveCount(0)
  await expect(page.locator('.composer-chip')).toContainText('180,00')
})

test('o mês muda pelas setas e volta para hoje', async ({ page }) => {
  await page.getByRole('button', { name: 'Próximo mês' }).click()
  await page.getByRole('button', { name: 'Hoje' }).click()
  await expect(page.getByRole('button', { name: 'Hoje' })).toHaveCount(0)
})

test('a folha cabe acima do teclado', async ({ page }) => {
  await page.getByRole('button', { name: 'Nova pasta' }).click()
  await expect(page.getByRole('textbox', { name: 'Nome da pasta' })).toBeFocused()
  // é o mesmo valor que useViewportFit escreve quando a visualViewport encolhe com o teclado
  await page.evaluate(() => document.documentElement.style.setProperty('--app-height', '430px'))
  const sheet = page.locator('.sheet')
  await expect.poll(async () => { const b = await sheet.boundingBox(); return b ? Math.round(b.y + b.height) : 0 }).toBeLessThanOrEqual(431)
  const box = await sheet.boundingBox()
  expect(box!.y).toBeGreaterThanOrEqual(0)
})
