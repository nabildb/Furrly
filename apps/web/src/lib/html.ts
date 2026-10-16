/**
 * Escapa texto para meterlo en HTML. Los marcadores de Leaflet (divIcon) se construyen con
 * un string de HTML, así que sin esto un nombre como "<img onerror=...>" se ejecutaría (XSS).
 */
export function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}
