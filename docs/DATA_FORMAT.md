# Formato de dados

O esquema atual é a versão 2. A exportação JSON contém metadados e uma lista sessions.

Campos principais da sessão:

- id: identificador aleatório anônimo;
- classCode: código opcional;
- mode, language, curveId e scenarioId;
- status: active, completed ou abandoned;
- startedAt, updatedAt e completedAt;
- activeMs e pausedMs;
- currentStep, progress e activity;
- steps: início, conclusão, visitas e tempo ativo;
- attempts e hints;
- preTest e postTest, com answers e score;
- openResponses.

Importações antigas passam por uma migração simples que adiciona os campos da versão 2. Registros sem id válido são ignorados.

## Privacidade

Não há nome ou e-mail obrigatório. Entretanto, texto livre pode conter informação identificável digitada voluntariamente. Revise respostas antes de compartilhar exportações.

## Backend futuro

Um backend pode implementar a mesma interface do adaptador: all, get, put, remove, clear e importMany. A interface não precisa conhecer o mecanismo de armazenamento.
