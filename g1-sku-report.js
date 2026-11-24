/* Local-only report served by a Shadowrocket http-request script. */
"use strict";

(function () {
  var ROOT = "https://one.google.com/g1-sku-report";
  var VERSION = "v7.5.0-pt-BR.2";
  var COLLECTOR_VERSION = "g1-acq-v7.5-pt-BR.2";
  var CONFIGURED_TARGET = "g1.2tb.ai.12months_ip_90p";
  var LEGACY_TARGET = "g1.2tb.ai.annual";
  var ULTRA_TRIAL = typeof $argument === "string" && $argument.trim() === "ultra_1m";
  var SCAN_KEY = "g1.sku.scan.v1";
  var TEST_KEY = "g1.pro.annual.test.v1";
  var url = typeof $request === "object" && $request ? $request.url : "";
  if (typeof url !== "string" || !/^https:\/\/one\.google\.com\/g1-sku-report\/?(?:\?|$)/.test(url)) {
    $done({});
    return;
  }

  var storageAvailable = typeof $persistentStore !== "undefined" &&
    typeof $persistentStore.read === "function";
  var clearMessage = "";
  if (/(?:\?|&)clear=1(?:&|$)/.test(url)) {
    try {
      var scanCleared = $persistentStore.write("{}", SCAN_KEY);
      var testCleared = $persistentStore.write("{}", TEST_KEY);
      clearMessage = scanCleared && testCleared ? "Os dois registros locais desta ferramenta foram apagados." : "Não foi possível apagar todos os registros locais.";
    } catch (error) {
      clearMessage = "O armazenamento local está indisponível.";
    }
  }

  function load(key) {
    if (!storageAvailable) return {};
    try {
      var value = JSON.parse($persistentStore.read(key) || "{}");
      return value && value.schemaVersion === 1 ? value : {};
    } catch (error) {
      return {};
    }
  }
  function text(value, length) {
    return typeof value === "string" ? value.slice(0, length || 180) : "";
  }
  function count(value) {
    var number = Number(value);
    return isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }
  function sku(value) {
    return typeof value === "string" && /^g1\.[A-Za-z0-9._-]{1,160}$/.test(value) ? value : "";
  }
  function rows(value, withTime, defaultTarget) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, 300).filter(function (row) {
      return row && typeof row.id === "string" &&
        /^(?:g1\.|com\.google\.one\.)[A-Za-z0-9._-]{1,160}$/.test(row.id);
    }).map(function (row) {
      var out = { id: row.id, count: count(row.count) };
      if (withTime) {
        out.lastSeen = text(row.lastSeen, 32);
      } else {
        out.to = sku(row.to) || (row.id.indexOf("g1.ios.2tb.") === 0 ? defaultTarget || "" : "");
        out.fallback = row.fallback === true;
      }
      return out;
    }).sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
  }

  var scanStatuses = {
    "new-skus": "Novos IDs encontrados e salvos",
    "known-skus": "Resposta recebida; IDs já registrados",
    "no-skus": "Resposta de texto recebida; nenhum ID de produto encontrado",
    "limit-reached": "Novos IDs recebidos; limite de armazenamento atingido",
    "non-text": "Resposta recebida; o conteúdo não é texto analisável"
  };
  var scanPaths = ["/", "/ai", "/plans", "/_/…/data/batchexecute", "[其他 one.google.com 路径]"];
  function recent(value) {
    if (!Array.isArray(value)) return [];
    return value.slice(-10).filter(function (event) {
      return event && typeof event.at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(event.at) &&
        (event.bodyType === "text" || event.bodyType === "non-text") &&
        Object.prototype.hasOwnProperty.call(scanStatuses, event.status);
    }).map(function (event) {
      return {
        at: event.at,
        path: scanPaths.indexOf(event.path) !== -1 ? event.path : "[其他 one.google.com 路径]",
        bodyType: event.bodyType,
        status: event.status,
        candidateCount: count(event.candidateCount),
        addedCount: count(event.addedCount),
        omittedCount: count(event.omittedCount)
      };
    });
  }

  var scanRaw = load(SCAN_KEY);
  var testRaw = load(TEST_KEY);
  var recordedTarget = sku(testRaw.target);
  if (!recordedTarget && /^(?:pro-annual-test-v[12]|g1-acq-v7(?:\.0|\.1)?)$/.test(testRaw.version || "")) {
    recordedTarget = LEGACY_TARGET;
  }
  var matchedFrom = rows(testRaw.matchedFrom, false, recordedTarget);
  if (!recordedTarget) {
    matchedFrom.some(function (row) {
      if (row.id.indexOf("g1.ios.2tb.") === 0 && row.to) {
        recordedTarget = row.to;
        return true;
      }
      return false;
    });
  }
  var annualHitCount = typeof testRaw.annualHitCount === "number" ? count(testRaw.annualHitCount) :
    matchedFrom.reduce(function (total, row) {
      return total + (row.id.indexOf("g1.ios.2tb.") === 0 ? row.count : 0);
    }, 0);
  var storedOrigin = text(testRaw.targetOrigin, 32);
  var targetOrigin = recordedTarget && /^(?:user-specified|pattern-derived|legacy)$/.test(storedOrigin) ?
    storedOrigin : recordedTarget === CONFIGURED_TARGET ? "user-specified" :
      recordedTarget === LEGACY_TARGET ? "legacy" : "";
  var report = {
    schemaVersion: 1,
    reportVersion: VERSION,
    configuredTarget: CONFIGURED_TARGET,
    storageAvailable: storageAvailable,
    scan: {
      version: text(scanRaw.version, 32),
      updatedAt: text(scanRaw.updatedAt, 32),
      scannedResponses: count(scanRaw.scannedResponses),
      matchedResponses: count(scanRaw.matchedResponses),
      nonTextResponses: count(scanRaw.nonTextResponses),
      recentResponses: recent(scanRaw.recentResponses),
      truncated: scanRaw.truncated === true,
      limit: 300,
      skus: rows(scanRaw.skus, true)
    },
    test: {
      version: text(testRaw.version, 32),
      updatedAt: text(testRaw.updatedAt, 32),
      sourcePrefix: "g1.ios.2tb.",
      target: recordedTarget,
      targetOrigin: targetOrigin,
      status: text(testRaw.status, 32),
      hitCount: count(testRaw.hitCount),
      annualHitCount: annualHitCount,
      matchedFrom: matchedFrom
    }
  };

  var headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-G1-Report-Version": VERSION,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
  };
  var exportJSON = /(?:\?|&)format=json(?:&|$)/.test(url);
  console.log("[g1-sku-report] " + VERSION + " " + (exportJSON ? "json" : "html") +
    " storage=" + (storageAvailable ? "ready" : "unavailable") + " candidates=" + report.scan.skus.length);
  if (exportJSON) {
    headers["Content-Type"] = "application/json; charset=utf-8";
    headers["Content-Disposition"] = 'attachment; filename="g1-sku-report.json"';
    $done({ response: { status: 200, headers: headers, body: JSON.stringify(report, null, 2) } });
    return;
  }

  function escape(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }
  function table(items, withTime) {
    if (!items.length) return "<p>Nenhum registro ainda.</p>";
    return "<div class=scroll><table><thead><tr><th>ID completo do produto</th><th>Ocorrências</th>" +
      (withTime ? "<th>Última identificação (UTC)</th>" : "<th>SKU de destino aplicado</th><th>Alternativa</th>") + "</tr></thead><tbody>" +
      items.map(function (row) {
        return "<tr><td><code>" + escape(row.id) + "</code></td><td>" + row.count + "</td>" +
          (withTime ? "<td>" + escape(row.lastSeen) + "</td>" :
            "<td><code>" + escape(row.to || "Não registrado") + "</code></td><td>" + (row.fallback ? "75p" : "Não") + "</td>") + "</tr>";
      }).join("") + "</tbody></table></div>";
  }
  function recentTable(events) {
    if (!events.length) return "<p>Nenhuma resposta registrada individualmente. Os registros antigos podem não incluir este diagnóstico.</p>";
    return "<div class=scroll><table><thead><tr><th>Horário (UTC)</th><th>Categoria do caminho</th><th>Resultado</th><th>IDs encontrados</th><th>Novos IDs salvos</th><th>IDs acima do limite</th></tr></thead><tbody>" +
      events.slice().reverse().map(function (event) {
        return "<tr><td>" + escape(event.at) + "</td><td>" + escape(event.path === "[其他 one.google.com 路径]" ? "[Outro caminho de one.google.com]" : event.path) +
          "</td><td>" + scanStatuses[event.status] + "</td><td>" + event.candidateCount +
          "</td><td>" + event.addedCount + "</td><td>" + event.omittedCount + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  var latestScan = report.scan.recentResponses.length ?
    report.scan.recentResponses[report.scan.recentResponses.length - 1] : null;
  var scanVersionStatus = report.scan.version === COLLECTOR_VERSION ?
    "Registros desta versão do coletor. Compare os horários e contadores para identificar novas atividades." :
    report.scan.version ? "Registros de uma versão anterior; nenhuma resposta desta versão foi salva ainda." : "Nenhuma resposta desta versão foi salva ainda.";
  var statuses = {
    "rewritten": "Substituições de texto aplicadas",
    "no-match": "Nenhum produto de origem corresponde aos três mapeamentos",
    "non-text": "A resposta não contém texto que possa ser processado"
  };
  var status = Object.prototype.hasOwnProperty.call(statuses, report.test.status) ?
    statuses[report.test.status] : "Nenhuma execução registrada";
  if (report.test.version === "pro-annual-test-v1" && report.test.status === "no-match") {
    status = "Registro antigo v1: nenhum prefixo iOS de 2 TB correspondeu";
  }
  var html = [
    "<!doctype html><html lang=pt-BR><meta charset=utf-8>",
    "<meta name=viewport content=\"width=device-width,initial-scale=1\"><title>Google One — Relatório local de SKUs</title>",
    "<style>body{font:16px/1.6 -apple-system,BlinkMacSystemFont,sans-serif;max-width:960px;margin:24px auto;padding:0 18px;color:#1c2737;background:#f5f7fa}section{background:white;border:1px solid #dde3ec;border-radius:12px;padding:18px;margin:18px 0}h1{font-size:24px;margin-bottom:10px}h2{font-size:20px}code{overflow-wrap:anywhere}a{color:#1259be}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:9px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.scroll{overflow:auto}.note{color:#46556b}.badge{display:inline-block;background:#e0f4e8;color:#176238;padding:4px 10px;border-radius:8px}.actions{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:20px 0}.actions form{margin:0}button,.actions a{font:inherit;padding:10px 16px;border:0;border-radius:8px;cursor:pointer;text-decoration:none}.actions a{background:#e4eaf3}.actions button{background:#1259be;color:white}button{background:#e4eaf3;color:#1c2737}</style>",
    "<h1>Google One — Relatório local de SKUs</h1>",
    "<p class=badge>Relatório local ativo · " + VERSION + "</p>",
    ULTRA_TRIAL ? "<section><h2>Teste experimental do Ultra de 30 TB</h2><p>Este módulo usa o candidato <code>g1.ai.ultra.1month_eft.acq</code>. O nome do ID não confirma gratuidade, disponibilidade ou elegibilidade. Confira o produto, o preço inicial e a renovação na tela nativa da App Store antes de confirmar. O destino realmente aplicado em cada execução aparece na tabela de mapeamentos abaixo.</p></section>" : "",
    "<nav class=actions aria-label=\"Ações do relatório\"><form method=get action=\"" + ROOT + "\"><button type=submit name=format value=json>Exportar JSON</button></form><a href=\"" + ROOT + "\">Atualizar relatório</a></nav>",
    "<p class=note>Esta página é gerada pelo Shadowrocket neste aparelho. O endereço usa one.google.com, mas os registros ficam armazenados localmente.</p>",
    "<p class=note>Mantenha apenas um módulo G1 ACQ ativo: primeiro ele coleta os IDs originais e depois aplica os três mapeamentos.</p>",
    clearMessage ? "<p>" + escape(clearMessage) + "</p>" : "",
    storageAvailable ? "" : "<p>O armazenamento local está indisponível; os registros de coleta ainda não foram lidos.</p>",
    "<section><h2>Atividade de coleta</h2>",
    "<p>Versão do coletor: <code>" + escape(report.scan.version || "Nenhum registro") + "</code><br>" + scanVersionStatus + "</p>",
    "<p>Respostas de texto analisadas: " + report.scan.scannedResponses + "; respostas sem texto: " + report.scan.nonTextResponses +
      "; respostas com IDs de produtos: " + report.scan.matchedResponses + "; total de IDs: " + report.scan.skus.length + "</p>",
    "<p>Último registro salvo (UTC): " + escape(report.scan.updatedAt || "Ainda nenhum") + "</p>",
    latestScan ? "<p><strong>Resposta mais recente: " + scanStatuses[latestScan.status] + "</strong><br>Encontrados " +
      latestScan.candidateCount + " IDs distintos; novos IDs salvos: " + latestScan.addedCount + "; IDs acima do limite: " + latestScan.omittedCount + ".</p>" : "",
    "<p class=note>A lista reúne IDs únicos. Receber um ID repetido atualiza suas ocorrências sem aumentar o total de IDs. Anote os contadores e o horário, abra novamente os planos no app Google e atualize este relatório para comparar.</p>",
    "<h3>Últimas 10 respostas</h3>", recentTable(report.scan.recentResponses),
    "<p class=note>Se os contadores aumentarem com IDs repetidos, novas respostas chegaram. Se horário e contadores não mudarem, nenhuma nova resposta foi salva. Confira cache, módulo ativo, descriptografia HTTPS, domínio e mensagens saved=no nos logs. Apenas a categoria do caminho é registrada.</p></section>",
    "<section><h2>Última execução dos três mapeamentos</h2>",
    "<p>Candidato configurado para 2 TB: <code>" + CONFIGURED_TARGET + "</code></p>",
    "<p class=note>Esta versão testa o candidato 12months_ip_90p, cujo ID termina em _ip_90p. Confira produto, preço e periodicidade na tela de compra da App Store.</p>",
    "<p>Versão: " + escape(report.test.version || "Ainda nenhum") + "<br>Estado: " + escape(status) + "; total de substituições: " + report.test.hitCount + "; destas, em 2 TB: " + report.test.annualHitCount + "</p>",
    "<p>Prefixo original de 2 TB: <code>g1.ios.2tb.</code><br>Destino de 2 TB nesta execução: <code>" + escape(report.test.target || "Nenhum registro") + "</code><br>20 TB e 30 TB mantêm os mapeamentos anteriores e a alternativa 75p. Veja os destinos efetivamente aplicados na tabela.<br>Execução (UTC): " + escape(report.test.updatedAt || "Ainda nenhum") + "</p>",
    "<p class=note>Estes são resultados de execução do script. A aceitação do produto, os preços e a periodicidade precisam ser conferidos na tela de compra da App Store.</p>",
    table(report.test.matchedFrom, false), "</section>",
    "<section><h2>SKUs candidatos coletados durante a navegação</h2>",
    "<p>Total de IDs: " + report.scan.skus.length + "; as ocorrências do mesmo ID são agrupadas. Consulte a atividade de coleta acima para distinguir IDs novos e repetidos.</p>",
    "<p class=note>Os IDs são extraídos da resposta original antes das substituições. Esta lista não representa o catálogo completo da loja; destinos inseridos pelo script não entram automaticamente nela.</p>",
    report.scan.truncated ? "<p>O limite de 300 IDs foi atingido. Exporte os registros antes de apagá-los para iniciar outra coleta.</p>" : "",
    table(report.scan.skus, true),
    "<p>Atualização (UTC): " + escape(report.scan.updatedAt || "Ainda nenhum") + "</p></section>",
    "<form method=get action=\"" + ROOT + "\"><button name=clear value=1>Apagar registros de coleta e teste desta ferramenta</button></form>",
    "<p class=note>Atualize esta página depois de navegar pelos planos. Mantenha coletores separados e versões antigas desativados para evitar registros duplicados.</p></html>"
  ].join("");
  $done({ response: { status: 200, headers: headers, body: html } });
})();
