import * as interfaces from "../main/interfaces";

export function _isUserTripOwner(
  viagemID: string,
  usuario: interfaces.Usuario
) {
  const viagens = usuario.viagens;

  console.log('viagens: ' + viagens)
  console.log('viagemID: ' + viagemID)

  for (let i = 0; i < viagens.length; i++) {
    const viagem = viagens[i];
    console.log('viagem: ' + viagens)
    console.log('viagem._path.segments[1]: ' + viagem._path.segments[1])
    if (viagem._path.segments[1] == viagemID) {
      return true;
    }
  }

  return false;
}

export function _isUserTripEditor(viagem: interfaces.Viagem, uid: string) {
  const editores = viagem.compartilhamento.editores;

  for (let i = 0; i < editores.length; i++) {
    const editor = editores[i];
    if (editor._path.segments[1] === uid) {
      return true;
    }
  }

  return false;
}

export function _isUserPlacesOwner(
  placesID: string,
  usuario: interfaces.Usuario
) {
  const places = usuario.passeios;

  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    if (place._path.segments[1] === placesID) {
      return true;
    }
  }

  return false;
}
