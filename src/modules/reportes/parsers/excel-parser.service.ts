import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import {
  HORA_ORDER,
  mesLabel,
  fmtHora,
  catHora,
  normalizeKey,
  decodeHtmlEntities,
  extractHour,
  assignRelacionPlatos,
} from './excel-parser.utils';

@Injectable()
export class ExcelParserService {
  parse(buffer: Buffer, isCsv: boolean) {
    let wb: XLSX.WorkBook;
    if (isCsv) {
      // Strip UTF-8 BOM if present (0xEF 0xBB 0xBF)
      let text = buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf
        ? buffer.subarray(3).toString('utf-8')
        : buffer.toString('utf-8');
      // Retry decoding as latin1 si el texto aparece corrupto (CSVs ANSI de Excel colombiano)
      if (text.includes('') || text.includes('\x00')) {
        text = buffer.toString('latin1');
      }
      wb = XLSX.read(text, { type: 'string', raw: true });
    } else {
      wb = XLSX.read(buffer, { type: 'buffer', cellDates: false, raw: false });
    }

    // Leer también con cellDates:true para obtener objetos Date reales (sin ambigüedad de formato)
    let wbDates: XLSX.WorkBook | null = null;
    if (!isCsv) {
      try {
        wbDates = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
      } catch { wbDates = null; }
    }

    const sheet    = wb.Sheets[wb.SheetNames[0]];
    const date1904 = wb.Workbook?.WBProps?.date1904 === true;
    const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!aoa.length) return null;

    // Detectar fila de cabeceras (primeras 20 filas)
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(20, aoa.length); i++) {
      const rowStr = (aoa[i] || []).map(String).join(' ').toLowerCase();
      // Buscamos columnas clave de forma más robusta
      if ((rowStr.includes('producto') || rowStr.includes('item') || rowStr.includes('descrip')) && 
          (rowStr.includes('cantidad') || rowStr.includes('total') || rowStr.includes('fecha'))) {
        headerRowIndex = i;
        break;
      }
    }

    const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex, defval: '' });

    // rawDates: misma hoja pero con cellDates:true → las celdas de fecha son objetos Date
    let rawDates: Record<string, unknown>[] = [];
    if (wbDates) {
      const sheetDates = wbDates.Sheets[wbDates.SheetNames[0]];
      rawDates = XLSX.utils.sheet_to_json(sheetDates, { range: headerRowIndex, defval: '' }) as Record<string, unknown>[];
    }
    if (!raw.length) return null;

    const firstKeys = Object.keys(raw[0] || {});
    const findKey   = (pat: string) => firstKeys.find(k => normalizeKey(k).includes(pat)) ?? '';

    // Extraer fechaDesde / fechaHasta de las primeras filas si el encabezado lo incluye
    let fechaDesde = '';
    let fechaHasta = '';
    for (let i = 0; i < Math.min(10, aoa.length); i++) {
      for (const cell of aoa[i]) {
        const s = String(cell || '');
        const mD = s.match(/[Dd]esde[:\s]+(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/);
        if (mD) fechaDesde = mD[1];
        const mH = s.match(/[Hh]asta[:\s]+(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/);
        if (mH) fechaHasta = mH[1];
      }
    }

    const kFecha   = findKey('fecha');
    const kProd    = findKey('producto');
    const kCant    = findKey('cantidad');
    const kTotal   = findKey('total');
    const kCat     = findKey('categ');
    const kVend    = findKey('vend') || findKey('mesero') || findKey('emplead') || findKey('cajero') || findKey('oper');
    const kRelacion = findKey('relacion') || findKey('relacionplato');
    const kNo      = firstKeys.find(k => /^no\.?$/.test(normalizeKey(k))) ?? '';
    const kPropina = findKey('propina');
    // Columna "Hora" separada (sin "fecha" en el nombre) — contiene la hora real de la transacción
    const kHoraCol = firstKeys.find(k => {
      const nk = normalizeKey(k);
      return nk.includes('hora') && !nk.includes('fecha') && k !== kFecha;
    }) ?? '';

    if (!kProd) return null;

    const horaMap:     Record<string, { ventas: number; qty: number }> = {};
    const diaMap:      Record<string, { ventas: number; qty: number }> = {};
    const mesMap:      Record<string, { ventas: number; qty: number }> = {};
    const mesPropinaMap: Record<string, number> = {};
    const prodMap:     Record<string, { ventas: number; qty: number; tipo: string; relacionPlatos: string }> = {};
    const vendMap:     Record<string, { ventas: number; qty: number; propina: number }> = {};
    const rawRows: {
      hora: string; cat: string; dia: string; mes: string; fecha: string;
      producto: string; total: number; qty: number; tipo: string; vendedor: string; relacionPlatos: string;
    }[] = [];
    const seenOrderPropina = new Set<string>(); // evita contar la propina más de una vez por orden
    let totalPropinas = 0;

    // ── INFERIR FORMATO MM DE FECHAS ANTES DE PROCESAR ──────────────────────────
    let isMonthFirst = false; // True = MM/DD/YYYY, False = DD/MM/YYYY
    let countMmDd = 0;
    let countDdMm = 0;

    const p1Values: number[] = [];
    const p2Values: number[] = [];
    const scanLimit = Math.min(1000, raw.length);
    
    for (let i = 0; i < scanLimit; i++) {
      const r = raw[i];
      const rFecha = r[kFecha];
      if (!rFecha || typeof rFecha !== 'string') continue;
      const mDMY = rFecha.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (mDMY) {
        const p1 = parseInt(mDMY[1], 10);
        const p2 = parseInt(mDMY[2], 10);
        if (p1 > 12 && p2 <= 12) { countDdMm++; }
        if (p2 > 12 && p1 <= 12) { countMmDd++; }
        if (p1 >= 1 && p1 <= 12) p1Values.push(p1);
        if (p2 >= 1 && p2 <= 31) p2Values.push(p2);
      }
    }

    if (countMmDd > 0 && countDdMm === 0) {
      isMonthFirst = true;
    } else if (countDdMm > 0 && countMmDd === 0) {
      isMonthFirst = false;
    } else if (countMmDd > countDdMm) {
      // Mixed cases (can happen if Excel messed up the CSV save). 
      // Majority wins.
      isMonthFirst = true;
    } else if (countDdMm > countMmDd) {
      isMonthFirst = false;
    } else if (p1Values.length > 0 && p2Values.length > 0) {
      const p1Unique = new Set(p1Values).size;
      const p2Max = Math.max(...p2Values);
      const p2Unique = new Set(p2Values).size;

      if (p1Unique <= 3 && p2Unique >= 8) {
        isMonthFirst = true;
      } else if (new Set(p2Values).size <= 3 && new Set(p1Values).size >= 8) {
        isMonthFirst = false;
      } else if (p2Max > 12) {
        isMonthFirst = true;
      }
    }

    for (let rowIdx = 0; rowIdx < raw.length; rowIdx++) {
      const row = raw[rowIdx];
      const rowDate = rawDates[rowIdx]; // misma fila pero con cellDates:true

      const producto = decodeHtmlEntities(String(row[kProd] ?? '').trim());
      if (!producto) continue;

      const qty   = Number(row[kCant]) || 1;
      const total = Number(row[kTotal]) || 0;
      const tipo  = String(row[kCat] ?? '').toUpperCase().includes('BEBIDA') ? 'Bebida' : 'Comida';

      const rawRelacion = kRelacion ? String(row[kRelacion] ?? '').trim() : '';
      let relacionPlatos = rawRelacion
        ? rawRelacion.toUpperCase()
        : (assignRelacionPlatos(producto, String(row[kCat] ?? '')) || 'SIN RELACIÓN');
      if (relacionPlatos === 'CARNES ANGUS') relacionPlatos = 'PLATOS FUERTES';

      const fechaRaw = row[kFecha];

      // Extraer día y mes desde la columna Fecha
      let dia = '';
      let mes = '';
      let dateYear = 0;
      let dateMonth = 0;
      let dateDay = 0;

      // PRIORIDAD 1: usar el objeto Date real de rawDates (cellDates:true) — sin ambigüedad de formato
      const fechaDateObj = rowDate ? rowDate[kFecha] : undefined;
      if (fechaDateObj instanceof Date && !isNaN(fechaDateObj.getTime())) {
        dateYear  = fechaDateObj.getUTCFullYear();
        dateMonth = fechaDateObj.getUTCMonth() + 1; // getUTCMonth() es 0-indexed
        dateDay   = fechaDateObj.getUTCDate();
      } else if (typeof fechaRaw === 'string') {
        // PRIORIDAD 2: parseo de texto con detección de formato
        const s = fechaRaw.trim();
        const mDMY = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (mDMY) {
          let p1 = parseInt(mDMY[1], 10);
          let p2 = parseInt(mDMY[2], 10);
          const yrStr = mDMY[3].length === 2 ? '20' + mDMY[3] : mDMY[3];
          dateYear = parseInt(yrStr, 10);

          // Use the inferred format for ALL rows to ensure consistency
          // unless a specific row heavily contradicts it (like day > 12 overriding month)
          if (isMonthFirst) {
            // MM/DD
            if (p1 > 12 && p2 <= 12) {
              // Contradiction! p1 cannot be a month.
              dateDay = p1;
              dateMonth = p2;
            } else {
              dateMonth = p1;
              dateDay = p2;
            }
          } else {
            // DD/MM
            if (p2 > 12 && p1 <= 12) {
              // Contradiction! p2 cannot be a month.
              dateMonth = p1;
              dateDay = p2;
            } else {
              dateDay = p1;
              dateMonth = p2;
            }
          }
        } else {
          const mISO = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
          if (mISO) {
            dateYear = parseInt(mISO[1], 10);
            dateMonth = parseInt(mISO[2], 10);
            dateDay = parseInt(mISO[3], 10);
          }
        }
      } else if (typeof fechaRaw === 'number' && isFinite(fechaRaw)) {
        // PRIORIDAD 3: serial numérico de Excel (fallback si cellDates no funcionó)
        const parsed = XLSX.SSF.parse_date_code(fechaRaw, { date1904 });
        dateYear = parsed.y;
        dateMonth = parsed.m;
        dateDay = parsed.d;
      }

      // Preferir columna "Hora" separada; si no, extraer de la columna Fecha
      const horaColRaw = kHoraCol ? row[kHoraCol] : undefined;
      let hour = horaColRaw !== undefined ? extractHour(horaColRaw, date1904) : -1;
      if (hour < 0) hour = extractHour(fechaRaw, date1904);

      if (dateYear > 0 && dateMonth > 0 && dateDay > 0) {
        // Ajuste de "día de negocio": 
        // El restaurante abre a las 8 AM y cierra a las 3-4 AM del día siguiente.
        // Si la venta ocurre entre las 12 AM (0) y las 5 AM (5), pertenece al día anterior.
        if (hour >= 0 && hour <= 5) {
          const shiftDate = new Date(Date.UTC(dateYear, dateMonth - 1, dateDay));
          shiftDate.setUTCDate(shiftDate.getUTCDate() - 1);
          dateYear = shiftDate.getUTCFullYear();
          dateMonth = shiftDate.getUTCMonth() + 1;
          dateDay = shiftDate.getUTCDate();
        }

        dia = String(dateDay);
        mes = `${dateYear}-${dateMonth.toString().padStart(2, '0')}`;
      }

      const hora     = hour >= 0 ? fmtHora(hour) : '';
      const cat      = hora ? catHora(hora) : '';
      const vendedor = kVend ? String(row[kVend] ?? '').trim() : '';
      const ordenNo  = kNo   ? String(row[kNo]   ?? '').trim() : '';
      const propina  = kPropina ? (Number(row[kPropina]) || 0) : 0;

      // Deduplicar propina por número de orden para no contarla múltiples veces
      if (propina > 0) {
        const ordenKey   = ordenNo || null;
        const shouldCount = ordenKey ? !seenOrderPropina.has(ordenKey) : true;
        if (shouldCount) {
          if (ordenKey) seenOrderPropina.add(ordenKey);
          totalPropinas += propina;
          if (mes) mesPropinaMap[mes] = (mesPropinaMap[mes] || 0) + propina;
          if (vendedor) {
            if (!vendMap[vendedor]) vendMap[vendedor] = { ventas: 0, qty: 0, propina: 0 };
            vendMap[vendedor].propina += propina;
          }
        }
      }

      if (hora) {
        if (!horaMap[hora]) horaMap[hora] = { ventas: 0, qty: 0 };
        horaMap[hora].ventas += total;
        horaMap[hora].qty    += qty;
      }

      if (dia) {
        if (!diaMap[dia]) diaMap[dia] = { ventas: 0, qty: 0 };
        diaMap[dia].ventas += total;
        diaMap[dia].qty    += qty;
      }

      if (mes) {
        if (!mesMap[mes]) mesMap[mes] = { ventas: 0, qty: 0 };
        mesMap[mes].ventas += total;
        mesMap[mes].qty    += qty;
      }

      if (!prodMap[producto]) prodMap[producto] = { ventas: 0, qty: 0, tipo, relacionPlatos };
      prodMap[producto].ventas += total;
      prodMap[producto].qty    += qty;

      if (vendedor) {
        if (!vendMap[vendedor]) vendMap[vendedor] = { ventas: 0, qty: 0, propina: 0 };
        vendMap[vendedor].ventas += total;
        vendMap[vendedor].qty    += qty;
      }

      const fecha = mes && dia ? `${mes}-${dia.padStart(2, '0')}` : '';
      rawRows.push({ hora, cat, dia, mes, fecha, producto, total, qty, tipo, vendedor, relacionPlatos });
    }

    // ── AGREGACIONES FINALES ──────────────────────────────────────────────────

    const extra   = Object.keys(horaMap).filter(h => !HORA_ORDER.includes(h));
    const allHoras = [...HORA_ORDER, ...extra];
    const horas   = allHoras.map(h => ({ hora: h, ventas: horaMap[h]?.ventas ?? 0, qty: horaMap[h]?.qty ?? 0, cat: catHora(h) }));

    const dias = Object.entries(diaMap)
      .map(([d, v]) => ({ dia: d, ventas: v.ventas, qty: v.qty }))
      .sort((a, b) => (parseInt(a.dia) || 0) - (parseInt(b.dia) || 0));

    const meses = Object.entries(mesMap)
      .map(([m, v]) => ({ mes: m, label: mesLabel(m), ventas: v.ventas, qty: v.qty, propinas: mesPropinaMap[m] || 0 }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    const prods     = Object.entries(prodMap).map(([producto, v]) => ({ producto, ventas: v.ventas, qty: v.qty, tipo: v.tipo, relacionPlatos: v.relacionPlatos }));
    const vendedores = Object.entries(vendMap).map(([nombre, v]) => ({ nombre, ventas: v.ventas, qty: v.qty, propina: v.propina })).sort((a, b) => b.ventas - a.ventas);

    // ── CRUCES DIMENSIONALES ──────────────────────────────────────────────────

    const horaPlatosMap:  Record<string, Record<string, number>>                            = {};
    const horaVendMap:    Record<string, Record<string, { ventas: number; qty: number }>>   = {};
    const horaProdMap:    Record<string, Record<string, { ventas: number; qty: number }>>   = {};
    const relacionVendMap: Record<string, Record<string, { ventas: number; qty: number }>> = {};

    for (const r of rawRows) {
      if (!r.hora) continue;

      if (!horaPlatosMap[r.hora]) horaPlatosMap[r.hora] = {};
      horaPlatosMap[r.hora][r.relacionPlatos] = (horaPlatosMap[r.hora][r.relacionPlatos] ?? 0) + r.total;

      if (!horaProdMap[r.hora]) horaProdMap[r.hora] = {};
      if (!horaProdMap[r.hora][r.producto]) horaProdMap[r.hora][r.producto] = { ventas: 0, qty: 0 };
      horaProdMap[r.hora][r.producto].ventas += r.total;
      horaProdMap[r.hora][r.producto].qty    += r.qty;

      if (!r.vendedor) continue;

      if (!horaVendMap[r.hora]) horaVendMap[r.hora] = {};
      if (!horaVendMap[r.hora][r.vendedor]) horaVendMap[r.hora][r.vendedor] = { ventas: 0, qty: 0 };
      horaVendMap[r.hora][r.vendedor].ventas += r.total;
      horaVendMap[r.hora][r.vendedor].qty    += r.qty;

      if (!relacionVendMap[r.relacionPlatos]) relacionVendMap[r.relacionPlatos] = {};
      if (!relacionVendMap[r.relacionPlatos][r.vendedor]) relacionVendMap[r.relacionPlatos][r.vendedor] = { ventas: 0, qty: 0 };
      relacionVendMap[r.relacionPlatos][r.vendedor].ventas += r.total;
      relacionVendMap[r.relacionPlatos][r.vendedor].qty    += r.qty;
    }

    const horaPlatos: { hora: string; relacionPlatos: string; ventas: number }[] = [];
    for (const [hora, cats] of Object.entries(horaPlatosMap))
      for (const [relacionPlatos, ventas] of Object.entries(cats))
        horaPlatos.push({ hora, relacionPlatos, ventas });

    const horaVendedores: { hora: string; nombre: string; ventas: number; qty: number }[] = [];
    for (const [hora, vends] of Object.entries(horaVendMap))
      for (const [nombre, v] of Object.entries(vends))
        horaVendedores.push({ hora, nombre, ventas: v.ventas, qty: v.qty });

    const horaProds: { hora: string; producto: string; ventas: number; qty: number }[] = [];
    for (const [hora, prods2] of Object.entries(horaProdMap))
      for (const [producto, v] of Object.entries(prods2))
        horaProds.push({ hora, producto, ventas: v.ventas, qty: v.qty });

    const relacionVend: { relacionPlatos: string; nombre: string; ventas: number; qty: number }[] = [];
    for (const [relacionPlatos, vends2] of Object.entries(relacionVendMap))
      for (const [nombre, v] of Object.entries(vends2))
        relacionVend.push({ relacionPlatos, nombre, ventas: v.ventas, qty: v.qty });

    return {
      horas, dias, meses, prods, vendedores,
      horaPlatos, horaVendedores, horaProds, relacionVend,
      rows: raw.length,
      rawRows,
      totalPropinas,
      fechaDesde,
      fechaHasta,
    };
  }
}
