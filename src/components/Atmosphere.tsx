/**
 * O grão do papel, por cima de tudo e sem pegar toque. Fixo e rasterizado uma vez,
 * quase invisível: é o que tira o "digital demais" do branco.
 * (A sombra de janela que andava com o sol saiu a pedido do Lucas: distraía.)
 */
export function Atmosphere() {
  return (
    <div className="atmosphere" aria-hidden>
      <div className="atmosphere-grain" />
    </div>
  )
}
