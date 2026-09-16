// Vibração é bônus: Android responde, iPhone ignora em silêncio. Nunca é o único feedback.
type Kind = 'light' | 'medium' | 'success'

const PATTERNS: Record<Kind, number | number[]> = {
  light: 8,
  medium: 14,
  success: [12, 45, 20],
}

export function haptic(kind: Kind) {
  const vibrate = navigator.vibrate?.bind(navigator)
  if (!vibrate) return
  try {
    vibrate(PATTERNS[kind])
  } catch {
    /* ignora */
  }
}
