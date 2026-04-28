/**
 * Detector de intenciones para el chat de ventas.
 * Si la pregunta es estructurada (top N, total, horas, etc.)
 * responde directo con los datos → 0 tokens de Gemini.
 * Devuelve null si la pregunta necesita análisis real (Gemini).
 */

function fmtCOP(v: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(v);
}

function extractN(text: string, fallback = 5): number {
  const match = text.match(/\b(\d+)\b/);
  return match ? Math.min(parseInt(match[1]), 50) : fallback;
}

export interface ChatContext {
  totalFilas?: number;
  totalVentas?: number;
  topProductos?: { producto: string; ventas: number; qty: number; relacionPlatos?: string; tipo?: string }[];
  topVendedores?: { nombre: string; ventas: number; qty?: number }[];
  topHoras?: { hora: string; ventas: number; qty?: number }[];
  horaVendedores?: { hora: string; nombre: string; ventas: number }[];
  horaProds?: { hora: string; producto: string; ventas: number; qty: number }[];
  relacionVend?: { relacionPlatos: string; nombre: string; ventas: number; qty: number }[];
  reportes?: any[];
  fileName?: string;
}

export function resolveIntent(question: string, ctx: ChatContext): string | null {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const prods = ctx.topProductos ?? [];
  const vends = ctx.topVendedores ?? [];
  const horas = ctx.topHoras ?? [];
  const tieneMultiperiodo = (ctx.reportes?.length ?? 0) > 0;

  // Si la pregunta implica comparación entre períodos o tendencias → siempre a Gemini
  const esMultiperiodo = tieneMultiperiodo && (
    /entre.*(dos|2|mes|periodo|meses)|ambos|comparar|comparado|vs\.?|versus|acumulado|total.*mes|mes.*total|deca|caid|baj|evolucion|historico|tendencia|crecim/.test(q)
  );
  if (esMultiperiodo) return null;

  // ── VENDEDORES ────────────────────────────────────────────────────────────

  // "top N vendedores" / "mejores N vendedores" / "cuáles son los N vendedores"
  if (/vendedor|vendedore|asesor/.test(q)) {
    if (/cuanto|cuanta/.test(q)) {
      return `Hay **${vends.length} asesores de ventas** en el reporte.`;
    }
    if (/peor|menos|bajo|ultimo|bottom/.test(q)) {
      const n = extractN(q, 5);
      const bottom = [...vends].sort((a, b) => a.ventas - b.ventas).slice(0, n);
      if (!bottom.length) return 'No hay datos de asesores en este reporte.';
      const lista = bottom.map((v, i) => `${i + 1}. ${v.nombre}: ${fmtCOP(v.ventas)}${v.qty ? ` | ${v.qty} uds.` : ''}`).join('\n');
      return `Los ${n} asesores de ventas con menores ventas:\n${lista}`;
    }
    // "cuál fue el mejor vendedor" / "el mejor asesor" → solo el #1
    const hasExplicitN = /\d+/.test(q) || /top|lista|todos/.test(q);
    if (!hasExplicitN && /cual|mejor|mayor/.test(q)) {
      const top = vends[0];
      if (!top) return 'No hay datos de asesores en este reporte.';
      return `El mejor asesor de ventas es **${top.nombre}** con ${fmtCOP(top.ventas)}${top.qty ? ` y ${top.qty.toLocaleString('es-CO')} unidades vendidas` : ''}.`;
    }
    const n = extractN(q, 5);
    const top = vends.slice(0, n);
    if (!top.length) return 'No hay datos de asesores en este reporte.';
    const lista = top.map((v, i) => `${i + 1}. ${v.nombre}: ${fmtCOP(v.ventas)}${v.qty ? ` | ${v.qty} uds.` : ''}`).join('\n');
    return `Top ${top.length} asesores de ventas:\n${lista}`;
  }

  // ── PRODUCTOS ─────────────────────────────────────────────────────────────

  if (/producto|plato|item|articulo/.test(q)) {
    // "cuántos platos/productos se vendieron/vendimos" → total de unidades
    if (/cuanto|cuanta/.test(q) && /vend|unidad|cantidad/.test(q)) {
      const totalUds = prods.reduce((s, p) => s + p.qty, 0);
      const totalVal = prods.reduce((s, p) => s + p.ventas, 0);
      return `Se vendieron **${totalUds.toLocaleString('es-CO')} unidades** en total entre ${prods.length} productos distintos, generando ${fmtCOP(totalVal)} en ventas.`;
    }
    if (/cuanto|cuanta/.test(q)) {
      return `Hay **${prods.length} productos** distintos en el reporte.`;
    }
    if (/peor|menos|bajo|ultimo|bottom/.test(q)) {
      const n = extractN(q, 5);
      const bottom = [...prods].sort((a, b) => a.ventas - b.ventas).slice(0, n);
      if (!bottom.length) return 'No hay datos de productos en este reporte.';
      const lista = bottom.map((p, i) => `${i + 1}. ${p.producto}: ${fmtCOP(p.ventas)} | ${p.qty} uds.`).join('\n');
      return `Los ${n} productos con menores ventas:\n${lista}`;
    }
    // "cuál fue el producto más vendido" → solo el #1
    if (/cual|cuál/.test(q) || /^(el |la )?(mas|mejor|mayor) vend/.test(q) || !q.match(/\d+/)) {
      const hasExplicitN = /\d+/.test(q) || /top|lista|todos/.test(q);
      if (!hasExplicitN && (q.includes('mas vend') || q.includes('mejor vend') || q.includes('mayor vend') || /cual/.test(q))) {
        const top = prods[0];
        if (!top) return 'No hay datos de productos en este reporte.';
        return `El producto más vendido es **${top.producto}** con ${fmtCOP(top.ventas)} en ventas y ${top.qty.toLocaleString('es-CO')} unidades.`;
      }
    }
    const n = extractN(q, 10);
    const top = prods.slice(0, n);
    if (!top.length) return 'No hay datos de productos en este reporte.';
    const lista = top.map((p, i) => `${i + 1}. ${p.producto}: ${fmtCOP(p.ventas)} | ${p.qty} uds.`).join('\n');
    return `Top ${top.length} productos más vendidos:\n${lista}`;
  }

  // ── MÁS VENDIDO (sin decir "producto") ───────────────────────────────────

  if (/mas vendido|mejor vendido|mayor venta/.test(q) && !/vendedor/.test(q)) {
    const top = prods[0];
    if (!top) return 'No hay datos de productos en este reporte.';
    return `El producto más vendido es **${top.producto}** con ${fmtCOP(top.ventas)} en ventas y ${top.qty} unidades.`;
  }

  // ── TOTAL VENTAS / INGRESOS ───────────────────────────────────────────────

  if (/total|ingreso|facturacion|facturado|cuanto.*(vendi|vendio|ventas)/.test(q) && !/producto|vendedor|hora/.test(q)) {
    const total = ctx.totalVentas ?? prods.reduce((s, p) => s + p.ventas, 0);
    const filas = ctx.totalFilas ?? 0;
    return `Total de ventas del reporte: **${fmtCOP(total)}** en ${filas.toLocaleString('es-CO')} transacciones.`;
  }

  // ── HORAS ─────────────────────────────────────────────────────────────────

  if (/hora|turno|pico|franja/.test(q)) {
    if (/vendedor/.test(q) && ctx.horaVendedores?.length) {
      const top = [...(ctx.horaVendedores)].sort((a, b) => b.ventas - a.ventas).slice(0, 8);
      const lista = top.map((r, i) => `${i + 1}. ${r.hora} – ${r.nombre}: ${fmtCOP(r.ventas)}`).join('\n');
      return `Horas pico por vendedor:\n${lista}`;
    }
    if (/producto/.test(q) && ctx.horaProds?.length) {
      const top = [...(ctx.horaProds)].sort((a, b) => b.ventas - a.ventas).slice(0, 8);
      const lista = top.map((r, i) => `${i + 1}. ${r.hora} – ${r.producto}: ${fmtCOP(r.ventas)} | ${r.qty} uds.`).join('\n');
      return `Productos más vendidos por hora:\n${lista}`;
    }
    const n = extractN(q, 8);
    const top = [...horas].sort((a, b) => b.ventas - a.ventas).slice(0, n);
    if (!top.length) return 'No hay datos de horas en este reporte.';
    const lista = top.map((h, i) => `${i + 1}. ${h.hora}: ${fmtCOP(h.ventas)}${h.qty ? ` | ${h.qty} uds.` : ''}`).join('\n');
    return `Horas con más ventas:\n${lista}`;
  }

  // ── CATEGORÍAS / RELACIONES ───────────────────────────────────────────────

  if (/categoria|relacion|tipo|clasificacion/.test(q) && ctx.relacionVend?.length) {
    const agrupado = new Map<string, number>();
    for (const r of ctx.relacionVend) {
      agrupado.set(r.relacionPlatos, (agrupado.get(r.relacionPlatos) ?? 0) + r.ventas);
    }
    const sorted = [...agrupado.entries()].sort((a, b) => b[1] - a[1]);
    const lista = sorted.map(([ cat, v], i) => `${i + 1}. ${cat}: ${fmtCOP(v)}`).join('\n');
    return `Ventas por categoría:\n${lista}`;
  }

  // ── MESES ─────────────────────────────────────────────────────────────────

  if (/mes/.test(q) && !tieneMultiperiodo) {
    const meses = (ctx as any).meses ?? [];
    if (meses.length > 0) {
      if (/mejor|mayor|mas vend|pico/.test(q)) {
        const top = [...meses].sort((a: any, b: any) => b.ventas - a.ventas)[0];
        return `El mejor mes fue **${top.label ?? top.mes}** con ${fmtCOP(top.ventas)}${top.qty ? ` y ${top.qty.toLocaleString('es-CO')} unidades` : ''}.`;
      }
      if (/peor|menor|menos vend|bajo/.test(q)) {
        const bottom = [...meses].sort((a: any, b: any) => a.ventas - b.ventas)[0];
        return `El mes con menores ventas fue **${bottom.label ?? bottom.mes}** con ${fmtCOP(bottom.ventas)}${bottom.qty ? ` y ${bottom.qty.toLocaleString('es-CO')} unidades` : ''}.`;
      }
      // Listado general de meses
      const sorted = [...meses].sort((a: any, b: any) => b.ventas - a.ventas);
      const lista = sorted.map((m: any, i: number) => `${i + 1}. ${m.label ?? m.mes}: ${fmtCOP(m.ventas)}${m.qty ? ` | ${m.qty.toLocaleString('es-CO')} uds.` : ''}`).join('\n');
      return `Ventas por mes:\n${lista}`;
    }
  }

  // ── DÍAS ─────────────────────────────────────────────────────────────────

  if (/dia|calendario/.test(q)) {
    const reportActual = ctx.reportes?.[0] ?? ctx;
    const dias = reportActual.dias ?? [];
    if (dias.length > 0) {
      if (/mejor|mas vend|mayor vend|pico/.test(q)) {
        const top = [...dias].sort((a: any, b: any) => b.ventas - a.ventas)[0];
        return `El mejor día de ventas fue el **día ${top.dia}** con ${fmtCOP(top.ventas)}.`;
      }
      if (/peor|menos vend|bajo/.test(q)) {
        const bottom = [...dias].sort((a: any, b: any) => a.ventas - b.ventas)[0];
        return `El día con menores ventas fue el **día ${bottom.dia}** con ${fmtCOP(bottom.ventas)}.`;
      }
    }
  }

  // ── TRANSACCIONES Y CANTIDADES ─────────────────────────────────────────────

  if (/cuantas.*(venta|transaccion|pedido|orden|unidad)/.test(q)) {
    const filas = ctx.totalFilas ?? 0;
    const unidades = ctx.topProductos?.reduce((s, p) => s + p.qty, 0) ?? 0;
    if (/unidad/.test(q)) {
      return `Se han vendido un total de **${unidades.toLocaleString('es-CO')} unidades**.`;
    }
    return `Se registraron **${filas.toLocaleString('es-CO')} transacciones** en este reporte.`;
  }

  // ── PROPINAS ──────────────────────────────────────────────────────────────

  if (/propina|servicio/.test(q)) {
    const propinas = (ctx as any).totalPropinas ?? 0;
    if (propinas > 0) {
      return `El total de propinas/servicio recaudado es de **${fmtCOP(propinas)}**.`;
    }
    return `No se registran propinas o valores de servicio en este reporte.`;
  }

  // ── FUENTE / META PREGUNTAS ───────────────────────────────────────────────

  if (/donde.*(tom|sac|obt|us)|de donde|cual.*(fuente|reporte|archivo|datos)|que reporte|nombre.*archivo/.test(q)) {
    const nombre = ctx.fileName ?? 'el archivo cargado';
    return `Los datos provienen del archivo **"${nombre}"**. Contiene ${(ctx.totalFilas ?? 0).toLocaleString('es-CO')} transacciones con un total de ${fmtCOP(ctx.totalVentas ?? 0)} en ventas.`;
  }

  // No reconocida → Gemini
  return null;
}
