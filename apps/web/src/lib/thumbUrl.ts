/**
 * Miniatura de una foto, para pintarla pequeña (marcadores del mapa, tarjetas...): en un marcador
 * de 30 px no tiene sentido descargar la foto de 1600 px, y el mapa puede mostrar 100 a la vez.
 * Las fotos que tienen miniatura llevan `-t` en el nombre (ver uploadImage): las anteriores y las
 * de fuera siguen igual, así que esto nunca apunta a un archivo que no exista.
 */
export function thumbUrl(url: string) {
  return url.replace(/-t(\.\w+)$/, '-thumb$1').replace(/\/demo\/([^/]+)$/, '/demo/thumbs/$1')
}
