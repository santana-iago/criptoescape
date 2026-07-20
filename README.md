# CriptoEscape

[![Status](https://img.shields.io/badge/status-protótipo-2ea44f)](#status-do-projeto)
[![HTML5](https://img.shields.io/badge/HTML5-single--file-E34F26?logo=html5&logoColor=white)](#tecnologias)
[![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-F7DF1E?logo=javascript&logoColor=000)](#tecnologias)
[![Execução](https://img.shields.io/badge/execução-offline-4da3ff)](#como-executar)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**CriptoEscape** é um laboratório educacional digital em formato de *escape room* para o ensino de aritmética modular, teoria de grupos e segurança em curvas elípticas.

A atividade conduz o participante por uma investigação técnica sobre uma implementação vulnerável do protocolo ECDH. Ao longo das etapas, o usuário valida pontos, determina ordens de elementos, obtém congruências, aplica o Teorema Chinês do Resto e compara uma implementação vulnerável com uma versão segura.

---

## Visão geral

O projeto transforma conceitos matemáticos abstratos em uma sequência interativa de desafios. Cada etapa funciona como um “cadeado”: o participante precisa realizar os cálculos e validá-los no sistema para avançar.

O cenário utiliza a curva didática:

$$
y^2 \equiv x^3 + 2x + 7 \pmod{97}
$$

O grupo de pontos da curva possui ordem:

$$
\left|E(\mathbb{F}_{97})\right| = 105 = 3 \cdot 5 \cdot 7
$$

A escolha de uma ordem totalmente suave permite demonstrar, de forma controlada e executável à mão, a recuperação da chave privada a partir de subgrupos de pequenas ordens.

---

## Objetivos educacionais

O CriptoEscape foi desenvolvido para apoiar o ensino de:

- congruências e aritmética modular;
- curvas elípticas sobre corpos finitos;
- estrutura de grupos e ordem de elementos;
- Teorema de Lagrange;
- Teorema Chinês do Resto;
- multiplicação escalar em curvas elípticas;
- ataque de subgrupo pequeno;
- redução de Pohlig–Hellman;
- validação segura de chaves públicas em ECDH.

---

## Fluxo da atividade

### 1. Contexto do incidente

O participante recebe o cenário de um servidor que calcula `d · P` para qualquer ponto enviado, sem validar adequadamente a chave pública recebida.

### 2. Validação dos pontos

São analisados os pontos:

- `P₁ = (61, 18)`
- `P₂ = (16, 35)`
- `P₃ = (27, 21)`

O usuário verifica se cada par satisfaz a equação da curva módulo 97.

### 3. Determinação das ordens

Por somas sucessivas, o participante encontra:

- `ord(P₁) = 3`
- `ord(P₂) = 5`
- `ord(P₃) = 7`

O servidor vulnerável então revela informações equivalentes a:

$$
d \equiv 2 \pmod{3}
$$

$$
d \equiv 3 \pmod{5}
$$

$$
d \equiv 4 \pmod{7}
$$

### 4. Reconstrução da chave

Aplicando o Teorema Chinês do Resto:

$$
d \equiv 53 \pmod{105}
$$

O sistema realiza uma verificação independente usando o ponto-base e a chave pública do servidor.

### 5. Correção defensiva

A mesma entrada é executada em dois modos:

- **modo vulnerável:** realiza a multiplicação sem validação;
- **modo seguro:** verifica corpo finito, pertencimento à curva, ponto no infinito e ordem esperada antes da operação ECDH.

### 6. Relatório técnico

Ao final, o protótipo apresenta uma síntese do incidente, da causa raiz, da matemática utilizada e da contramedida aplicada.

---

## Funcionalidades

- navegação por etapas;
- validação de respostas;
- cálculo de pertencimento à curva;
- soma de pontos;
- multiplicação escalar;
- cálculo da ordem de pontos;
- simulação de um servidor ECDH vulnerável;
- reconstrução da chave pelo Teorema Chinês do Resto;
- comparação entre implementação vulnerável e segura;
- geração de relatório técnico;
- execução totalmente local;
- funcionamento sem conexão com a internet.

---

## Tecnologias

O projeto foi construído sem frameworks ou dependências externas:

- **HTML5**
- **CSS3**
- **JavaScript puro**

Todo o código da aplicação, incluindo interface, estilos e modelo matemático, está concentrado em um único arquivo.

---

## Como executar

### Opção 1 — Abrir diretamente

1. Baixe ou clone o repositório.
2. Abra o arquivo `index.html` em um navegador moderno.

Não é necessário instalar dependências, iniciar servidor ou manter conexão com a internet.

### Opção 2 — Clonar o repositório

```bash
git clone https://github.com/santana-iago/criptoescape.git
cd criptoescape
```

Depois, abra `index.html` no navegador.

### Opção 3 — Servidor local

Também é possível executar com um servidor HTTP simples:

```bash
python3 -m http.server 8000
```

Acesse:

```text
http://localhost:8000
```

---

## Estrutura sugerida do repositório

```text
criptoescape/
├── index.html
├── README.md
├── LICENSE
└── docs/
    ├── artigo.pdf
    └── imagens/
```

O protótipo não exige a pasta `docs` para funcionar. Ela pode ser usada apenas para armazenar documentação, artigo e materiais de divulgação.

---

## Publicação com GitHub Pages

Como a aplicação é estática e autossuficiente, ela pode ser publicada diretamente com GitHub Pages.

1. Acesse **Settings** no repositório.
2. Abra a seção **Pages**.
3. Em **Build and deployment**, selecione **Deploy from a branch**.
4. Escolha a branch `main` e a pasta `/ (root)`.
5. Salve a configuração.

Após a publicação, a aplicação ficará disponível em um endereço semelhante a:

```text
https://santana-iago.github.io/criptoescape/
```

---

## Modelo matemático

O protótipo utiliza a curva:

$$
E: y^2 \equiv x^3 + 2x + 7 \pmod{97}
$$

Parâmetros principais:

| Parâmetro | Valor |
|---|---:|
| Corpo finito | `F₉₇` |
| Ordem do grupo | `105` |
| Fatoração | `3 · 5 · 7` |
| Ponto-base | `(8, 27)` |
| Chave pública do servidor | `(49, 44)` |
| Chave privada do cenário | `53` |

> Este cenário é deliberadamente reduzido e didático. Ele não deve ser utilizado como referência para seleção de parâmetros criptográficos reais.

---

## Segurança demonstrada

A vulnerabilidade central é a ausência de validação completa da chave pública antes da operação ECDH.

Uma implementação segura deve verificar, no mínimo:

1. se as coordenadas pertencem ao corpo finito esperado;
2. se o ponto satisfaz a equação da curva;
3. se o ponto não é o ponto no infinito;
4. se o ponto pertence ao subgrupo correto ou possui a ordem esperada.

O protótipo é exclusivamente educacional e não implementa criptografia destinada a ambientes de produção.

---

## Limitações

- utiliza parâmetros pequenos para permitir cálculos manuais;
- não representa uma curva criptográfica de uso real;
- foi projetado para demonstração e ensino;
- não substitui bibliotecas criptográficas auditadas;
- não deve ser empregado em sistemas de segurança reais.

---

## Status do projeto

**Protótipo funcional.**

Possíveis evoluções:

- aplicação piloto com estudantes;
- pré-teste e pós-teste;
- registro de tempo por etapa;
- coleta de respostas abertas;
- novos cenários de ataque;
- painel de resultados;
- internacionalização da interface;
- adaptação para acessibilidade.

---

## Autores

- **Iago Soares Santana** — Engenharia de Computação, CEFET-MG
- **Bernardo Vieira Rocha** — Engenharia de Computação, CEFET-MG
- **Renan Cabral Costa Cunningham** — Engenharia de Computação, CEFET-MG
- **Divane Aparecida de Moraes Dantas** — Universidade Federal de Minas Gerais
- **Frederico Augusto Menezes Ribeiro** — CEFET-MG

---

## Referências

- ANTIPA, A. et al. *Validation of elliptic curve public keys*. Public Key Cryptography — PKC 2003. Berlin: Springer, 2003.
- FUENTES-CABRERA, A. et al. *Learning mathematics with emerging methodologies: the escape room as a case study*. Mathematics, v. 8, n. 9, 1586, 2020.
- HANKERSON, D.; MENEZES, A.; VANSTONE, S. *Guide to elliptic curve cryptography*. New York: Springer, 2004.
- POHLIG, S. C.; HELLMAN, M. E. *An improved algorithm for computing logarithms over GF(p) and its cryptographic significance*. IEEE Transactions on Information Theory, 1978.

---

## Como citar

```text
CRIPTOESCAPE. Protótipo demonstrativo da aplicação.
Belo Horizonte: CEFET-MG, 2026.
```

---

## Licença

Este projeto é distribuído sob a **MIT License**. Consulte o arquivo [`LICENSE`](LICENSE) para conhecer os termos de uso, cópia, modificação e distribuição.
