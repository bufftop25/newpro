/**
 * g1-acq.js — Mapeamento de IDs de produtos do Google One (script http-response do Shadowrocket)
 *
 * Princípios:
 *   1. Responsabilidade única: mapear IDs mensais para IDs promocionais, sem diagnóstico ou envio de dados;
 *   2. Primeiro identifica no texto original os IDs promocionais terminados em acq; se o alvo
 *      não aparece e a alternativa aparece, usa a alternativa. Isso não valida a disponibilidade na loja;
 *   3. Mapeamentos concentrados nas tabelas SKU_MAP e FALLBACK.
 *
 * Versão: v6
 */
"use strict";

console.log("[g1-acq] v6 loaded");

/* ID original de compra no iOS → ID promocional de destino */
var SKU_MAP = {
  "g1.ios.20tb.m.v2":     "g1.20tb.3months_ip_90p.acq",
  "g1.ios.30tb.ai.pro.m": "g1.ai.ultra.3months_ip_90p.acq"
};

/* Alternativas históricas quando o destino não aparece no texto original */
var FALLBACK = {
  "g1.20tb.3months_ip_90p.acq":     "g1.20tb.3months_ip_75p.acq",
  "g1.ai.ultra.3months_ip_90p.acq": "g1.ai.ultra.3months_ip_75p.acq"
};

function occurrences(s, needle) {
  return needle ? s.split(needle).length - 1 : 0;
}

function run() {
  var body = $response && $response.body;
  if (typeof body !== "string" || body === "") {
    $done({});
    return;
  }

  /* IDs promocionais presentes na resposta original */
  var raw = body.match(/g1\.[a-z0-9._]{2,60}acq/g) || [];
  var seen = {};
  var catalog = [];
  for (var r = 0; r < raw.length; r++) {
    if (!seen[raw[r]]) { seen[raw[r]] = 1; catalog.push(raw[r]); }
  }
  console.log("[g1-acq] IDs promocionais encontrados: " + (catalog.join(", ") || "nenhum"));

  var out = body, total = 0;
  var froms = Object.keys(SKU_MAP);
  for (var k = 0; k < froms.length; k++) {
    var from = froms[k];
    var n = occurrences(out, from);
    if (n === 0) continue;

    var to = SKU_MAP[from];
    if (catalog.indexOf(to) === -1 && FALLBACK[to] && catalog.indexOf(FALLBACK[to]) !== -1) {
      console.log("[g1-acq] Destino ausente na resposta; usando alternativa " + to + " -> " + FALLBACK[to]);
      to = FALLBACK[to];
    }

    out = out.split(from).join(to);
    total += n;
    console.log("[g1-acq] " + from + " -> " + to + " x" + n);
  }

  console.log(total ? "[g1-acq] Total de substituições: " + total + "" : "[g1-acq] Nenhuma correspondência");
  $done(total ? { body: out } : {});
}

run();
