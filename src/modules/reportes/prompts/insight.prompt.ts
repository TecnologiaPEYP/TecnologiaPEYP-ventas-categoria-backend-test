import { EMPRESA_CONTEXT } from './contextos/empresa.context';
import { COMERCIAL_CONTEXT } from './contextos/comercial.context';
import { RESPUESTA_CONTEXT } from './contextos/respuesta.context';

function fmtCOP(v: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
}

export interface InsightPromptData {
  periodoNombre?: string;
  fileName?: string;
  totalFilas: number;
  totalVentas: number;
  allProds: any[];
  topVendedores: any[];
  topHoras: any[];
}

export function buildInsightPrompt(data: InsightPromptData): string {
  const { periodoNombre, fileName, totalFilas, totalVentas, allProds, topVendedores, topHoras } = data;

  const topProd = allProds.slice(0, 5)
    .map((p, i) => `${i + 1}. ${p.producto} [${p.relacionPlatos ?? ''}]: ${fmtCOP(p.ventas)} (${p.qty} uds.)`)
    .join('\n');

  const bottomProd = allProds.slice(-5).reverse()
    .map((p, i) => `${i + 1}. ${p.producto} [${p.relacionPlatos ?? ''}]: ${fmtCOP(p.ventas)} (${p.qty} uds.)`)
    .join('\n');

  const topVend = topVendedores.slice(0, 3)
    .map((v, i) => `${i + 1}. ${v.nombre}: ${fmtCOP(v.ventas)}`)
    .join('\n');

  const topHorasStr = topHoras.slice(0, 4)
    .map((h) => `${h.hora}: ${fmtCOP(h.ventas)}`)
    .join('\n');

  return `${EMPRESA_CONTEXT}

${COMERCIAL_CONTEXT}

REPORTE: "${periodoNombre ?? fileName ?? 'Sin nombre'}"
- Productos distintos: ${allProds.length} | Transacciones: ${totalFilas} | Ventas: ${fmtCOP(totalVentas)}

TOP 5 PRODUCTOS:
${topProd || '(sin datos)'}
BOTTOM 5 PRODUCTOS:
${bottomProd || '(sin datos)'}
TOP VENDEDORES:
${topVend || '(sin datos)'}
HORAS PICO:
${topHorasStr || '(sin datos)'}

Proporciona:
1. Resumen ejecutivo (2 oraciones)
2. Hallazgos clave (3 puntos con cifras)
3. Recomendaciones (2-3 acciones concretas)

${RESPUESTA_CONTEXT}`;
}
