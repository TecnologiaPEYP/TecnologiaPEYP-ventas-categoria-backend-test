import { Injectable } from '@nestjs/common';

const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function fmtMoney(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${Math.round(v)}`;
}

function polyfit1(values: number[]): [number, number] {
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += values[i];
    sumXY += i * values[i]; sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return [0, sumY / n];
  const slope = (n * sumXY - sumX * sumY) / denom;
  return [slope, (sumY - slope * sumX) / n];
}

function monthlySeasonal(labels: string[], values: number[]) {
  const buckets: Record<number, number[]> = {};
  for (let i = 0; i < labels.length; i++) {
    const m = /^\d{4}-(\d{2})$/.exec(String(labels[i] ?? ''));
    if (!m) continue;
    const mo = parseInt(m[1], 10);
    if (mo < 1 || mo > 12) continue;
    (buckets[mo] ??= []).push(values[i]);
  }
  if (!Object.keys(buckets).length) {
    return {
      monthly_averages: [],
      strongest_month: null,
      weakest_month: null,
      insight: 'No hay suficientes etiquetas YYYY-MM para calcular estacionalidad mensual.',
    };
  }
  const monthly_averages = Object.keys(buckets)
    .map(Number)
    .sort((a, b) => a - b)
    .map(mo => {
      const vals = buckets[mo];
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
      return { month_num: mo, month: MONTH_NAMES[mo], avg_sales: avg, observations: vals.length };
    });
  const strongest = monthly_averages.reduce((a, b) => b.avg_sales > a.avg_sales ? b : a);
  const weakest = monthly_averages.reduce((a, b) => b.avg_sales < a.avg_sales ? b : a);
  const insight = weakest.avg_sales > 0
    ? `Estacionalidad detectada: ${strongest.month} promedia ${fmtMoney(strongest.avg_sales)} vs ${weakest.month} ${fmtMoney(weakest.avg_sales)} (${((strongest.avg_sales - weakest.avg_sales) / weakest.avg_sales * 100).toFixed(1)}%).`
    : `Estacionalidad detectada: ${strongest.month} promedia ${fmtMoney(strongest.avg_sales)}. ${weakest.month} tiene promedio cercano a cero.`;
  return { monthly_averages, strongest_month: strongest, weakest_month: weakest, insight };
}

function extractYear(r: any): string {
  for (const field of ['fechaDesde', 'fechaHasta']) {
    const m = /^(\d{4})/.exec(String(r[field] ?? ''));
    if (m) return m[1];
  }
  const m = /(202[3-9]|203\d)/.exec(String(r.nombre ?? '').toLowerCase());
  return m ? m[1] : 'unknown';
}

function extractYearMonth(r: any): string {
  for (const field of ['fechaDesde', 'fechaHasta']) {
    const m = /^(\d{4}-\d{2})/.exec(String(r[field] ?? ''));
    if (m) return m[1];
  }
  return '';
}

@Injectable()
export class AnalysisService {

  analyzeAdvanced(series: Array<{ v: number; label?: string }>): any {
    if (!series?.length) return { error: 'No hay datos para analizar' };
    const values = series.map(x => Number(x.v ?? 0));
    const labels = series.map(x => x.label ?? '');
    const n = values.length;
    if (n < 2) return { error: 'Se requieren al menos 2 puntos para el análisis' };

    const [slope, intercept] = polyfit1(values);
    const mean = values.reduce((s, v) => s + v, 0) / n;
    const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);

    const anomalies = std > 0
      ? values.flatMap((val, idx) => {
          const z = Math.abs(val - mean) / std;
          return z > 2
            ? [{ idx, label: labels[idx], value: val, z_score: Math.round(z * 100) / 100, insight: val > mean ? 'MUY ALTO' : 'MUY BAJO' }]
            : [];
        })
      : [];

    return {
      regression: {
        slope,
        intercept,
        prediction: slope * n + intercept,
        trend_label: slope > 0 ? 'Creciente' : 'Decreciente',
        trend_pct: mean !== 0 ? Math.round(slope / mean * 100 * 100) / 100 : 0,
      },
      stats: { mean, std, max: Math.max(...values), min: Math.min(...values) },
      anomalies,
      seasonality: monthlySeasonal(labels, values),
    };
  }

  analyzeReports(reports: any[], question: string): string {
    if (!reports?.length) return 'No hay reportes suficientes para analizar.';

    const q = question.toLowerCase();
    const insights: string[] = [];

    // 1. Keyword search for specific product/vendor
    const STOP = new Set(['esta', 'como', 'para', 'hace', 'cual', 'cuanto', 'tiene', 'sido', 'entre', 'desde', 'hasta']);
    const words = (q.match(/\b\w{4,}\b/g) ?? []).filter(w => !STOP.has(w));

    if (words.length) {
      const last = reports[reports.length - 1];
      const allProds = (last.topProductos ?? []).map((p: any) => String(p.producto).toLowerCase());
      const allVends = (last.topVendedores ?? []).map((v: any) => String(v.nombre).toLowerCase());
      const specific: string[] = [];

      for (const w of words) {
        const pLower = allProds.find((p: string) => p.includes(w));
        if (pLower) {
          const history = reports.flatMap(r => {
            const found = (r.topProductos ?? []).find((p: any) => String(p.producto).toLowerCase() === pLower);
            if (!found) return [];
            const yr = extractYear(r);
            return [`${yr !== 'unknown' ? yr : (r.nombre ?? '')}: ${fmtMoney(Number(found.ventas))} (${found.qty}u)`];
          });
          if (history.length) specific.push(`Historial de ${pLower.toUpperCase()}: ${history.join(' | ')}`);
          break;
        }
        const vLower = allVends.find((v: string) => v.includes(w));
        if (vLower) {
          const history = reports.flatMap(r => {
            const found = (r.topVendedores ?? []).find((v: any) => String(v.nombre).toLowerCase() === vLower);
            if (!found) return [];
            const yr = extractYear(r);
            return [`${yr !== 'unknown' ? yr : (r.nombre ?? '')}: ${fmtMoney(Number(found.ventas))}`];
          });
          if (history.length) specific.push(`Asesor ${vLower.toUpperCase()}: ${history.join(' | ')}`);
          break;
        }
      }

      if (specific.length) {
        specific.push(`Total del período más reciente: ${fmtMoney(Number(reports[reports.length - 1].totalVentas ?? 0))}.`);
        return specific.join('\n');
      }
    }

    // 2. Group by year and year-month
    const byYear: Record<string, any> = {};
    const byYM: Record<string, any> = {};
    for (const r of reports) {
      const year = extractYear(r);
      const ym = extractYearMonth(r);
      if (year !== 'unknown') {
        if (!byYear[year] || Number(r.totalVentas ?? 0) > Number(byYear[year].totalVentas ?? 0))
          byYear[year] = r;
      }
      if (ym) byYM[ym] = r;
    }
    const sortedYears = Object.keys(byYear).sort();

    // 3. YoY comparison
    if (sortedYears.length >= 2) {
      const yOld = sortedYears[sortedYears.length - 2];
      const yNew = sortedYears[sortedYears.length - 1];
      const rOld = byYear[yOld];
      const rNew = byYear[yNew];
      const vOld = Number(rOld.totalVentas ?? 0);
      const vNew = Number(rNew.totalVentas ?? 0);

      if (vOld > 0) {
        const diffP = (vNew - vOld) / vOld * 100;
        insights.push(`YoY ${yNew} vs ${yOld}: ${diffP >= 0 ? 'CRECIMIENTO' : 'CAÍDA'} de ${diffP >= 0 ? '+' : ''}${diffP.toFixed(1)}% (${fmtMoney(vNew)} vs ${fmtMoney(vOld)}).`);
      }

      const pmOld: Record<string, any> = Object.fromEntries((rOld.topProductos ?? []).map((p: any) => [p.producto, p]));
      const pmNew: Record<string, any> = Object.fromEntries((rNew.topProductos ?? []).map((p: any) => [p.producto, p]));

      const winners: [string, number, number][] = [];
      const losers: [string, number, number][] = [];
      const newEntries: [string, number][] = [];

      for (const [name, pNew] of Object.entries(pmNew)) {
        const vn = Number((pNew as any).ventas ?? 0);
        if (name in pmOld) {
          const vo = Number(pmOld[name].ventas ?? 0);
          if (vo > 0) {
            const chg = (vn - vo) / vo * 100;
            if (chg >= 20) winners.push([name, chg, vn]);
            else if (chg <= -20) losers.push([name, chg, vn]);
          }
        } else if (vn > 0) {
          newEntries.push([name, vn]);
        }
      }

      const fallen = (rOld.topProductos ?? []).slice(0, 10)
        .map((p: any) => p.producto)
        .filter((name: string) => !(name in pmNew));

      winners.sort((a, b) => b[1] - a[1]);
      losers.sort((a, b) => a[1] - b[1]);

      if (winners.length) insights.push(`Platos con mayor crecimiento en ${yNew}: ${winners.slice(0, 3).map(([n, c]) => `${n} (${c >= 0 ? '+' : ''}${c.toFixed(0)}%)`).join(', ')}.`);
      if (losers.length) insights.push(`ALERTA: Platos con mayor caída en ${yNew} vs ${yOld}: ${losers.slice(0, 3).map(([n, c, v]) => `${n} (${c.toFixed(0)}%, ahora ${fmtMoney(v)})`).join(', ')}.`);
      if (newEntries.length) insights.push(`Nuevos en top ${yNew} (no estaban en ${yOld}): ${newEntries.slice(0, 3).map(([n, v]) => `${n} (${fmtMoney(v)})`).join(', ')}.`);
      if (fallen.length) insights.push(`Platos que salieron del top en ${yNew}: ${fallen.slice(0, 3).join(', ')}. Evaluar si fue por estrategia o pérdida de demanda.`);

      // Vendor changes
      const vmOld: Record<string, any> = Object.fromEntries((rOld.topVendedores ?? []).map((v: any) => [v.nombre, v]));
      const vmNew: Record<string, any> = Object.fromEntries((rNew.topVendedores ?? []).map((v: any) => [v.nombre, v]));
      const vendChanges: [string, number, number][] = [];

      for (const [name, vNew] of Object.entries(vmNew)) {
        if (name in vmOld) {
          const vvo = Number(vmOld[name].ventas ?? 0);
          const vvn = Number((vNew as any).ventas ?? 0);
          if (vvo > 0) vendChanges.push([name, (vvn - vvo) / vvo * 100, vvn]);
        }
      }

      vendChanges.sort((a, b) => a[1] - b[1]);
      if (vendChanges.length && vendChanges[0][1] <= -15) {
        const [n, c, v] = vendChanges[0];
        insights.push(`Asesor con mayor caída: ${n} (${c.toFixed(0)}%, ${fmtMoney(v)} en ${yNew}).`);
      }
      vendChanges.sort((a, b) => b[1] - a[1]);
      if (vendChanges.length && vendChanges[0][1] >= 15) {
        const [n, c, v] = vendChanges[0];
        insights.push(`Asesor con mayor crecimiento: ${n} (${c.toFixed(0)}%, ${fmtMoney(v)} en ${yNew}).`);
      }

    } else if (sortedYears.length === 1) {
      const rSolo = byYear[sortedYears[0]];
      insights.push(`Período único: ${sortedYears[0]}. Ventas totales: ${fmtMoney(Number(rSolo.totalVentas ?? 0))}.`);
      const topP = rSolo.topProductos ?? [];
      if (topP.length) insights.push(`Top 3 productos: ${topP.slice(0, 3).map((p: any) => `${p.producto} (${fmtMoney(Number(p.ventas))})`).join(', ')}.`);
    }

    // 4. Monthly trend
    const sortedYM = Object.keys(byYM).sort();
    if (sortedYM.length >= 3) {
      const ventasYM = sortedYM.map(ym => Number(byYM[ym].totalVentas ?? 0));
      const avg = ventasYM.reduce((s, v) => s + v, 0) / ventasYM.length;
      const maxV = Math.max(...ventasYM);
      const minV = Math.min(...ventasYM);
      const crecimiento = ventasYM[0] > 0 ? (ventasYM[ventasYM.length - 1] - ventasYM[0]) / ventasYM[0] * 100 : 0;
      insights.push(
        `Tendencia ${sortedYM.length}m: ${crecimiento >= 0 ? '+' : ''}${crecimiento.toFixed(1)}%. ` +
        `Pico ${sortedYM[ventasYM.indexOf(maxV)]}(${fmtMoney(maxV)}), ` +
        `Min ${sortedYM[ventasYM.indexOf(minV)]}(${fmtMoney(minV)}). ` +
        `Promedio: ${fmtMoney(avg)}/mes.`,
      );
    }

    // 5. Operational risk: high volume items with $0 sales
    const last = reports[reports.length - 1];
    const risk = (last.topProductos ?? [])
      .filter((p: any) => Number(p.ventas ?? 0) === 0 && Number(p.qty ?? 0) > 50)
      .sort((a: any, b: any) => Number(b.qty) - Number(a.qty));
    if (risk.length) {
      insights.push(`RIESGO OPERATIVO: Items con $0 ventas pero ALTO VOLUMEN: ${risk.slice(0, 3).map((p: any) => `${p.producto} (${p.qty}u)`).join(', ')}.`);
    }

    if (!insights.length) {
      const totalV = reports.reduce((s, r) => s + Number(r.totalVentas ?? 0), 0);
      insights.push(`Resumen: ${reports.length} reportes. Acumulado: ${fmtMoney(totalV)}.`);
    }

    return insights.join('\n');
  }
}
