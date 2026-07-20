# Arquitetura

O CriptoEscape é uma aplicação estática. index.html fornece o shell semântico e carrega scripts clássicos com caminhos relativos; isso mantém compatibilidade tanto com file:// quanto com GitHub Pages.

## Camadas

- assets/js/math.js: operações puras de corpo finito e curvas elípticas.
- assets/data/scenarios.js: curvas e cenários validados.
- assets/data/evaluations.js: pré-teste, pós-teste e respostas abertas.
- assets/js/i18n.js: textos da interface e seleção de idioma.
- assets/js/storage.js: adaptador assíncrono de IndexedDB, migração e fallback.
- assets/js/tests.js: diagnóstico compartilhado entre navegador e terminal.
- assets/js/app.js: estado, renderização, eventos, sessões, relatórios e exportações.
- assets/css/styles.css: identidade visual, responsividade e preferências.

Os módulos expõem namespaces somente leitura no objeto window porque scripts ES modules não funcionam de modo uniforme ao abrir HTML diretamente por file://. Nenhum dado digitado pelo usuário é inserido como HTML; saídas abertas usam textContent.

## Fluxo

Entrada → modo → avaliação inicial opcional → atividade/cenário → avaliação final opcional → persistência/painel.

Durante uma sessão, o relógio acumula tempo somente com a aba visível. Cada salvamento registra o estado da atividade, permitindo retomada.

## Limites

A enumeração usa no máximo um milhão de comparações e a interface limita p a 997. Essa escolha evita bloqueios longos e reforça o caráter didático.
