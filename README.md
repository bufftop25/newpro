# newpro — G1 ACQ em português

Versão **v7.5.0-pt-BR.1** para **iOS e Shadowrocket**, baseada em [crhywun/g1-acq](https://github.com/crhywun/g1-acq), versão original v7.5.0, commit `60d46dffac845ad15651aabf9d460e1cde0bfc96`.

O módulo coleta IDs de produtos nas respostas recebidas de `one.google.com`, registra atividades e aplica três mapeamentos de IDs nas respostas de `/ai?`. O relatório é gerado no próprio aparelho e permite exportar os registros em JSON.

**Uma substituição de texto não confirma que a App Store reconhece o produto ou aceita uma promoção. Confira nome, armazenamento, periodicidade, preço inicial e renovação na tela nativa de compra. Os benefícios dependem do estado real da conta Google One.**

## Importar no Shadowrocket

Endereço desta versão, disponível depois da publicação da tag:

```text
https://cdn.jsdelivr.net/gh/bufftop25/newpro@v7.5.0-pt-BR.1/g1-acq-v7.sgmodule
```

1. Adicione esse endereço na área de **Módulos** da configuração em uso no Shadowrocket.
2. Ative apenas **G1 ACQ**. Desative cópias anteriores, o coletor independente e o teste anual separado, caso estejam ativos.
3. Na configuração atual, ative a **descriptografia HTTPS** e confira `one.google.com` nos nomes de host. O módulo acrescenta esse domínio com `%APPEND%`.
4. Se ainda não houver um certificado válido, gere e instale pelo Shadowrocket. No iPhone, conclua em **Ajustes → Geral → VPN e Gerenciamento de Dispositivo** e habilite a confiança em **Geral → Sobre → Ajustes de Confiança de Certificados**. Use o certificado existente se já houver um confiável.
5. Reconecte o Shadowrocket e reabra os planos no app Google.

O `.sgmodule` contém a configuração e os endereços dos scripts; o Shadowrocket baixa os scripts necessários. Não precisa baixar o repositório inteiro. Esse endereço é de **módulo**, não uma assinatura de servidores: importar pelo leitor de assinaturas pode produzir erro de servidor.

A descriptografia permite inspecionar o tráfego de `one.google.com`. A regra de bloqueio de UDP 443 afeta toda a configuração e pode alterar o funcionamento de HTTP/3 de outros aplicativos.

## Abrir e interpretar o relatório

Com módulo e conexão ativos, abra no Safari:

- [Relatório HTML](https://one.google.com/g1-sku-report)
- [Exportação JSON](https://one.google.com/g1-sku-report?format=json)

A página deve mostrar **Relatório local ativo · v7.5.0-pt-BR.1**. Ela é criada pelo script no aparelho; não é um relatório oferecido pelo Google, apesar do domínio na barra de endereço.

O relatório mostra atividade de coleta, últimas 10 respostas, última execução dos três mapeamentos e SKUs candidatos. Os botões são **Exportar JSON**, **Atualizar relatório** e **Apagar registros de coleta e teste desta ferramenta**.

**Erro 404 ou página comum do Google:** a apresentação local não foi interceptada. Confira módulo ativo na configuração selecionada, conexão, HTTPS, certificado confiável, domínio e download do script. O relatório abrir não comprova que o coletor recebeu respostas de planos.

Para verificar a coleta:

1. Anote os contadores e o horário no relatório.
2. No **app Google, do ícone G colorido → gerenciamento do Google One**, abra os planos realmente disponíveis e aguarde carregar.
3. Atualize o relatório e compare horário, contadores e eventos.
4. Confira as condições de qualquer compra na App Store, não apenas no relatório.

IDs repetidos aumentam ocorrências sem aumentar o total de IDs distintos. O módulo não consulta ativamente o catálogo completo: registra somente o que estiver nas respostas recebidas. Reinstalar ou apagar registros não força o Google a enviar novos IDs.

## Mapeamentos mantidos do original

| ID original completo | Destino principal | Alternativa |
|---|---|---|
| ID com prefixo `g1.ios.2tb.` | `g1.2tb.ai.12months_ip_90p` | Nenhuma |
| `g1.ios.20tb.m.v2` | `g1.20tb.3months_ip_90p.acq` | `g1.20tb.3months_ip_75p.acq` |
| `g1.ios.30tb.ai.pro.m` | `g1.ai.ultra.3months_ip_90p.acq` | `g1.ai.ultra.3months_ip_75p.acq` |

O candidato de 2 TB termina em `_ip_90p`, **sem `.acq`**. Foi indicado pelo usuário do projeto original a partir de uma imagem; isso não comprova produto publicado, preço, assinatura anual ou benefícios de 5 TB no iOS. O rótulo histórico `$1.99 × 12 months = $23.88/year` expressa uma soma de 12 meses, não comprova cobrança anual única. `90p` representa a intenção de 90% de desconto, não gratuidade nem garantia de preço.

Para 20 e 30 TB, a alternativa 75p é escolhida independentemente quando 90p não consta no texto original e 75p consta. Se ambos estiverem ausentes, mantém-se o destino principal. São verificações de strings, não consultas à loja.

A coleta abrange `https://one.google.com/`; a substituição limita-se a `https://one.google.com/ai?`. A interface nativa do StoreKit não é reescrita.

## Diagnóstico

| Situação | Interpretação |
|---|---|
| Tudo em zero | Nenhuma coleta salva; abra os planos e confira novamente |
| Relatório novo, coletor antigo | Dados preservados de outra versão; aguarde uma resposta real do coletor atual |
| Contadores aumentam, IDs não mudam | Respostas repetidas; confira ocorrências e `known-skus` |
| `no-skus` | Texto recebido sem IDs reconhecidos |
| `non-text` | Conteúdo não textual |
| Horário e contadores estáveis | Nenhum registro novo salvo; confira cache, módulo, conexão, HTTPS e logs |
| `saved=no` | Falha de gravação; registros anteriores podem continuar aparecendo |
| Substituição registrada, compra falha | A loja não necessariamente aceita o destino aplicado |
| Limite de 300 IDs | Exporte antes de apagar registros; IDs existentes continuam sendo atualizados |

## Armazenamento, versões e privacidade

- Até **300 IDs distintos** e **10 eventos recentes**.
- Chaves preservadas: `g1.sku.scan.v1` e `g1.pro.annual.test.v1`; `schemaVersion: 1`.
- Eventos guardam horário, categoria do caminho, tipo de conteúdo e contadores, sem query, URL completa, cabeçalhos ou corpo completo.
- A categoria histórica de caminho desconhecido mantém seu formato interno para compatibilidade; a apresentação HTML está traduzida.
- O relatório distingue o alvo configurado do alvo salvo em cada execução. Atualizar o módulo não reclassifica dados antigos como novos.
- Os scripts atuais não enviam os registros a servidor externo. Downloads de scripts e módulos utilizam GitHub/jsDelivr.
- O hospedeiro Shadowrocket possui capacidades de rede; futuras atualizações devem ser revisadas.
- `?clear=1` apaga somente as duas chaves da ferramenta. Exportar e atualizar não apagam os dados.

## Arquivos

| Arquivo | Finalidade |
|---|---|
| `g1-acq-v7.sgmodule` | Módulo principal |
| `g1-acq.js` | Coleta, eventos recentes e mapeamentos |
| `g1-sku-report.js` | Relatório em português e exportação |
| `g1-pro-annual-test.sgmodule` | Entrada de compatibilidade limitada a `/ai?`; não ative junto do principal |
| `g1-sku-scan.sgmodule` e `g1-sku-scan.js` | Coletor legado independente |
| `g1-pro-annual-test.js` | Script histórico de compatibilidade |
| `tests/` | Testes com dados sintéticos |
| [Guia detalhado](docs/pro-annual-test.md) | Campos, diagnóstico e modelo de registro |
| [Histórico](CHANGELOG.md) | Alterações desta adaptação |

## Verificação local

Com Node.js 18 ou mais recente, na raiz:

```sh
node --test tests/sku-tools.test.cjs
```

Os testes cobrem mapeamentos, alternativas, coleta, limites, dados antigos, exportação, escape de HTML, limpeza e endereços dos módulos. Não consultam contas reais nem realizam compras.

## Origem e publicação

Esta adaptação mantém a referência e a autoria do [projeto original](https://github.com/crhywun/g1-acq). Não é afiliada ao Google, Apple, Shadowrocket ou jsDelivr. As imagens históricas preservadas podem conter texto no idioma original.

Destino: [bufftop25/newpro](https://github.com/bufftop25/newpro). Os módulos apontam para a tag `v7.5.0-pt-BR.1`. Publique uma nova tag para futuras alterações; não substitua uma versão já distribuída.
