# Guia de coleta e diagnóstico — G1 ACQ em português

Versão **v7.5.0-pt-BR.1**, baseada no G1 ACQ v7.5.0. Consulte também o [README](../README.md).

## 1. Instalação e conexão

Importe na área de Módulos da configuração atual:

```text
https://cdn.jsdelivr.net/gh/bufftop25/newpro@v7.5.0-pt-BR.1/g1-acq-v7.sgmodule
```

Ative somente uma cópia do coletor. Desative versões antigas e os módulos separados de teste anual e SKU Scan. Ative a descriptografia HTTPS, confira `one.google.com` nos nomes de host e use um certificado instalado e confiável no iOS. Reconecte depois das alterações.

O módulo descriptografa o tráfego desse domínio. A regra UDP 443 pode afetar HTTP/3 em outros aplicativos.

## 2. Conferir o relatório e coletar

No Safari, abra `https://one.google.com/g1-sku-report`. Confira **Relatório local ativo · v7.5.0-pt-BR.1**. Uma página comum do Google ou 404 não é o relatório local.

Anote contadores, versão real do coletor e horário. Abra o gerenciamento do Google One no app Google e navegue pelos planos realmente oferecidos à conta. Aguarde carregar e atualize o relatório.

IDs `g1.*` e `com.google.one.*` são extraídos da resposta original. Destinos inseridos pelo script não viram candidatos coletados. Repetições atualizam ocorrência e data. Um total estável não significa falha. O limite é de 300 IDs únicos.

O relatório pode estar atualizado enquanto o coletor ainda não recebeu respostas. Preserve o histórico para comparar; reinstalar e limpar não força novos produtos.

## 3. Mapeamentos

| Origem | Alvo principal | Alternativa |
|---|---|---|
| Prefixo `g1.ios.2tb.` | `g1.2tb.ai.12months_ip_90p` | Nenhuma |
| `g1.ios.20tb.m.v2` | `g1.20tb.3months_ip_90p.acq` | `g1.20tb.3months_ip_75p.acq` |
| `g1.ios.30tb.ai.pro.m` | `g1.ai.ultra.3months_ip_90p.acq` | `g1.ai.ultra.3months_ip_75p.acq` |

2 TB não possui `.acq` no alvo. Para 20/30 TB, aplica-se a alternativa somente quando o alvo principal não aparece no texto original e a alternativa aparece. Se ambos estão ausentes, mantém-se o principal. Cada plano é avaliado separadamente.

A coleta abrange respostas de `one.google.com`; o mapeamento atua apenas em `/ai?`. Não altera a interface nativa do StoreKit nem os preços. O candidato de 2 TB veio de uma imagem fornecida no projeto original e não é comprovação de produto válido ou benefício de 5 TB. Os termos `12months`, `annual` e `90p` não comprovam cobrança anual, elegibilidade ou gratuidade.

Confira produto, armazenamento, preço inicial, periodicidade e renovação na App Store. Uma execução `rewritten` somente confirma alteração de texto.

## 4. Campos da coleta

| Campo JSON | Significado |
|---|---|
| `reportVersion` | Versão que montou o relatório |
| `scan.version` | Versão do coletor que efetivamente salvou os dados |
| `scan.scannedResponses` | Quantidade de respostas de texto processadas |
| `scan.matchedResponses` | Respostas com IDs reconhecidos, inclusive repetidos |
| `scan.nonTextResponses` | Respostas sem conteúdo textual |
| `scan.updatedAt` | Último registro salvo |
| `scan.skus` | IDs com `id`, `count` e `lastSeen` |
| `scan.truncated` | Capacidade de IDs ultrapassada |
| `scan.recentResponses` | Últimos 10 eventos |

Cada evento possui `at`, `path`, `bodyType`, `status`, `candidateCount`, `addedCount` e `omittedCount`. O JSON conserva a ordem de chegada, do mais antigo ao mais novo; o HTML mostra primeiro o mais recente.

| Estado | Significado |
|---|---|
| `new-skus` | Novos IDs salvos |
| `known-skus` | Somente IDs já registrados |
| `no-skus` | Texto recebido sem IDs reconhecidos |
| `limit-reached` | Nenhum ID novo salvo e houve descarte por falta de espaço |
| `non-text` | Conteúdo não textual |

Se novos IDs forem salvos e outros descartados na mesma resposta, prevalece `new-skus`. Candidatos e descartes contam IDs distintos naquela resposta; as ocorrências de cada SKU contam aparições no texto.

Os caminhos são categorias: `/`, `/ai`, `/plans`, `/_/…/data/batchexecute` ou outro caminho do domínio. Não são guardados parâmetros, cabeçalhos ou resposta completa. A categoria desconhecida histórica é preservada nos dados e traduzida na interface.

## 5. Campos de mapeamento e compatibilidade

| Campo | Significado |
|---|---|
| `configuredTarget` | Alvo atual configurado para 2 TB |
| `test.version` | Versão que salvou a execução |
| `test.target` | Alvo de 2 TB daquela execução, mesmo se antigo |
| `test.targetOrigin` | `user-specified`, `pattern-derived` ou `legacy` |
| `test.hitCount` | Total de substituições nos três grupos |
| `test.annualHitCount` | Substituições de 2 TB; o nome não comprova cobrança anual |
| `test.matchedFrom` | Origem `id`, destino `to`, ocorrências `count` e alternativa `fallback` |
| `test.updatedAt` | Horário da execução |
| `test.status` | `rewritten`, `no-match` ou `non-text` |

`rewritten` pode representar apenas 20/30 TB; consulte as linhas e o subtotal de 2 TB. Alvos históricos v1 e v7.1 a v7.4 não são substituídos pelo candidato atual dentro dos registros. Dados antigos sem eventos recentes não recebem históricos inventados.

Chaves preservadas: `g1.sku.scan.v1` e `g1.pro.annual.test.v1`, com `schemaVersion: 1`.

## 6. Exportação, limpeza e problemas comuns

Use **Exportar JSON** ou `https://one.google.com/g1-sku-report?format=json`. Atualizar somente relê os registros.

O botão **Apagar registros de coleta e teste desta ferramenta** usa `?clear=1` e apaga somente as duas chaves. Exporte antes de limpar e volte ao endereço sem esse parâmetro para não apagar novamente ao atualizar.

Se contadores e horários não mudarem, confira versão real do coletor, conexão, módulo selecionado, certificado, descriptografia, domínio, cache e logs. `saved=no` ou coleta indisponível pode indicar falha de gravação. Ausência de registro não prova indisponibilidade de uma oferta.

O coletor independente antigo não inclui os eventos recentes; o relatório identifica esses dados como antigos. Isso não comprova defeito no aparelho.

Se uma substituição estiver registrada e a compra falhar, registre a mensagem real da loja e o destino aplicado. Não trate o mapeamento como confirmação de preço ou elegibilidade.

## 7. Modelo de registro de teste

```text
Data e fuso horário:
Versões do iOS, app Google e Shadowrocket:
Módulo ativo e endereço:
Versões do relatório e do coletor:
Contadores antes/depois: texto, com IDs, sem texto:
Horário antes/depois:
Estado, candidatos, novos e descartados do último evento:
Plano realmente aberto no app Google:
IDs originais coletados:
Origem, destino e alternativa de cada substituição:
Total de substituições e subtotal de 2 TB:
Produto apresentado na App Store:
Moeda, preço inicial, periodicidade e renovação:
Erro da loja, se houver:
Compra realmente concluída: sim/não:
Benefícios reais, somente se a compra foi concluída:
Arquivo JSON exportado:
```

Não publique dados pessoais ou recibos completos. Testes locais com strings sintéticas não substituem a conferência na loja.
