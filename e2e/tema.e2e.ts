import { expect, test, type Page } from '@playwright/test'

const abrir = async (page: Page, extra = '') => {
  await page.goto(`/?demo=1${extra}`)
  await page.waitForTimeout(900)
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
  await page.waitForTimeout(250)
}

/** Luminância relativa, para comparar texto e fundo sem depender da cor exata. */
const LUZ = `(css) => {
  const hex = css.trim().match(/^#([0-9a-f]{6})$/i)
  const m = hex
    ? [parseInt(hex[1].slice(0, 2), 16), parseInt(hex[1].slice(2, 4), 16), parseInt(hex[1].slice(4, 6), 16)].map(String)
    : (css.match(/[\\d.]+/g) || ['0','0','0'])
  const [r, g, b] = m.slice(0, 3).map(Number).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}`

async function contraste(page: Page, seletorTexto: string, seletorFundo: string) {
  return page.evaluate(([alvo, atras, fn]) => {
    const luz = eval(fn) as (css: string) => number
    const t = document.querySelector(alvo as string)
    const f = document.querySelector(atras as string)
    if (!t || !f) return null
    const a = luz(getComputedStyle(t).color)
    const b = luz(getComputedStyle(f).backgroundColor)
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  }, [seletorTexto, seletorFundo, LUZ])
}

test('no escuro, a pasta selecionada não fica texto da cor do fundo', async ({ page }) => {
  await abrir(page, '&contas=1')
  await expect(page.locator('.folder-row-wrap.is-active')).toBeVisible()
  // o fundo visível da pílula é a peça que desliza, não o botão
  const razao = await contraste(page, '.folder-row-wrap.is-active .folder-row-copy strong', '.folder-active')
  expect(razao).not.toBeNull()
  expect(razao!).toBeGreaterThan(4.5)
})

test('no escuro, a aba selecionada da barra continua legível', async ({ page }) => {
  await abrir(page)
  const razao = await contraste(page, ".app-dock button[aria-current='page'] .app-dock-label", '.app-dock')
  expect(razao).not.toBeNull()
  expect(razao!).toBeGreaterThan(3)
})

test('os avatares têm fundo transparente', async ({ page }) => {
  const resposta = await page.request.get('/avatars/lucas.webp')
  const buf = await resposta.body()
  // WebP com alfa é VP8L ou VP8X; VP8 puro (lossy sem alfa) não tem transparência
  const marca = buf.subarray(12, 16).toString('ascii')
  expect(['VP8L', 'VP8X']).toContain(marca)
})

test('no escuro, o vermelho de apagar aguenta o texto branco em cima', async ({ page }) => {
  await abrir(page, '&contas=1')
  const razao = await page.evaluate((fn) => {
    const luz = eval(fn) as (css: string) => number
    const raiz = getComputedStyle(document.documentElement)
    const a = luz(raiz.getPropertyValue('--danger-on').trim())
    const b = luz(raiz.getPropertyValue('--danger-surface').trim())
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  }, LUZ)
  expect(razao).toBeGreaterThan(4.5)
})
