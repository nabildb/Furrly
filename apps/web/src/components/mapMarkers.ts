import L from 'leaflet'
import { escapeHtml } from '../lib/html'
import { reportColors, SIGHTING_COLOR, type ReportType } from '../lib/reports'

// Marcadores HTML (L.divIcon) con los estilos del diseño C. El ancla está en [0,0] y el
// contenido se centra con transform, así no hay que conocer el ancho del texto de antemano.

const PAW_SVG =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="16" rx="5" ry="4"/><circle cx="6" cy="10" r="2.2"/><circle cx="18" cy="10" r="2.2"/><circle cx="9.3" cy="6" r="2.2"/><circle cx="14.7" cy="6" r="2.2"/></svg>'

const softColors: Record<ReportType, string> = { lost: '#F6D9C8', found: '#D5E2F5' }

/** Pastilla con foto y nombre (pantalla "Avisos cerca"). */
export function reportPillIcon(type: ReportType, label: string, photoUrl: string | null, selected: boolean) {
  const color = reportColors[type]
  const photo = photoUrl
    ? `<img src="${escapeHtml(photoUrl)}" alt="" style="width:100%;height:100%;object-fit:cover">`
    : `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;color:${color}">${PAW_SVG}</span>`
  return L.divIcon({
    className: 'furrly-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<div style="position:absolute;transform:translate(-50%,-50%) scale(${selected ? 1.12 : 1});transition:transform .15s;display:flex;align-items:center;gap:6px;padding:5px 12px 5px 5px;border-radius:22px;background:${color};color:#fff;font-weight:800;font-size:14px;white-space:nowrap;box-shadow:0 6px 14px ${color}59${selected ? ',0 0 0 3px #fff,0 0 0 5px ' + color : ''}">
      <span style="width:30px;height:30px;border-radius:15px;overflow:hidden;background:${softColors[type]};border:2px solid #fff;box-sizing:border-box;flex:none">${photo}</span>${escapeHtml(label)}
    </div>`,
  })
}

/** Punto oscuro con halo: el centro de la búsqueda (tu ubicación o la zona elegida). */
export const searchCenterIcon = L.divIcon({
  className: 'furrly-marker',
  iconSize: [0, 0],
  iconAnchor: [0, 0],
  html: '<div style="position:absolute;transform:translate(-50%,-50%);width:24px;height:24px;border-radius:12px;background:#1B2430;border:4px solid #fff;box-sizing:border-box;box-shadow:0 0 0 10px rgba(27,36,48,.15)"></div>',
})

/** Círculo de color con borde blanco: punto donde se perdió o se encontró. */
export function originIcon(type: ReportType) {
  return L.divIcon({
    className: 'furrly-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<div style="position:absolute;transform:translate(-50%,-50%);width:28px;height:28px;border-radius:14px;background:${reportColors[type]};border:3px solid #fff;box-sizing:border-box;box-shadow:0 2px 6px rgba(27,36,48,.3)"></div>`,
  })
}

/** Avistamiento numerado (ámbar con número en tinta). */
export function sightingIcon(n: number) {
  return L.divIcon({
    className: 'furrly-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<div style="position:absolute;transform:translate(-50%,-50%);width:26px;height:26px;border-radius:13px;background:${SIGHTING_COLOR};border:3px solid #fff;box-sizing:border-box;font-size:12px;font-weight:800;color:#1B2430;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(27,36,48,.3)">${n}</div>`,
  })
}
