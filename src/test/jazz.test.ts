import { describe, expect, it, beforeEach } from 'vitest'
import { CAMINHADA, LICK, freq, proximaNota, reiniciarLick } from '../lib/jazz'

describe('o trio do camarão', () => {
  beforeEach(() => reiniciarLick())

  it('afina pelo lá de 440', () => {
    expect(freq(69)).toBeCloseTo(440, 5)
    expect(freq(81)).toBeCloseTo(880, 5)
    expect(freq(57)).toBeCloseTo(220, 5)
  })

  it('o contrabaixo anda em quatro compassos de quatro tempos', () => {
    expect(CAMINHADA).toHaveLength(16)
    // grave o bastante para ser baixo, e sem salto maior que uma quinta entre passos
    for (const nota of CAMINHADA) expect(nota).toBeGreaterThanOrEqual(40)
    for (const nota of CAMINHADA) expect(nota).toBeLessThanOrEqual(56)
    // caminhar é andar por graus: nenhum passo passa de um tom, nem na volta ao começo
    for (let i = 0; i < CAMINHADA.length; i++) {
      const anterior = CAMINHADA[(i - 1 + CAMINHADA.length) % CAMINHADA.length]
      expect(Math.abs(CAMINHADA[i] - anterior)).toBeLessThanOrEqual(2)
    }
  })

  it('o lick sobe: cada gesto acrescenta a próxima nota', () => {
    const tocadas = LICK.map(() => proximaNota())
    expect(tocadas).toEqual(LICK)
    for (let i = 1; i < tocadas.length; i++) expect(tocadas[i]).toBeGreaterThan(tocadas[i - 1])
  })

  it('depois da última nota o lick recomeça, em vez de travar', () => {
    for (const _ of LICK) proximaNota()
    expect(proximaNota()).toBe(LICK[0])
  })

  it('recomeçar a apresentação recomeça o lick', () => {
    proximaNota()
    proximaNota()
    reiniciarLick()
    expect(proximaNota()).toBe(LICK[0])
  })
})
