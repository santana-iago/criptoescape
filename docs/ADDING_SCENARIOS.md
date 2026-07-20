# Adicionando curvas e cenários

## Nova curva

1. Adicione o registro em assets/data/scenarios.js.
2. Informe p, a, b, groupOrder, factors, base, baseOrder, privateKey, publicKey e points.
3. Confirme que 4a³ + 27b² não é zero módulo p.
4. Confirme pertencimento e ordens com CryptoMath.
5. Inclua um teste de regressão quando o cenário depender de um resultado específico.

## Novo cenário

1. Adicione id, nameKey, summaryKey, causeKey, countermeasureKey e recommendedCurve.
2. Escolha kind escape, demonstration ou comparison.
3. Traduza todas as chaves.
4. Acrescente a demonstração em renderScenario e runScenario.
5. Registre tentativas e marque a conclusão com complete.
6. Mantenha parâmetros pequenos, narrativa defensiva e causa raiz explícita.

Não inclua endpoints, cargas reais, parâmetros de produção ou automação ofensiva.
