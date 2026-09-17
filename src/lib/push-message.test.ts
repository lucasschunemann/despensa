import { describe, expect, it } from 'vitest'
import { allowedPushEndpoint, pushMessage } from '../../supabase/functions/_shared/push-message'

describe('mensagens e destinos push', () => {
  it('agrupa itens e preserva o destino de cada módulo', () => {
    const m = pushMessage('item', 'Bela', ['café', 'leite', 'pão'], 'sala')
    expect(m.body).toBe('Bela colocou café e leite e mais 1 na lista.')
    expect(m.url).toBe('/?abrir=lista')
    expect(pushMessage('conta', 'Lucas', ['internet'], 'sala').url).toBe('/?abrir=contas')
    expect(pushMessage('desejo', 'Bela', ['abajur'], 'sala').tag).toBe('despensa-sala-desejos')
  })
  it('recusa SSRF, userinfo, HTTP e hosts parecidos com Apple', () => {
    for (const url of ['https://127.0.0.1/a', 'http://web.push.apple.com/a', 'https://web.push.apple.com.evil.test/a', 'https://user:pass@web.push.apple.com/a', 'https://web.push.apple.com:8443/a']) expect(allowedPushEndpoint(url)).toBe(false)
    expect(allowedPushEndpoint('https://web.push.apple.com/Q123')).toBe(true)
    expect(allowedPushEndpoint('https://fcm.googleapis.com/fcm/send/123')).toBe(true)
  })
})
