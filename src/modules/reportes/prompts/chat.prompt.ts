import { EMPRESA_CONTEXT } from './contextos/empresa.context';
import { RESPUESTA_CONTEXT } from './contextos/respuesta.context';

/** Formato compacto: $136.9M / $80.8K — reduce tokens ~40% vs fmtCOP completo */
function fmtM(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${Math.round(v)}`;
}

export interface ChatPromptData {
  question: string;
  fileName?: string;
  totalFilas: number;
  totalVentas: number;
  totalPropinas?: number;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
  meses?: any[];
  dias?: any[];
  topProductos: any[];
  topVendedores: any[];
  topHoras: any[];
  horaVendedores: any[];
  horaProds: any[];
  relacionVend: any[];
  reportes?: any[];
  resumenPorAno?: Record<string, { totalVentas: number; meses: string[] }>;
  pythonInsights?: string;
}

export function buildChatPrompt(data: ChatPromptData): string {
  const { question, fileName, totalFilas, totalVentas, pythonInsights } = data;

  // Incluimos productos con VENTA o con CANTIDAD significativa (aunque sean $0)
  const sorted = [...data.topProductos]
    .filter(p => p.ventas > 0 || p.qty > 100) // Filtramos solo lo irrelevante
    .sort((a, b) => b.ventas - a.ventas);
  
  const topProd = sorted.slice(0, 15)
    .map((p, i) => {
      const isOperative = p.ventas === 0 && p.qty > 50;
      const type = isOperative ? '[RIESGO OPERATIVO]' : `[${p.relacionPlatos ?? p.tipo ?? ''}]`;
      return `${i + 1}.${p.producto}${type}:${fmtM(p.ventas)}|${p.qty}u`;
    })
    .join('\n');

  // Todos los asesores
  const asesores = data.topVendedores
    .map((v) => `${v.nombre}:${fmtM(v.ventas)}|${v.qty ?? 0}u`)
    .join('\n');

  // Horas pico top 10
  const horas = [...data.topHoras]
    .sort((a, b) => b.ventas - a.ventas).slice(0, 10)
    .map((h) => `${h.hora}:${fmtM(h.ventas)}|${h.qty ?? 0}u`)
    .join(' | ');

  // Categorías agrupadas
  const catMap = new Map<string, number>();
  for (const r of data.relacionVend) {
    catMap.set(r.relacionPlatos, (catMap.get(r.relacionPlatos) ?? 0) + r.ventas);
  }
  const categorias = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat, v]) => `${cat}:${fmtM(v)}`)
    .join(' | ');

  // Resumen por año (CRÍTICO PARA RIESGO)
  const anoCtx = data.resumenPorAno && Object.keys(data.resumenPorAno).length > 0
    ? '\n=== RESUMEN POR AÑO (HISTORIAL DE VENTAS) ===\n' + Object.entries(data.resumenPorAno)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([ano, v]) => `${ano}: ${fmtM(v.totalVentas)} | Meses: ${v.meses.join(', ')}`)
        .join('\n')
    : '';

  // Todos los reportes cargados — incluir Cantidad para análisis operativo
  const periodos = (data.reportes ?? []).length > 0
    ? '\n=== DETALLE DE PERIODOS (COMPARATIVA) ===\n' + (data.reportes ?? []).map((r: any) => {
        const ps = [...(r.topProductos ?? [])]
          .sort((a: any, b: any) => b.ventas - a.ventas).slice(0, 3) // Solo top 3 para ahorrar tokens
          .map((p: any) => `  ${p.producto}:${fmtM(p.ventas)}|${p.qty}u`).join('\n');
        const mCount = (r.meses ?? []).length;
        const ms = mCount > 0 ? `\n  - ${mCount} meses analizados.` : '';
        return `[${r.nombre}] ${fmtM(Number(r.totalVentas))}\nPRODUCTOS:\n${ps}${ms}`;
      }).join('\n')
    : '';

  // Propinas
  const propinas = data.totalPropinas && data.totalPropinas > 0
    ? `\nPROPINAS: ${fmtM(data.totalPropinas)}`
    : '';

  // Rango de fechas
  const fechaRango = data.fechaDesde
    ? `\nPERÍODO: ${data.fechaDesde}${data.fechaHasta ? ` → ${data.fechaHasta}` : ''}`
    : '';

  // Ventas por mes
  const mesesCtx = data.meses && data.meses.length > 0
    ? '\nVENTAS POR MES:\n' + data.meses
        .map((m: any) => `${m.label ?? m.mes}: ${fmtM(m.ventas)} | ${m.qty ?? 0}u${m.propinas ? ` | propinas:${fmtM(m.propinas)}` : ''}`)
        .join('\n')
    : '';

  // Ventas por día del mes (top 10 + bottom 5)
  const diasCtx = data.dias && data.dias.length > 0
    ? (() => {
        const sorted = [...data.dias].sort((a: any, b: any) => b.ventas - a.ventas);
        const top = sorted.slice(0, 10).map((d: any) => `día${d.dia}:${fmtM(d.ventas)}|${d.qty ?? 0}u`).join(' | ');
        const bottom = sorted.slice(-5).reverse().map((d: any) => `día${d.dia}:${fmtM(d.ventas)}`).join(' | ');
        return `\nDÍAS MÁS ALTOS: ${top}\nDÍAS MÁS BAJOS: ${bottom}`;
      })()
    : '';

  const insightsCtx = pythonInsights 
    ? `\n=== ANÁLISIS ESTRATÉGICO Y GESTIÓN DE RIESGO (PRIORIDAD ALTA) ===\n${pythonInsights}\n` 
    : '';

  const anosPresentes = data.resumenPorAno ? Object.keys(data.resumenPorAno).sort() : [];
  const comparativaInstruccion = anosPresentes.length >= 2
    ? `PRIORIZA la comparativa ${anosPresentes[anosPresentes.length - 1]} vs ${anosPresentes[anosPresentes.length - 2]}.`
    : anosPresentes.length === 1
      ? `Analiza el desempeño del año ${anosPresentes[0]}.`
      : 'PRIORIZA la comparativa interanual si hay datos de múltiples años.';

  return `${EMPRESA_CONTEXT}
Analiza el comportamiento histórico para Predecir Riesgos y Optimizar Tendencias.

REPORTE ACTUAL: "${fileName ?? 'sin nombre'}" | ${totalFilas}tx | ${fmtM(totalVentas)}${propinas}${fechaRango}
${mesesCtx}${diasCtx}

${anoCtx}
${periodos}

${insightsCtx}

TOP PRODUCTOS (VENTA + OPERATIVOS):
${topProd || '(sin datos)'}

ASESORES:
${asesores}

==== INSTRUCCIÓN PARA RESPUESTA (GESTIÓN DE RIESGOS) ====
1. ${comparativaInstruccion}
2. Identifica platos "Motor" que estén perdiendo fuerza YoY.
3. Analiza los ítems [OPERATIVO] ($0 ventas) por su CANTIDAD (Volumen de trabajo).
4. SÉ VERÍDICO: No inventes comparaciones si no tienes los datos de ambos años.

PREGUNTA: "${question}"

${RESPUESTA_CONTEXT}`;
}
