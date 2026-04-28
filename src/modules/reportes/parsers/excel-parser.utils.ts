import * as XLSX from 'xlsx';

export const HORA_ORDER = [
  '12 AM', '01 AM', '02 AM', '03 AM', '04 AM', '05 AM',
  '06 AM', '07 AM', '08 AM', '09 AM', '10 AM', '11 AM',
  '12 PM', '01 PM', '02 PM', '03 PM', '04 PM', '05 PM',
  '06 PM', '07 PM', '08 PM', '09 PM', '10 PM', '11 PM',
];

const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function mesLabel(mesKey: string): string {
  const parts = mesKey.split('-');
  if (parts.length !== 2) return mesKey;
  const nombre = MESES_NOMBRES[parseInt(parts[1], 10) - 1] || parts[1];
  return `${nombre} ${parts[0]}`;
}

export function fmtHora(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${String(h).padStart(2, '0')} AM`;
  if (h === 12) return '12 PM';
  return `${String(h - 12).padStart(2, '0')} PM`;
}

export function catHora(hora: string): string {
  if (['12 PM', '01 PM', '02 PM', '03 PM', '04 PM', '05 PM', '06 PM', '07 PM'].includes(hora)) return 'Tarde';
  if (['08 PM', '09 PM', '10 PM'].includes(hora)) return 'Noche Alta';
  if (['11 PM', '12 AM', '01 AM'].includes(hora)) return 'Noche Media';
  return 'Madrugada';
}

export function normalizeKey(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/** Decodifica entidades HTML que XLSX genera al leer archivos .xls binarios (p.ej. &Ntilde; → Ñ) */
export function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&Ntilde;/g, 'Ñ').replace(/&ntilde;/g, 'ñ')
    .replace(/&Aacute;/g, 'Á').replace(/&aacute;/g, 'á')
    .replace(/&Eacute;/g, 'É').replace(/&eacute;/g, 'é')
    .replace(/&Iacute;/g, 'Í').replace(/&iacute;/g, 'í')
    .replace(/&Oacute;/g, 'Ó').replace(/&oacute;/g, 'ó')
    .replace(/&Uacute;/g, 'Ú').replace(/&uacute;/g, 'ú')
    .replace(/&Uuml;/g, 'Ü').replace(/&uuml;/g, 'ü')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

/** Extrae la hora (0-23) de cualquier valor de celda. Retorna -1 si no puede. */
export function extractHour(raw: unknown, date1904 = false): number {
  if (raw === null || raw === undefined || raw === '') return -1;

  if (typeof raw === 'string') {
    const s = raw.trim();
    // "1:32:05 p. m." / "1:32:05 a. m." (formato colombiano con puntos y espacios)
    const mColPM = s.match(/(\d{1,2}):(\d{1,2})(?::\d{1,2})?\s*p\.\s*m\./i);
    const mColAM = s.match(/(\d{1,2}):(\d{1,2})(?::\d{1,2})?\s*a\.\s*m\./i);
    if (mColPM) { let h = parseInt(mColPM[1]); if (h < 12) h += 12; return h; }
    if (mColAM) { let h = parseInt(mColAM[1]); if (h === 12) h = 0; return h; }
    // "11:59 PM" / "01:32:05 AM"
    const mAMPM = s.match(/(\d{1,2}):(\d{1,2})(?::\d{1,2})?\s*(AM|PM)/i);
    if (mAMPM) {
      let h = parseInt(mAMPM[1]);
      const ampm = mAMPM[3].toUpperCase();
      if (ampm === 'AM' && h === 12) h = 0;
      else if (ampm === 'PM' && h !== 12) h += 12;
      return h;
    }
    // Buscar último token con formato HH:mm o HH:mm:ss (cubre "dd/MM/yyyy HH:mm:ss")
    const tokens = s.split(/[\s\t]/);
    for (let i = tokens.length - 1; i >= 0; i--) {
      const m24 = tokens[i].match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
      if (m24) { const h = parseInt(m24[1]); if (h >= 0 && h <= 23) return h; }
    }
    return -1;
  }

  if (typeof raw === 'number' && isFinite(raw) && raw >= 0) {
    if (raw < 1) return Math.floor(raw * 24); // fracción pura de tiempo (0.0639 → 1)
    return XLSX.SSF.parse_date_code(raw, { date1904 }).H;
  }

  return -1;
}

export function assignRelacionPlatos(producto: string, categoria: string): string {
  const p = producto.toUpperCase();
  const cat = categoria.toUpperCase();

  if (/AGUA|GASEOSA|JUGO|LIMONADA|\bSODA\b|GINGER|CAFE\b|CAPUCHINO|EXPRESO|AROMATICA|MOCCACHIP|MICHELADO ESCARCHADO/.test(p)) return 'ADICIONALES';

  if (cat === 'BEBIDA') {
    if (/CERVEZA|CLUB COLOMBIA/.test(p)) return 'CERVEZAS';
    if (/\bMICHELADO\b/.test(p)) return 'CERVEZAS';
    if (/VINO|SANGRIA|BOT\.VINO/.test(p)) return 'VINO';
    if (/\bTRAGO\b/.test(p)) {
      if (/HENNESSY|JACK DANIEL|JHONNIE|GREY GOOSE|BAILEY|AMARETTO|DON JULIO|ZACAPA/.test(p)) return 'LICORES INTERNACIONALES';
      if (/MEDELLIN|RON MEDELLIN/.test(p)) return 'LICORES NACIONALES';
      return 'LICORES INTERNACIONALES';
    }
    if (/MEDELLIN.*750/.test(p)) return 'LICORES NACIONALES';
    if (/COCTEL|MOJITO|MARGARITA|DAIKIRY|DAIQUIRI|PISCO|NEGRONI|WHISKY SOUR|AMARETTO SOUR|APEROL|CARAJILLO|CAIPIRINA|MOSCOW MULE|GIN TONIC|CUBA LIBRE|DRY MARTINI|EXPRESSO MARTINI|MOCKTAIL|MOKTAIL|TAINO|COCO LOCO/.test(p)) return 'COCTEL';
    return 'COCTEL';
  }

  if (/ADICION|ADICIONAL|DESECHABLE|DECORACION|PAN BAGUETTE|PAPAS CHIPS|MADURO CON QUESO|PLATANO EN TENTACION|ENSALADA DE PAPA/.test(p)) return 'ADICIONALES';
  if (/CHEESECAKE|FLAN\b|TORTA DE CHOCOLATE/.test(p)) return 'POSTRES';
  if (/CEVICHE|CARPACCIO|ALITAS|CHAMPINON|COCTEL DE CAMARONES|COQUILLA|CREMA DE CEBOLLA|MOLCAJETE|TRILOGIA DE CABEZA|CAMARONES BUFALO/.test(p)) return 'ENTRADAS';
  if (/ANGUS|NEW YORK|PUNTA DE ANCA/.test(p)) return 'PLATOS FUERTES';
  return 'SIN RELACIÓN';
}
