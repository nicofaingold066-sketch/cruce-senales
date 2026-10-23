// En esta carga de la página ya se vio que la sesión tiene espacios: la entrada no vuelve a preguntar al servidor.
let tiene = false

export function conEspacios() {
  return tiene
}

export function marcarConEspacios() {
  tiene = true
}
