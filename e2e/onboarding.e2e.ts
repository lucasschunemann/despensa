import { expect, test } from '@playwright/test'
import { open } from './helpers'

test('apresentação explica o produto e entrega o usuário no início', async ({ page }) => {
  const errors = await open(page, '&onboarding=1')
  const dialog = page.locator('.onboarding')
  const progress = page.getByRole('progressbar', { name: 'Progresso da apresentação' })

  await expect(dialog).toContainText('bem-vindo à despensa')
  await expect(progress).toHaveAttribute('aria-valuenow', '1')

  const next = dialog.getByRole('button', { name: 'começar' })
  await next.click()
  await expect(dialog).toContainText('uma entrada. três destinos.')
  await expect(progress).toHaveAttribute('aria-valuenow', '2')

  for (const title of ['mudou aqui, apareceu lá', 'cada coisa encontra seu lugar', 'a rotina fica mais leve']) {
    await dialog.getByRole('button', { name: 'continuar' }).click()
    await expect(dialog).toContainText(title)
  }

  await expect(progress).toHaveAttribute('aria-valuenow', '5')
  await dialog.getByRole('button', { name: 'abrir minha despensa' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('.home-hello')).toBeVisible()
  expect(errors).toEqual([])
})

test('configurações permite reassistir à apresentação', async ({ page }) => {
  const errors = await open(page)
  await page.getByRole('button', { name: 'Abrir configurações' }).click()
  await page.getByRole('button', { name: /reassistir à apresentação/ }).click()

  await expect(page.getByRole('dialog', { name: 'configurações' })).toHaveCount(0)
  const dialog = page.locator('.onboarding')
  await expect(dialog).toContainText('a casa toda em um só ritmo')
  await expect(dialog.getByRole('button', { name: 'Pular apresentação' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Pular apresentação' }).click()
  await expect(dialog).toHaveCount(0)
  expect(errors).toEqual([])
})
