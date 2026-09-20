import { describe, expect, it } from 'vitest'
import { buildAuthRedirect, PRODUCTION_APP_URL } from './auth-url'

describe('redirecionamento de autenticação', () => {
  it('troca uma URL protegida de preview pela URL pública', () => {
    expect(buildAuthRedirect(
      'https://despensa-egzb9242k-lucafluids-projects.vercel.app/?sala=casa123',
      'confirmation',
    )).toBe(`${PRODUCTION_APP_URL}?sala=casa123&auth=confirmed`)
  })

  it('mantém localhost nos testes e marca recuperação de senha', () => {
    expect(buildAuthRedirect('http://localhost:5180/?demo=1', 'recovery'))
      .toBe('http://localhost:5180/?recovery=1')
  })

  it('aceita um domínio público configurado', () => {
    expect(buildAuthRedirect('https://preview.vercel.app/', 'oauth', 'https://app.exemplo.com'))
      .toBe('https://app.exemplo.com/')
  })
})
