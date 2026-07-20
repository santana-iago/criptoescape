# CriptoEscape

**CriptoEscape** é um laboratório educacional estático, em formato de escape room, para o ensino de aritmética modular, teoria de grupos e segurança em curvas elípticas. A aplicação funciona em HTML, CSS e JavaScript puro, sem build, backend ou dependências externas.

O cenário padrão foi preservado:

| Parâmetro | Valor |
|---|---:|
| Curva | y² ≡ x³ + 2x + 7 (mod 97) |
| Ordem do grupo | 105 = 3 · 5 · 7 |
| Ponto-base | (8, 27), ordem 105 |
| Chave privada didática | 53 |
| Chave pública | (49, 44) |
| Pontos investigados | (61,18), (16,35), (27,21) |
| Ordens | 3, 5, 7 |
| Resíduos | 2 mod 3, 3 mod 5, 4 mod 7 |
| Solução por TCR | 53 mod 105 |

> Os parâmetros são deliberadamente pequenos. Não são adequados para criptografia real.

## Funcionalidades

- cenário original de confinamento em subgrupos pequenos, matematicamente idêntico ao protótipo;
- cenários de ponto inválido, validação incompleta e parâmetros fracos;
- curvas didáticas predefinidas e curva personalizada com validação;
- cálculo de ordem do grupo, fatoração, ordem de ponto e chave pública;
- limites de p ≤ 997 e até 12 pontos personalizados para proteger a interface;
- modos livre, estudante e instrutor/análise;
- pré-teste, pós-teste, correção automática e ganho de pontuação;
- respostas abertas com salvamento automático e contador;
- tempo ativo, tempo pausado, visitas, tentativas e uso de dicas;
- retomada da sessão após recarregar;
- persistência em IndexedDB, com fallback local;
- painel com filtros, ordenação, pesquisa, métricas e gráficos SVG;
- importação de múltiplos JSON e exportação em JSON/CSV;
- português do Brasil, inglês e espanhol;
- preferências de acessibilidade e navegação móvel;
- diagnóstico interno em index.html?debug=1.

## Como executar

Abra index.html em um navegador moderno. Os scripts usam caminhos relativos e não exigem servidor.

Servidor local opcional:

~~~bash
python3 -m http.server 8000
~~~

Acesse http://localhost:8000/.

### Testes

~~~bash
node tests/run-tests.js
~~~

O teste confirma, entre outros itens:

- #E(F₉₇) = 105;
- ordens 3, 5 e 7;
- TCR igual a 53 mod 105;
- 53 · (8,27) = (49,44).

Também é possível abrir index.html?debug=1 para executar os testes no navegador, incluindo persistência e importação.

## GitHub Pages

1. Envie a raiz do projeto para a branch publicada.
2. Em **Settings → Pages**, selecione **Deploy from a branch**.
3. Escolha a branch e a pasta **/ (root)**.
4. Valide:

~~~text
https://santana-iago.github.io/criptoescape/
https://santana-iago.github.io/criptoescape/?debug=1
~~~

Não há rotas de SPA, caminhos absolutos, build ou segredo de servidor.

## Estrutura

~~~text
criptoescape/
├── index.html
├── assets/
│   ├── css/styles.css
│   ├── data/evaluations.js
│   ├── data/scenarios.js
│   └── js/
│       ├── app.js
│       ├── i18n.js
│       ├── math.js
│       ├── storage.js
│       └── tests.js
├── tests/run-tests.js
├── docs/
│   ├── ACCESSIBILITY.md
│   ├── ADDING_SCENARIOS.md
│   ├── ARCHITECTURE.md
│   ├── DATA_FORMAT.md
│   └── PILOT_GUIDE.md
├── README.md
└── LICENSE
~~~

## Configuração e extensão

### Adicionar uma curva

Inclua um registro em assets/data/scenarios.js com p, a, b, ordem, fatoração, ponto-base, ordem do ponto-base, chave privada, chave pública e pontos validados. Execute os testes depois. O catálogo é separado da interface.

### Adicionar um cenário

Adicione a descrição e a curva recomendada em assets/data/scenarios.js, traduza suas chaves em assets/js/i18n.js e implemente a demonstração educacional em assets/js/app.js. Consulte [docs/ADDING_SCENARIOS.md](docs/ADDING_SCENARIOS.md).

### Editar avaliações

As questões ficam em assets/data/evaluations.js. Tipos disponíveis: choice, number, likert e open. Questões corrigíveis têm a propriedade answer; concept alimenta o painel.

### Adicionar idioma

Adicione o código em CriptoI18n.supported, crie o dicionário correspondente em assets/js/i18n.js e traduza os campos localizados das avaliações. Fórmulas e identificadores matemáticos devem permanecer invariantes.

## Dados, importação e privacidade

Sessões estruturadas usam IndexedDB; preferências simples usam localStorage. O aplicativo não usa cookies de rastreamento, analytics nem transmissão externa.

No GitHub Pages, cada navegador possui sua própria base. Para consolidar uma turma:

1. cada estudante exporta o JSON da sessão;
2. o instrutor abre o painel;
3. importa um ou mais arquivos JSON;
4. filtra e exporta o consolidado em CSV ou JSON.

A limpeza de dados exige confirmação. Consulte [docs/DATA_FORMAT.md](docs/DATA_FORMAT.md) e [docs/PILOT_GUIDE.md](docs/PILOT_GUIDE.md).

## Acessibilidade e responsividade

A interface inclui landmarks, hierarquia de títulos, labels, foco visível, região aria-live, link para pular conteúdo, diálogos nativos, tabelas com cabeçalhos, gráfico com descrição acessível, menu móvel e áreas de toque adequadas. Há preferências opcionais de tamanho de texto, contraste, redução de movimento, fonte legível e ocultação decorativa.

O CSS foi projetado para 320, 375, 425, 768, 1024, 1366 e 1920 px, além de zoom de 200%. Tabelas e consoles têm rolagem interna quando necessário. Consulte [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md).

## Compatibilidade

Compatível com versões modernas de Firefox, Chromium/Chrome, Edge e Safari que ofereçam JavaScript ES2017, IndexedDB e dialog. Se IndexedDB estiver indisponível, as sessões usam um fallback local; em navegadores antigos, a experiência de diálogo pode variar.

## Limitações

- não existe sincronização automática entre dispositivos;
- o identificador é anônimo, mas respostas abertas podem conter dados pessoais se o participante os digitar;
- enumeração de grupos é intencionalmente limitada a curvas pequenas;
- os cenários não implementam criptografia de produção nem ferramentas ofensivas reais;
- a persistência depende das políticas de armazenamento e limpeza do navegador.

## Autores

- Iago Soares Santana — Engenharia de Computação, CEFET-MG
- Bernardo Vieira Rocha — Engenharia de Computação, CEFET-MG
- Renan Cabral Costa Cunningham — Engenharia de Computação, CEFET-MG
- Divane Aparecida de Moraes Dantas — Universidade Federal de Minas Gerais
- Frederico Augusto Menezes Ribeiro — CEFET-MG

## Licença

MIT. Consulte [LICENSE](LICENSE).
