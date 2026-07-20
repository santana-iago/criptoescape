(function (global) {
  "use strict";

  function tx(pt, en, es) { return { "pt-BR": pt, en: en, es: es }; }

  var pre = [
    {
      id: "pre_mod",
      concept: "modularArithmetic",
      type: "number",
      prompt: tx("Quanto é 324 mod 97?", "What is 324 mod 97?", "¿Cuánto es 324 mod 97?"),
      answer: 33
    },
    {
      id: "pre_curve",
      concept: "curveMembership",
      type: "choice",
      prompt: tx("Quando um par (x,y) pertence a uma curva elíptica sobre Fₚ?", "When does a pair (x,y) belong to an elliptic curve over Fₚ?", "¿Cuándo pertenece un par (x,y) a una curva elíptica sobre Fₚ?"),
      options: [
        tx("Quando satisfaz a equação da curva módulo p", "When it satisfies the curve equation modulo p", "Cuando satisface la ecuación de la curva módulo p"),
        tx("Quando x e y são primos", "When x and y are prime", "Cuando x e y son primos"),
        tx("Quando x = y", "When x = y", "Cuando x = y")
      ],
      answer: 0
    },
    {
      id: "pre_order",
      concept: "elementOrder",
      type: "choice",
      prompt: tx("A ordem de um ponto P é:", "The order of a point P is:", "El orden de un punto P es:"),
      options: [
        tx("O menor n > 0 tal que nP = O", "The least n > 0 such that nP = O", "El menor n > 0 tal que nP = O"),
        tx("A coordenada x de P", "The x coordinate of P", "La coordenada x de P"),
        tx("Sempre igual a p", "Always equal to p", "Siempre igual a p")
      ],
      answer: 0
    },
    {
      id: "pre_lagrange",
      concept: "lagrange",
      type: "choice",
      prompt: tx("Se #E = 105, qual valor pode ser ordem de um ponto?", "If #E = 105, which value can be a point order?", "Si #E = 105, ¿qué valor puede ser el orden de un punto?"),
      options: [tx("7", "7", "7"), tx("8", "8", "8"), tx("11", "11", "11")],
      answer: 0
    },
    {
      id: "pre_crt",
      concept: "crt",
      type: "choice",
      prompt: tx("O TCR combina principalmente:", "The CRT primarily combines:", "El TCR combina principalmente:"),
      options: [
        tx("Congruências com módulos compatíveis", "Congruences with compatible moduli", "Congruencias con módulos compatibles"),
        tx("Coordenadas cartesianas", "Cartesian coordinates", "Coordenadas cartesianas"),
        tx("Números reais aproximados", "Approximate real numbers", "Números reales aproximados")
      ],
      answer: 0
    },
    {
      id: "pre_validation",
      concept: "publicKeyValidation",
      type: "choice",
      prompt: tx("Uma chave pública de curva elíptica deve ser aceita após verificar apenas as coordenadas?", "Should an elliptic-curve public key be accepted after checking only its coordinates?", "¿Debe aceptarse una clave pública de curva elíptica tras comprobar solo sus coordenadas?"),
      options: [
        tx("Não; também é preciso validar curva, infinito e subgrupo", "No; curve, infinity and subgroup must also be validated", "No; también deben validarse curva, infinito y subgrupo"),
        tx("Sim, sempre", "Yes, always", "Sí, siempre")
      ],
      answer: 0
    },
    {
      id: "pre_confidence",
      concept: "perception",
      type: "likert",
      prompt: tx("Sinto-me confiante para explicar esses conceitos.", "I feel confident explaining these concepts.", "Me siento capaz de explicar estos conceptos.")
    }
  ];

  var post = [
    {
      id: "post_mod",
      concept: "modularArithmetic",
      type: "number",
      prompt: tx("Quanto é 18² mod 97?", "What is 18² mod 97?", "¿Cuánto es 18² mod 97?"),
      answer: 33
    },
    {
      id: "post_order",
      concept: "elementOrder",
      type: "choice",
      prompt: tx("Por que um ponto de ordem pequena pode vazar informação sobre d?", "Why can a small-order point leak information about d?", "¿Por qué un punto de orden pequeño puede filtrar información sobre d?"),
      options: [
        tx("Porque dP depende apenas de d módulo a ordem de P", "Because dP depends only on d modulo the order of P", "Porque dP depende solo de d módulo el orden de P"),
        tx("Porque altera o módulo primo", "Because it changes the prime modulus", "Porque cambia el módulo primo"),
        tx("Porque torna x negativo", "Because it makes x negative", "Porque vuelve x negativo")
      ],
      answer: 0
    },
    {
      id: "post_crt",
      concept: "crt",
      type: "number",
      prompt: tx("Resolva d ≡ 2 (mod 3), 3 (mod 5), 4 (mod 7), com 0 ≤ d < 105.", "Solve d ≡ 2 (mod 3), 3 (mod 5), 4 (mod 7), with 0 ≤ d < 105.", "Resuelve d ≡ 2 (mod 3), 3 (mod 5), 4 (mod 7), con 0 ≤ d < 105."),
      answer: 53
    },
    {
      id: "post_vulnerability",
      concept: "vulnerability",
      type: "choice",
      prompt: tx("Qual é a causa raiz do cenário padrão?", "What is the root cause in the default scenario?", "¿Cuál es la causa raíz del escenario predeterminado?"),
      options: [
        tx("Ausência de validação completa da chave pública", "Missing complete public-key validation", "Falta de validación completa de la clave pública"),
        tx("Uso de uma tela escura", "Use of a dark screen", "Uso de una pantalla oscura"),
        tx("Erro no TCR", "A CRT error", "Un error en el TCR")
      ],
      answer: 0
    },
    {
      id: "post_countermeasure",
      concept: "publicKeyValidation",
      type: "choice",
      prompt: tx("Qual conjunto descreve a validação completa?", "Which set describes complete validation?", "¿Qué conjunto describe la validación completa?"),
      options: [
        tx("Corpo, pertencimento, não infinito e subgrupo esperado", "Field, membership, non-infinity and expected subgroup", "Cuerpo, pertenencia, no infinito y subgrupo esperado"),
        tx("Apenas formato das coordenadas", "Coordinate format only", "Solo formato de coordenadas")
      ],
      answer: 0
    },
    {
      id: "post_learning",
      concept: "perception",
      type: "likert",
      prompt: tx("A atividade aumentou minha compreensão.", "The activity improved my understanding.", "La actividad mejoró mi comprensión.")
    },
    {
      id: "post_difficulty",
      concept: "difficulty",
      type: "likert",
      prompt: tx("A atividade foi difícil para mim.", "The activity was difficult for me.", "La actividad fue difícil para mí.")
    },
    {
      id: "post_clarity",
      concept: "clarity",
      type: "likert",
      prompt: tx("As instruções foram claras.", "The instructions were clear.", "Las instrucciones fueron claras.")
    },
    {
      id: "post_escape",
      concept: "usefulness",
      type: "likert",
      prompt: tx("O formato de escape room foi útil para aprender.", "The escape-room format was useful for learning.", "El formato escape room fue útil para aprender.")
    },
    {
      id: "post_reflection",
      concept: "reflection",
      type: "open",
      prompt: tx("O que mudou na sua compreensão após a atividade?", "What changed in your understanding after the activity?", "¿Qué cambió en tu comprensión después de la actividad?"),
      maxLength: 1000
    }
  ];

  var openPrompts = [
    { id: "hypothesis", step: 0, prompt: tx("Qual é sua hipótese inicial sobre a vulnerabilidade?", "What is your initial hypothesis about the vulnerability?", "¿Cuál es tu hipótesis inicial sobre la vulnerabilidad?") },
    { id: "orderImportance", step: 2, prompt: tx("Explique por que a ordem do ponto importa.", "Explain why the point order matters.", "Explica por qué importa el orden del punto.") },
    { id: "congruences", step: 3, prompt: tx("Como você interpreta as três congruências obtidas?", "How do you interpret the three congruences?", "¿Cómo interpretas las tres congruencias?") },
    { id: "countermeasure", step: 4, prompt: tx("Explique a contramedida com suas palavras.", "Explain the countermeasure in your own words.", "Explica la contramedida con tus palabras.") },
    { id: "reflection", step: 5, prompt: tx("Registre sua principal aprendizagem e comentários sobre a atividade.", "Record your main learning and comments about the activity.", "Registra tu principal aprendizaje y comentarios sobre la actividad.") }
  ];

  function score(questions, answers) {
    var gradable = questions.filter(function (question) { return question.answer !== undefined; });
    var correct = 0;
    var details = gradable.map(function (question) {
      var raw = answers ? answers[question.id] : undefined;
      var received = question.type === "number" ? Number(raw) : Number(raw);
      var isCorrect = received === question.answer;
      if (isCorrect) correct += 1;
      return { id: question.id, concept: question.concept, correct: isCorrect, answer: raw };
    });
    return { correct: correct, total: gradable.length, percent: gradable.length ? Math.round(correct / gradable.length * 100) : 0, details: details };
  }

  global.CriptoEvaluations = Object.freeze({ pre: pre, post: post, openPrompts: openPrompts, score: score });
})(window);
