import { expect, test, type Page } from '@playwright/test'
import { open } from './helpers'

const painel = (page: Page) => page.locator('.ob')

/** Percorre as cinco cenas fazendo o gesto de cada uma. */
async function atravessar(page: Page) {
  const d = painel(page)
  await d.getByRole('button', { name: 'bora' }).click()

  // escrever: tocar num exemplo manda o texto para o destino certo
  await d.getByRole('button', { name: '2 leites' }).click()
  await expect(d.locator('.ob-destino').first()).toHaveClass(/is-cheio/)
  await d.getByRole('button', { name: /continuar|entendeu tudo/ }).click()

  // pegar: marcar um item da lista
  await d.locator('.ob-linha').first().click()
  await expect(d.locator('.ob-linha').first()).toHaveClass(/is-pego/)
  await d.getByRole('button', { name: /continuar|lista zerada/ }).click()

  // pagar: o canhoto rasga e o bilhete fica carimbado
  await d.getByRole('button', { name: 'Pagar a conta' }).click()
  await expect(d.locator('.ob-carimbo')).toBeVisible()
  await d.getByRole('button', { name: 'continuar' }).click()

  // desejar: os dois querem
  const coracao = d.getByRole('button', { name: 'Quero também' })
  await coracao.click()
  await coracao.click()
  await expect(d.locator('.ob-vidro')).toHaveClass(/is-dois/)
  await d.getByRole('button', { name: /continuar|os dois querem/ }).click()
}

test('a apresentação ensina os gestos e entrega no início', async ({ page }) => {
  const errors = await open(page, '&onboarding=1')
  const d = painel(page)
  const progresso = page.getByRole('progressbar', { name: 'Progresso da apresentação' })

  await expect(d).toContainText('despensa')
  await expect(progresso).toHaveAttribute('aria-valuenow', '1')

  await atravessar(page)

  await expect(progresso).toHaveAttribute('aria-valuenow', '6')
  await expect(d).toContainText('a casa é sua')
  await d.getByRole('button', { name: 'começar a usar' }).click()
  await expect(d).toHaveCount(0)
  await expect(page.locator('.home-hello')).toBeVisible()
  expect(errors).toEqual([])
})

test('o botão de avançar só nasce depois do gesto', async ({ page }) => {
  await open(page, '&onboarding=1')
  const d = painel(page)
  await d.getByRole('button', { name: 'bora' }).click()

  // nada de "continuar" antes de mandar alguma coisa
  await expect(d.getByRole('button', { name: /continuar|entendeu tudo/ })).toHaveCount(0)
  await d.getByRole('button', { name: 'luz 180 dia 10' }).click()
  await expect(d.getByRole('button', { name: /continuar|entendeu tudo/ })).toBeVisible()
})

test('arrastar a linha para a direita pega o item, e arrastar não vira toque', async ({ page }) => {
  await open(page, '&onboarding=1')
  const d = painel(page)
  await d.getByRole('button', { name: 'bora' }).click()
  await d.getByRole('button', { name: '2 leites' }).click()
  await d.getByRole('button', { name: /continuar|entendeu tudo/ }).click()

  const linha = d.locator('.ob-linha').first()
  const caixa = await linha.boundingBox()
  if (!caixa) throw new Error('linha sem caixa')

  // arrasto curto: não chega no ponto e não pode virar toque
  await page.mouse.move(caixa.x + 60, caixa.y + caixa.height / 2)
  await page.mouse.down()
  await page.mouse.move(caixa.x + 90, caixa.y + caixa.height / 2, { steps: 6 })
  await page.mouse.up()
  await expect(linha).not.toHaveClass(/is-pego/)

  // arrasto longo: pega
  await page.mouse.move(caixa.x + 60, caixa.y + caixa.height / 2)
  await page.mouse.down()
  await page.mouse.move(caixa.x + 190, caixa.y + caixa.height / 2, { steps: 10 })
  await page.mouse.up()
  await expect(linha).toHaveClass(/is-pego/)
})

test('cabe no menor iPhone suportado', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await open(page, '&onboarding=1')
  await atravessar(page)

  const d = painel(page)
  const botao = await d.getByRole('button', { name: 'começar a usar' }).boundingBox()
  expect(botao && botao.x >= 0 && botao.x + botao.width <= 320).toBe(true)
  expect(botao && botao.y + botao.height <= 568).toBe(true)
})

test('configurações permite reassistir à apresentação', async ({ page }) => {
  const errors = await open(page)
  await page.getByRole('button', { name: 'Abrir configurações' }).click()
  await page.getByRole('button', { name: /reassistir à apresentação/ }).click()

  await expect(page.getByRole('dialog', { name: 'configurações' })).toHaveCount(0)
  const d = painel(page)
  await expect(d).toContainText('de novo, do começo')
  await d.getByRole('button', { name: 'Pular apresentação' }).click()
  await expect(d).toHaveCount(0)
  expect(errors).toEqual([])
})
