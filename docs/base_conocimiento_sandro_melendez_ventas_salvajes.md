---
title: "Base de conocimiento: Sandro Meléndez y el sistema Ventas Salvajes"
slug: "sandro-melendez-ventas-salvajes"
version: "1.0"
language: "es-PE"
created_at: "2026-08-17"
verified_until: "2026-08-17"
purpose: "Base de conocimiento para búsqueda semántica, RAG, embeddings, clasificación temática y entrenamiento de asistentes comerciales"
primary_entity: "Sandro Meléndez Aymar"
primary_framework:
  - "Ventas Salvajes"
  - "Ventas Salvajes 2"
  - "Neuroratórica"
domain: "ventas"
subdomains:
  - "ventas consultivas"
  - "ventas B2B"
  - "ventas B2C"
  - "ventas inmobiliarias"
  - "ventas por WhatsApp"
  - "ventas telefónicas"
  - "comunicación comercial"
  - "neuroventas"
  - "oratoria comercial"
  - "storyselling"
  - "manejo de objeciones"
  - "cierres de venta"
  - "seguimiento comercial"
  - "marca personal"
retrieval_strategy:
  - "semantic_search"
  - "hybrid_search"
  - "chunk_by_heading"
  - "metadata_filtering"
recommended_chunk_tokens: "300-900"
recommended_overlap_tokens: "50-120"
source_policy: "Priorizar fuentes oficiales de Motivarte Perú, Sandro Meléndez y Editorial Planeta. Utilizar catálogos bibliográficos como verificación secundaria. Material de terceros solo como apoyo y nunca para completar mecánicas no verificadas."
copyright_policy: "Esta base resume y parafrasea conceptos públicamente identificables. No reproduce de forma extensa libros, cursos ni manuales protegidos."
---

# Base de conocimiento: Sandro Meléndez y Ventas Salvajes

## 0. Propósito

Este documento estructura conocimiento público relacionado con **Sandro Meléndez Aymar**, su enfoque comercial **Ventas Salvajes**, su evolución hacia **Ventas Salvajes 2** y el concepto de **Neuroratórica**.

Está preparado para:

- búsqueda semántica;
- generación de embeddings;
- sistemas RAG;
- asistentes de ventas;
- clasificación de conversaciones comerciales;
- generación de guiones;
- capacitación de asesores;
- análisis de objeciones;
- recuperación de técnicas por intención;
- adaptación a ventas inmobiliarias y venta de lotes;
- comparación futura con otras metodologías de ventas.

Cada bloque busca ser autocontenido y recuperable de forma independiente.

---

# 1. Política de certeza

## [SM-META-001] Niveles de evidencia

```yaml
evidence_levels:
  verified_primary:
    description: "Confirmado en fuente directa u oficial: Motivarte Perú, Sandro Meléndez o Editorial Planeta."
  verified_bibliographic:
    description: "Confirmado en catálogo bibliográfico institucional o ficha editorial."
  verified_public_index:
    description: "Confirmado mediante índice público de una obra o muestra oficial."
  self_reported:
    description: "Logro, cifra o trayectoria declarada por el autor o su organización."
  third_party:
    description: "Contenido de terceros, apuntes, resúmenes o republicaciones."
  derived:
    description: "Síntesis o adaptación realizada a partir de varios conceptos verificados."
  unverified_mechanics:
    description: "El nombre del método está confirmado, pero su funcionamiento completo no es público en las fuentes consultadas."
```

### Regla para sistemas RAG

El asistente **no debe inventar la expansión de un acrónimo ni la mecánica de un método** cuando solo existe evidencia de su nombre.

Ejemplos:

- Método MEP: nombre confirmado; mecánica completa no confirmada en las fuentes públicas consultadas.
- Método X3: nombre confirmado; mecánica completa no confirmada.
- Método Negocia: nombre confirmado; mecánica completa no confirmada.
- Método Concluye: nombre confirmado; mecánica completa no confirmada.

---

# 2. Entidad principal

## [SM-ENTITY-001] Sandro Meléndez Aymar

**Tipo:** persona  
**País asociado:** Perú  
**Dominio:** ventas, liderazgo, servicio al cliente, comunicación comercial  
**Organización asociada:** Motivarte Perú  
**Obras comerciales principales:** Ventas Salvajes, Ventas Salvajes 2

### Descripción

Sandro Meléndez Aymar es un entrenador comercial, empresario y autor peruano vinculado a la formación de equipos de ventas.

Editorial Planeta describe una trayectoria de aproximadamente veinte años como vendedor y experiencia en funciones de supervisión, servicio y gerencia comercial.

### Áreas asociadas públicamente

- ventas;
- liderazgo;
- servicio al cliente;
- ventas B2B;
- ventas B2C;
- comunicación;
- preguntas de poder;
- argumentos;
- storytelling;
- storyselling;
- metáforas;
- cierres;
- objeciones;
- WhatsApp;
- marca personal;
- neuroventas;
- oratoria;
- retórica;
- entrenamiento comercial.

### Nivel de evidencia

`verified_primary`

---

# 3. Motivarte Perú

## [SM-ORG-001] Motivarte Perú

**Tipo:** consultora / escuela de entrenamiento comercial  
**Fundador asociado:** Sandro Meléndez Aymar

### Propósito declarado

Fortalecer habilidades de:

- equipos comerciales;
- vendedores;
- líderes;
- servicio al cliente.

### Modelo formativo

Las fuentes editoriales describen una metodología práctica de enseñanza basada en una dinámica entre:

1. objetivo;
2. feedback;
3. preguntas de poder.

También se asocian herramientas de conexión como:

- metáfora;
- storyselling;
- comedia;
- reflexión.

### Conflicto de fecha de fundación

Existen fuentes públicas con una discrepancia:

```yaml
foundation_date_claims:
  planeta_author_bio:
    year: 2006
    confidence: high
  motivarte_training_pdf_2025:
    year: 2008
    confidence: high
```

### Regla

No afirmar categóricamente una única fecha sin indicar la discrepancia.

---

# 4. Obras principales

## [SM-BOOK-001] Ventas Salvajes

**Autor:** Sandro Meléndez  
**Editorial:** Planeta  
**Publicación:** 2024  
**Temática:** empresa, marketing y ventas  
**Páginas reportadas por Planeta:** 140  
**ISBN:** 978-612-319-984-5

### Enfoque

Herramientas y métodos prácticos orientados a mejorar el desempeño comercial.

### Índice público verificado

La estructura pública de la obra contiene:

1. Desahuévate.
2. AP/AC.
3. CBS: Conocimientos Básicos Salvajes.
4. Proceso Salvaje de 9 a 3.
5. Confianza Salvaje.
6. Argumentos, fluidez y pitch de poder.
7. Valor Salvaje.
8. WhatsApp y teléfono salvajes.
9. Acuerdos y cierres salvajes.
10. Consejos salvajes.

> El índice público muestra nueve bloques numerados principales, además de la introducción y subdivisiones editoriales.

### Nivel de evidencia

`verified_public_index`

---

## [SM-BOOK-002] Ventas Salvajes 2

**Subtítulo:** Neuroratórica, el arte de comunicar y conectar para vender mejor  
**Autor:** Sandro Meléndez  
**Editorial:** Planeta  
**Publicación:** 2025  
**ISBN:** 978-612-332-145-1

### Enfoque central

La segunda obra desplaza el foco desde técnicas generales de venta hacia:

- comunicación;
- conexión;
- estructura argumental;
- neuroventas;
- oratoria;
- retórica;
- historias;
- voz;
- WhatsApp;
- objeciones;
- cierre;
- marca personal.

### Índice bibliográfico verificado

1. Cero excusas: Desahuévate.
2. Habla bien o cállate.
3. ¿Explicación o historia?
4. Reptiliano o lárgate.
5. Destruyendo objeciones.
6. Tu historia vende.
7. El cierre no se pierde, se provoca.
8. Textos levantamuertos para WhatsApp.
9. WhatsApp y los audios salvajes.
10. Marca personal que atrapa.
11. Fórmula HEA.
12. Test del vendedor salvaje.
13. Bibliografía salvaje.

### Nota de paginación

Planeta y catálogos bibliográficos pueden mostrar pequeñas diferencias de paginación según formato o registro.

### Nivel de evidencia

`verified_primary + verified_bibliographic`

---

# 5. Filosofía general de Ventas Salvajes

## [SM-PHIL-001] Vendedor tradicional vs. vendedor salvaje

**Tags:** mentalidad, formación, diferenciación, vendedor

### Vendedor tradicional

En material oficial de entrenamiento se le atribuyen problemas como:

- no comprender el valor de la pregunta;
- prejuzgar al cliente;
- adelantarse a lo que el cliente busca;
- repetir errores;
- carecer de métodos y sistemas;
- no vender adecuadamente su propio valor;
- no desarrollar manuales;
- no trabajar palabras clave;
- no estructurar argumentos;
- no autoentrenarse.

### Vendedor salvaje

El enfoque propone un vendedor:

- preparado;
- ambicioso;
- desafiante;
- entrenado;
- estructurado;
- capaz de hacer preguntas;
- capaz de vender valor;
- capaz de comunicar;
- capaz de cerrar;
- capaz de adaptarse.

### Principio

La motivación por sí sola no sustituye la competencia comercial.

---

# 6. Acción y "Desahuévate"

## [SM-MIND-001] Desahuévate

**Tags:** acción, mentalidad, ejecución, disciplina  
**Tipo:** concepto motivacional y de ejecución

### Sentido comercial

Dentro del sistema, "Desahuévate" funciona como una llamada a:

- dejar el autosabotaje;
- abandonar excusas;
- actuar;
- entrenarse;
- ejecutar;
- revisar errores;
- corregir;
- retomar.

### Interpretación semántica

```text
conocimiento sin acción -> resultado insuficiente
acción sin entrenamiento -> improvisación
entrenamiento + acción + revisión -> mejora comercial
```

---

# 7. El valor de la pregunta

## [SM-QUESTION-001] Preguntar antes de asumir

**Tags:** preguntas, diagnóstico, exploración, cliente

### Problema identificado

El vendedor que no pregunta tiende a:

- prejuzgar;
- asumir necesidades;
- presentar demasiado pronto;
- hablar de aspectos irrelevantes.

### Principio

La pregunta permite descubrir:

- qué busca el cliente;
- qué cree;
- qué quiere;
- qué valora;
- qué teme;
- qué necesita;
- qué condición lo llevaría a avanzar.

### Relación

```yaml
question:
  leads_to:
    - exploration
    - diagnosis
    - understanding
    - better_arguments
    - better_close
```

---

# 8. Preguntas de poder

## [SM-QUESTION-002] Preguntas de poder

**Tags:** pregunta de poder, diagnóstico, persuasión

### Definición operativa

Preguntas diseñadas para mover la conversación hacia información útil para la decisión.

Pueden servir para:

- explorar;
- diagnosticar;
- detectar motivación;
- descubrir objeciones;
- confirmar valor;
- inducir reflexión;
- preparar un acuerdo.

### Uso en un asistente

Antes de responder con una presentación extensa, buscar al menos una variable del cliente.

---

# 9. Preguntas inducidas

## [SM-QUESTION-003] Preguntas inducidas

**Tags:** preguntas inducidas, cierre parcial, dirección de conversación

### Evidencia pública

Sandro Meléndez publica contenido específico sobre las **preguntas inducidas** como herramienta del "vendedor salvaje".

Una fuente pública relacionada conecta el uso de preguntas inducidas con la idea de **cierre parcial**.

### Interpretación segura

Las preguntas inducidas buscan orientar al prospecto a evaluar un atributo, condición o decisión concreta sin saltar directamente al cierre final.

### Restricción

No afirmar una fórmula literal única si no está documentada en una fuente primaria accesible.

---

# 10. Proceso Salvaje de 9 a 3

## [SM-PROCESS-001] Proceso Salvaje de 9 a 3

**Tags:** proceso, embudo, Ventas Salvajes

### Evidencia

El nombre aparece como capítulo oficial de *Ventas Salvajes*.

### Estado

`verified_public_index`

### Mecánica

La mecánica completa no está expuesta en las fuentes públicas consultadas.

### Regla RAG

```yaml
method: "Proceso Salvaje de 9 a 3"
verified_name: true
verified_full_mechanics: false
allow_inference_as_official: false
```

---

# 11. Embudo y proceso

## [SM-PROCESS-002] Embudo de poder

**Tags:** embudo, proceso, funnel

### Evidencia

El "embudo de poder" aparece en programas oficiales de Ventas Salvajes.

### Interpretación segura

El concepto forma parte de la visión de que la venta debe gestionarse como proceso y no como un cierre aislado.

### Relacionado con

- posicionamiento;
- confianza;
- preguntas;
- valor;
- acuerdos;
- cierre;
- seguimiento.

---

# 12. Valor, Viral y Venta

## [SM-VVV-001] 3V: Valor, Viral y Venta

**Tags:** valor, viral, venta, posicionamiento

### Evidencia

"Valor, Viral y Venta" aparece de forma recurrente en programas de entrenamiento Ventas Salvajes.

### Lectura conceptual

El sistema conecta:

1. generación de valor;
2. capacidad de obtener visibilidad o difusión;
3. conversión comercial.

### Restricción

No debe atribuirse una fórmula matemática específica sin fuente primaria.

---

# 13. Posicionamiento

## [SM-POS-001] Activar posicionamiento

**Tags:** posicionamiento, diferenciación, marca

### Principio

En mercados competitivos, el vendedor debe ser capaz de diferenciarse.

### Factores relacionados

- autoridad;
- marca personal;
- comunicación;
- valor;
- contenido;
- primer impacto;
- confianza.

---

# 14. Confianza Salvaje

## [SM-TRUST-001] Confianza

**Tags:** confianza, credibilidad, venta

### Evidencia

"Confianza Salvaje" es un capítulo de la obra original y "el poder de la confianza" aparece en capacitaciones oficiales.

### Función

La confianza actúa como condición previa para:

- escuchar argumentos;
- aceptar recomendaciones;
- reducir riesgo percibido;
- considerar un acuerdo.

### Aplicación

El vendedor debe transmitir:

- seguridad;
- claridad;
- coherencia;
- preparación;
- dominio;
- naturalidad.

---

# 15. Fluidez y determinación

## [SM-COMM-001] Fluidez

**Tags:** comunicación, fluidez, seguridad

### Principio

La comunicación comercial debe entrenarse.

### Señales de falta de fluidez

- exceso de muletillas;
- argumentos improvisados;
- mensajes contradictorios;
- explicación desordenada;
- inseguridad al responder.

### Objetivo

Comunicar con:

- claridad;
- velocidad adecuada;
- estructura;
- seguridad;
- naturalidad.

---

# 16. Primer impacto

## [SM-COMM-002] Primer impacto

**Tags:** primer impacto, percepción, comunicación

### Evidencia

El primer impacto forma parte de Ventas Salvajes y Ventas Salvajes 2.

### Canales

- presencial;
- teléfono;
- audio;
- texto;
- WhatsApp;
- video.

### Principio

El mensaje inicial condiciona:

- atención;
- seguridad;
- confianza;
- disposición a continuar.

---

# 17. Pitch de poder

## [SM-PITCH-001] Pitch de poder

**Tags:** pitch, argumento, presentación

### Evidencia

La obra original incluye un capítulo dedicado a argumentos, fluidez y "pitch de poder".

Ventas Salvajes 2 enfatiza el **pitch de valor** y los **argumentos potentes**.

### Función

Convertir información del producto en un mensaje:

- estructurado;
- breve;
- relevante;
- entendible;
- emocionalmente significativo;
- orientado a un siguiente paso.

---

# 18. Argumentos planificados

## [SM-ARG-001] No improvisar argumentos críticos

**Tags:** argumento, speech, planificación, neuroratórica

### Principio

Ventas Salvajes 2 enfatiza que el vendedor debe contar con argumentos planificados y estructurados para:

- diagnosticar;
- explorar;
- persuadir;
- cerrar.

### Canales

- presencial;
- WhatsApp;
- online;
- teléfono.

### Regla

```text
argumento improvisado != argumento natural

argumento planificado + práctica -> comunicación natural con estructura
```

---

# 19. Valor Salvaje

## [SM-VALUE-001] Vender valor

**Tags:** valor, beneficios, precio

### Problema

Un vendedor puede conocer su producto pero fallar al comunicar su valor.

### Objetivo

Transformar:

```text
atributo -> significado -> utilidad -> valor para el cliente
```

### Aplicación

No limitarse a enumerar características.

Relacionar la oferta con:

- objetivo;
- problema;
- necesidad;
- ahorro;
- ganancia;
- seguridad;
- conveniencia;
- transformación.

---

# 20. Fórmula de Valor

## [SM-VALUE-002] Fórmula de Valor

**Tags:** fórmula de valor, propuesta

### Evidencia

"La fórmula de Valor" aparece en programas oficiales de Ventas Salvajes.

### Estado

El nombre está confirmado.

### Mecánica completa

No se encuentra descrita públicamente con suficiente precisión en las fuentes primarias consultadas.

```yaml
verified_name: true
verified_full_formula: false
```

---

# 21. Seguimiento con Valor

## [SM-FOLLOW-001] Seguimiento con Valor

**Tags:** seguimiento, follow-up, activadores

### Principio

El seguimiento no debe convertirse en:

- súplica;
- repetición;
- recordatorio vacío;
- "¿ya decidió?";
- "¿alguna novedad?".

### Evidencia pública

Sandro distingue entre seguimientos que funcionan como recordatorios y mensajes que actúan como **activadores**.

### Interpretación

Cada seguimiento debería aportar una razón para retomar la conversación.

### Activadores posibles

- novedad;
- dato relevante;
- evidencia;
- historia;
- comparación;
- pregunta;
- actualización;
- beneficio;
- caso;
- cambio de contexto.

---

# 22. WhatsApp Salvaje

## [SM-WA-001] WhatsApp como canal comercial

**Tags:** WhatsApp, chat, mensajes

### Evidencia

WhatsApp aparece como capítulo propio y como eje de los entrenamientos.

### Variables importantes

- primer mensaje;
- longitud;
- claridad;
- preguntas;
- audios;
- seguimiento;
- textos de reactivación;
- cierre;
- tono.

### Principio

Un chat de ventas también necesita estructura.

---

# 23. Mensajes demasiado largos

## [SM-WA-002] Economía del mensaje

**Tags:** WhatsApp, texto, atención

### Principio

La conversación digital debe facilitar lectura y respuesta.

### Recomendación derivada

- mensajes cortos;
- una idea por bloque;
- preguntas claras;
- evitar paredes de texto;
- no enviar información irrelevante.

---

# 24. Audios comerciales

## [SM-WA-003] Audios Salvajes

**Tags:** audios, voz, WhatsApp, neuroratórica

### Evidencia

Ventas Salvajes 2 dedica un capítulo a WhatsApp y audios.

El programa 2026 destaca que voz, audios y textos transmiten información adicional más allá de las palabras.

### Variables

- duración;
- tono;
- ritmo;
- claridad;
- emoción;
- seguridad;
- propósito.

### Regla

Un audio comercial debe tener una función concreta.

---

# 25. Prospecto que deja en visto

## [SM-WA-004] Reactivación

**Tags:** visto, ghosting comercial, seguimiento, activador

### Evidencia

Ventas Salvajes 2 incluye "Textos levantamuertos para WhatsApp" y capacitaciones recientes incluyen técnicas para reactivar conversaciones cuando el prospecto deja de responder.

### Filosofía

No insistir con el mismo mensaje.

Cambiar el estímulo.

### Objetivos

- recuperar atención;
- introducir novedad;
- despertar curiosidad;
- formular una pregunta útil;
- volver al proceso.

### Restricción ética

No usar manipulación, amenazas ni presión falsa.

---

# 26. Teléfono Salvaje

## [SM-PHONE-001] Teléfono

**Tags:** llamada, teléfono, ventas

### Evidencia

La obra original agrupa WhatsApp y teléfono en un capítulo.

### Función de la llamada

- conectar;
- diagnosticar;
- explorar;
- aclarar;
- resolver;
- acordar siguiente paso.

### Relación

El teléfono permite usar:

- voz;
- ritmo;
- pausas;
- preguntas;
- escucha.

---

# 27. Acuerdos Salvajes

## [SM-AGREE-001] Acuerdo antes que presión

**Tags:** acuerdo, compromiso, cierre

### Evidencia

"Acuerdos y cierres salvajes" aparece como capítulo de la obra.

Programas de entrenamiento incluyen "Confianza, Valor, Acuerdo".

### Arquitectura conceptual

```text
confianza -> valor -> acuerdo
```

### Interpretación

El cierre se facilita cuando previamente existe:

- confianza;
- percepción de valor;
- acuerdos parciales.

---

# 28. Cierre parcial

## [SM-CLOSE-001] Cierre parcial

**Tags:** cierre parcial, microcompromiso

### Evidencia

El método "Cierre Parcial" aparece explícitamente en programas oficiales.

### Concepto seguro

Un cierre parcial confirma un aspecto de la decisión sin exigir todavía el compromiso final.

### Ejemplos genéricos derivados

- confirmar preferencia;
- confirmar condición;
- confirmar utilidad;
- confirmar disponibilidad;
- confirmar siguiente paso.

### Restricción

Los ejemplos anteriores son adaptaciones, no frases oficiales.

---

# 29. El cierre se provoca

## [SM-CLOSE-002] El cierre no debe depender del azar

**Tags:** cierre, proceso, Ventas Salvajes 2

### Evidencia

Ventas Salvajes 2 incluye un capítulo cuyo título sostiene que el cierre se provoca.

### Interpretación

Un cierre se construye mediante:

- diagnóstico;
- argumento;
- emoción;
- confianza;
- manejo de objeciones;
- acuerdo;
- pregunta final.

---

# 30. Control de tensión al cerrar

## [SM-CLOSE-003] Tensión de cierre

**Tags:** cierre, silencio, tensión

### Evidencia pública

Existe contenido social de Sandro asociado a "Cierre Profesional de Ventas: Controla la Tensión".

### Concepto

El vendedor debe tolerar el momento de decisión sin sabotearlo por ansiedad.

### Aplicación segura

- hacer pregunta;
- esperar;
- escuchar;
- no justificar de más;
- no retirar prematuramente la propuesta.

---

# 31. Método MEP

## [SM-METHOD-001] Método MEP

**Tags:** MEP, argumentos, Ventas Salvajes

### Evidencia

El Método MEP figura en:

- programas oficiales;
- contenido social oficial;
- entrenamientos Ventas Salvajes.

### Uso confirmado

Se asocia públicamente a la construcción de un **argumento potente**.

### Estado de conocimiento

```yaml
method_name: "MEP"
verified: true
associated_with: "argumentación comercial"
full_expansion_verified: false
full_mechanics_verified: false
```

### Regla

No expandir "MEP" inventando palabras para las letras.

---

# 32. Método X3

## [SM-METHOD-002] Método X3

**Tags:** X3, Ventas Salvajes

### Evidencia

Figura en programas oficiales junto al Método MEP.

### Estado

```yaml
verified_name: true
verified_full_mechanics: false
```

### Regla

Recuperar el método por nombre cuando la consulta lo mencione, pero aclarar que la mecánica completa requiere material autorizado del entrenamiento o libro.

---

# 33. Método Negocia

## [SM-METHOD-003] Método Negocia

**Tags:** negociación, acuerdos

### Evidencia

Figura en los temarios oficiales.

### Relación probable

Por ubicación temática está vinculado a acuerdos, negociación y cierre.

### Nota

"Relación probable" es una inferencia estructural, no una definición oficial.

```yaml
evidence_level: derived
```

---

# 34. Método Concluye

## [SM-METHOD-004] Método Concluye

**Tags:** conclusión, cierre

### Evidencia

Figura en programas oficiales de entrenamiento.

### Estado

```yaml
verified_name: true
verified_full_mechanics: false
```

---

# 35. Negociación

## [SM-NEG-001] Negociar sin improvisar

**Tags:** negociación, concesiones, acuerdos

### Evidencia

Sandro publica contenido sobre recursos de negociación y los entrenamientos incluyen Método Negocia y cierre parcial.

### Principios compatibles con el sistema

- preguntar;
- entender;
- construir valor;
- buscar acuerdo;
- no confundir negociación con descuento automático;
- definir condiciones;
- conducir a una conclusión.

---

# 36. Objeciones

## [SM-OBJ-001] Objeciones como parte del proceso

**Tags:** objeciones, diagnóstico, respuesta

### Evolución

Ventas Salvajes 2 dedica un capítulo completo a la destrucción de objeciones.

Los programas 2026 refuerzan esta área.

### Interpretación práctica

Una objeción debe:

1. escucharse;
2. comprenderse;
3. aislarse;
4. responderse;
5. comprobarse;
6. conectarse con el cierre.

---

# 37. No discutir con la objeción

## [SM-OBJ-002] Evitar confrontación improductiva

**Tags:** objeciones, comunicación

### Principio derivado

"Destruir" una objeción debe entenderse operativamente como reducir su fuerza mediante:

- evidencia;
- claridad;
- argumento;
- preguntas;
- comparación;
- prueba;
- confianza.

No como atacar al cliente.

---

# 38. Neuroratórica

## [SM-NEURO-001] Definición

**Tags:** neuroratórica, neuroventas, oratoria, retórica  
**Importancia:** muy alta

### Concepto creado por Sandro Meléndez

Neuroratórica combina áreas de:

- neuroventas;
- oratoria;
- retórica;
- persuasión;
- estructura argumental;
- conexión emocional.

### Objetivo

Comunicar y conectar para vender mejor.

### Problema que intenta resolver

Vendedores que:

- saben del producto;
- tienen "labia";
- pero no estructuran;
- no conectan;
- no diagnostican;
- no persuaden de forma ordenada.

---

# 39. Arquitectura de la Neuroratórica

## [SM-NEURO-002] Componentes

```yaml
neuroratorica:
  inputs:
    - voice
    - words
    - structure
    - story
    - emotion
    - rhetoric
    - diagnosis
  objectives:
    - capture_attention
    - build_trust
    - move_emotion
    - persuade
    - facilitate_close
```

### Canales

- presencial;
- WhatsApp;
- online;
- llamada;
- audio.

---

# 40. "Habla bien o cállate"

## [SM-NEURO-003] Calidad de comunicación

**Tags:** comunicación, claridad, speech

### Evidencia

Capítulo 1 de Ventas Salvajes 2.

### Interpretación

La calidad de la comunicación es parte de la competencia comercial.

### Variables

- claridad;
- estructura;
- vocalización;
- intención;
- seguridad;
- selección de palabras.

---

# 41. Explicación vs. historia

## [SM-STORY-001] Una historia puede conectar mejor que una explicación

**Tags:** storytelling, storyselling, historia

### Evidencia

Ventas Salvajes 2 incluye el capítulo "¿Explicación o historia?" y "Tu historia vende".

Editorial Planeta asocia explícitamente a Sandro con el uso de storyselling.

### Uso comercial

Historias pueden ayudar a:

- hacer comprensible un concepto;
- demostrar transformación;
- mostrar un caso;
- generar identificación;
- recordar un beneficio.

---

# 42. Storyselling

## [SM-STORY-002] Storyselling aplicado a ventas

**Tags:** storyselling, historia, emoción

### Estructura derivada útil

```text
situación -> problema -> decisión -> experiencia -> resultado -> conexión con la oferta
```

### Regla

La historia debe apoyar la decisión, no distraer de ella.

---

# 43. Metáfora

## [SM-STORY-003] Metáfora comercial

**Tags:** metáfora, explicación, conexión

### Evidencia

La biografía editorial de Sandro identifica la metáfora como herramienta de conexión.

### Uso

Sirve para traducir conceptos complejos a imágenes mentales simples.

### Aplicaciones

- explicar riesgo;
- explicar valor;
- explicar proceso;
- explicar inversión;
- explicar urgencia real.

---

# 44. Comedia y reflexión

## [SM-STORY-004] Recursos emocionales

**Tags:** humor, reflexión, emoción

### Evidencia

Editorial Planeta cita la comedia y la reflexión como herramientas utilizadas en su metodología.

### Objetivo

Mover emociones y mejorar recordación.

### Restricción

El humor nunca debe humillar al prospecto.

---

# 45. Cerebro reptiliano y límbico

## [SM-NEURO-004] Modelos simplificados de neuroventas

**Tags:** reptiliano, límbico, neuroventas

### Evidencia

Los entrenamientos 2026 hablan de comunicar desde el "reptil" y de activar componentes asociados a supervivencia y emoción.

### Precaución científica

Los modelos de "cerebro reptiliano/límbico/racional" son simplificaciones populares y no deben presentarse como una descripción neurocientífica completa del cerebro humano.

### Uso comercial seguro

Interpretar estas etiquetas como heurísticas para:

- atención;
- seguridad;
- emoción;
- significado;
- decisión.

---

# 46. Primer impacto y atención

## [SM-NEURO-005] Atención antes de explicación

**Tags:** atención, primer impacto

### Principio

Antes de explicar mucho, el vendedor necesita:

- captar atención;
- reducir resistencia;
- ser relevante;
- generar curiosidad;
- dar seguridad.

---

# 47. Voz

## [SM-VOICE-001] La voz vende significado

**Tags:** voz, tono, comunicación

### Variables

- velocidad;
- volumen;
- pausas;
- energía;
- seguridad;
- emoción;
- intención.

### Aplicación

La misma frase puede transmitir significados diferentes según la voz.

---

# 48. Mensaje oculto

## [SM-COMM-003] Lo no verbal y paraverbal

**Tags:** mensaje oculto, tono, percepción

### Evidencia

El programa 2026 enseña que voz, audios y textos pueden transmitir un "mensaje oculto".

### Interpretación

Más allá del contenido literal, el prospecto percibe:

- seguridad;
- urgencia;
- ansiedad;
- profesionalismo;
- interés;
- presión;
- claridad.

---

# 49. Marca personal que atrapa

## [SM-BRAND-001] Marca personal comercial

**Tags:** marca personal, autoridad, redes

### Evidencia

Ventas Salvajes 2 dedica un capítulo completo a la marca personal.

### Objetivo

Lograr que el vendedor sea:

- reconocible;
- confiable;
- diferenciable;
- recordable;
- relevante.

### Activos

- contenido;
- voz;
- estilo;
- casos;
- evidencia;
- consistencia;
- especialización.

---

# 50. Naturalidad y diferenciación

## [SM-BRAND-002] No agradar a todo el mundo

**Tags:** autenticidad, marca personal

### Evidencia pública

Sandro ha publicado reflexiones sobre no intentar agradar a todos y revisar continuamente la propia forma de comunicar.

### Principio

Una marca personal puede:

- tener personalidad;
- diferenciarse;
- ser coherente;
- evolucionar con feedback.

---

# 51. Feedback

## [SM-TRAIN-001] Feedback como herramienta

**Tags:** feedback, entrenamiento

### Evidencia

La biografía editorial describe su metodología de enseñanza como interacción entre:

- objetivo;
- feedback;
- preguntas de poder.

### Ciclo sugerido

```text
objetivo -> ejecución -> observación -> feedback -> ajuste -> nueva ejecución
```

---

# 52. Autoentrenamiento

## [SM-TRAIN-002] Entrenar argumentos

**Tags:** práctica, role play, speech

### Problema

No desarrollar manuales ni autoentrenarse genera repetición de errores.

### Prácticas recomendadas

- role play;
- grabar pitch;
- practicar preguntas;
- simular objeciones;
- revisar chats;
- revisar llamadas;
- entrenar cierre;
- ajustar argumentos.

---

# 53. Manuales comerciales

## [SM-TRAIN-003] Documentar el sistema

**Tags:** manual, script, procesos

### Elementos mencionados en materiales de entrenamiento

- palabras clave;
- argumentos de poder;
- tipos de pregunta;
- estrategias;
- manual de preguntas;
- speech.

### Uso para organizaciones

Crear biblioteca de:

- apertura;
- diagnóstico;
- objeciones;
- argumentos;
- cierres;
- seguimiento;
- WhatsApp;
- llamadas.

---

# 54. Fórmula HEA

## [SM-METHOD-005] Fórmula HEA

**Tags:** HEA, Ventas Salvajes 2

### Evidencia

"Fórmula HEA" aparece en el índice bibliográfico de Ventas Salvajes 2.

### Estado

```yaml
verified_name: true
verified_full_expansion: false
verified_full_mechanics: false
```

### Regla

No inventar qué significan H, E y A.

---

# 55. Estructura comercial consolidada

## [SM-PROCESS-003] Flujo derivado de Ventas Salvajes

> Esta es una síntesis derivada de las fuentes, no un diagrama oficial publicado por Sandro.

```text
MENTALIDAD
   ↓
POSICIONAMIENTO
   ↓
PRIMER IMPACTO
   ↓
CONFIANZA
   ↓
PREGUNTAS
   ↓
DIAGNÓSTICO
   ↓
ARGUMENTO / PITCH
   ↓
VALOR
   ↓
HISTORIA / EMOCIÓN
   ↓
OBJECIONES
   ↓
ACUERDOS PARCIALES
   ↓
NEGOCIACIÓN
   ↓
CIERRE
   ↓
SEGUIMIENTO CON VALOR
```

---

# 56. Comparación conceptual: venta tradicional vs. venta salvaje

```yaml
traditional_seller:
  tends_to:
    - assume
    - talk_too_much
    - repeat_scripts_without_context
    - improvise
    - focus_on_product
    - use_empty_followups

wild_seller:
  tends_to:
    - prepare
    - ask
    - explore
    - communicate_value
    - structure_arguments
    - practice
    - manage_objections
    - seek_agreements
    - follow_up_with_value
```

---

# 57. Intenciones para RAG

```yaml
intents:
  - sandro_biografia
  - ventas_salvajes
  - ventas_salvajes_2
  - neuroratorica
  - desahuevate
  - pregunta_de_poder
  - pregunta_inducida
  - confianza
  - primer_impacto
  - pitch_de_poder
  - argumento_potente
  - vender_valor
  - formula_valor
  - seguimiento_valor
  - whatsapp_ventas
  - audio_ventas
  - reactivar_visto
  - cierre_parcial
  - cierre_final
  - negociar
  - manejar_objecion
  - storyselling
  - marca_personal
  - metodo_mep
  - metodo_x3
  - metodo_negocia
  - metodo_concluye
  - formula_hea
```

---

# 58. Entidades y aliases

```yaml
entities:
  sandro_melendez:
    aliases:
      - "Sandro Meléndez"
      - "Sandro Melendez"
      - "Sandro Meléndez Aymar"
      - "Sandro Melendez Aymar"

  ventas_salvajes:
    aliases:
      - "Ventas Salvajes"
      - "Vendedor Salvaje"
      - "Venta Salvaje"

  neuroratorica:
    aliases:
      - "Neuroratórica"
      - "Neuroratorica"
      - "Neuro Oratoria"
```

---

# 59. Relaciones conceptuales

```yaml
relations:
  - subject: "Sandro Meléndez"
    relation: "autor_de"
    object:
      - "Ventas Salvajes"
      - "Ventas Salvajes 2"

  - subject: "Ventas Salvajes 2"
    relation: "concepto_central"
    object: "Neuroratórica"

  - subject: "Neuroratórica"
    relation: "integra"
    object:
      - "neuroventas"
      - "oratoria"
      - "retórica"
      - "storyselling"
      - "argumentación"

  - subject: "preguntas de poder"
    relation: "apoyan"
    object:
      - "diagnóstico"
      - "exploración"
      - "cierre"

  - subject: "confianza"
    relation: "facilita"
    object: "acuerdo"

  - subject: "valor"
    relation: "facilita"
    object: "acuerdo"

  - subject: "seguimiento con valor"
    relation: "busca"
    object: "reactivar conversación"

  - subject: "preguntas inducidas"
    relation: "se_asocian_con"
    object: "cierre parcial"
```

---

# 60. Taxonomía temática

```yaml
categories:
  mindset:
    - desahuevate
    - acción
    - autoentrenamiento

  discovery:
    - preguntas
    - preguntas_de_poder
    - preguntas_inducidas
    - diagnóstico

  communication:
    - primer_impacto
    - fluidez
    - voz
    - pitch
    - argumentos
    - neuroratórica

  value:
    - valor_salvaje
    - formula_de_valor
    - beneficios

  story:
    - storytelling
    - storyselling
    - metáfora
    - comedia
    - reflexión

  objections:
    - objeciones
    - negociación

  closing:
    - acuerdos
    - cierre_parcial
    - cierre_final
    - metodo_negocia
    - metodo_concluye

  digital:
    - whatsapp
    - audio
    - texto
    - reactivación
    - seguimiento

  branding:
    - posicionamiento
    - marca_personal
```

---

# 61. Aplicación a venta inmobiliaria

## [SM-REAL-001] Adaptación a lotes

> Adaptación derivada. No es una metodología oficial publicada con este nombre por Sandro Meléndez.

### Fase 1: primer impacto

Objetivo:

- presentarse con claridad;
- generar seguridad;
- evitar mensajes genéricos.

### Fase 2: pregunta

Ejemplos adaptados:

- ¿Buscas un terreno para inversión o vivienda?
- ¿Qué zona estás evaluando?
- ¿Qué es lo más importante para ti al comprar?
- ¿Qué experiencia has tenido buscando terrenos?

### Fase 3: confianza

Utilizar:

- identidad del asesor;
- información verificable;
- ubicación;
- documentación;
- evidencia.

### Fase 4: argumento

Construir el pitch alrededor de la prioridad del cliente.

### Fase 5: valor

Conectar:

- precio;
- documentación;
- acceso;
- ubicación;
- servicios;
- plusvalía;
- propósito.

### Fase 6: historia

Mostrar un caso real relacionado con el problema.

### Fase 7: acuerdo parcial

Confirmar:

- proyecto;
- zona;
- presupuesto;
- visita;
- lote preferido.

### Fase 8: cierre

Proponer el siguiente paso concreto.

### Fase 9: seguimiento

Aportar valor antes de volver a pedir decisión.

---

# 62. Ejemplo inmobiliario: pregunta de poder

## [SM-REAL-002]

Prospecto:

"Solo estoy averiguando."

Asesor:

"Perfecto. Para no llenarte de información que quizá no te sirva, ¿lo estás evaluando principalmente para invertir o para construir?"

### Función

Transformar una conversación pasiva en diagnóstico.

---

# 63. Ejemplo inmobiliario: argumento estructurado

## [SM-REAL-003]

Cliente prioriza:

- documentos;
- acceso;
- valorización.

Argumentación:

1. confirmar prioridad;
2. mostrar evidencia documental;
3. explicar acceso;
4. relacionar desarrollo de zona con potencial de valor;
5. formular pregunta de avance.

---

# 64. Ejemplo inmobiliario: storyselling

## [SM-REAL-004]

Estructura:

```text
cliente anterior
→ tenía la misma preocupación
→ verificó determinada evidencia
→ realizó la visita
→ resolvió su duda
→ tomó una decisión
```

### Regla

El caso debe ser real.

---

# 65. Ejemplo inmobiliario: cierre parcial

## [SM-REAL-005]

Preguntas adaptadas:

- ¿De los dos proyectos cuál se acerca más a lo que buscas?
- ¿Prefieres lote interior o esquina?
- ¿La ubicación sí cumple con lo que necesitabas?
- ¿La documentación ya te quedó clara?

### Nota

Son adaptaciones y no frases oficiales de Sandro.

---

# 66. Ejemplo inmobiliario: seguimiento con valor

## [SM-REAL-006]

En vez de:

"¿Ya decidiste?"

Usar un activador relevante:

- avance de obra;
- documento solicitado;
- video del acceso;
- testimonio;
- disponibilidad real;
- comparación;
- respuesta a su objeción.

Después formular una pregunta concreta.

---

# 67. Arquitectura para asistente de ventas

## [SM-AI-001] Flujo de decisión

```yaml
assistant_sales_flow:
  1_identify_context:
    ask_if_missing:
      - motive
      - product_interest

  2_build_trust:
    actions:
      - identify_company
      - provide_verified_info

  3_discover:
    actions:
      - ask_power_question
      - identify_priority

  4_argument:
    actions:
      - build_relevant_pitch
      - avoid_information_dump

  5_value:
    actions:
      - translate_features_into_customer_value

  6_objections:
    actions:
      - clarify
      - respond
      - verify_resolution

  7_partial_agreement:
    actions:
      - confirm_preference
      - confirm_condition

  8_close:
    actions:
      - propose_next_step

  9_followup:
    actions:
      - provide_value
      - use_activation_reason
```

---

# 68. Reglas para respuestas generadas por IA

## [SM-AI-002]

El asistente debe:

- preguntar cuando falte contexto crítico;
- evitar saturar con información;
- personalizar argumentos;
- utilizar pruebas reales;
- evitar inventar disponibilidad;
- evitar inventar promociones;
- evitar inventar testimonios;
- evitar falsa urgencia;
- marcar claramente las adaptaciones;
- no atribuir a Sandro fórmulas no verificadas.

---

# 69. Clasificación de mensajes WhatsApp

```yaml
whatsapp_message_types:
  opener:
    objective: "captar respuesta"

  discovery:
    objective: "obtener información"

  trust:
    objective: "reducir incertidumbre"

  value:
    objective: "mostrar relevancia"

  story:
    objective: "generar conexión"

  objection:
    objective: "resolver barrera"

  partial_close:
    objective: "obtener microacuerdo"

  final_close:
    objective: "pedir decisión o siguiente paso"

  followup_value:
    objective: "reactivar con información útil"

  reactivation:
    objective: "recuperar conversación inactiva"
```

---

# 70. Etiquetas de objeciones para CRM

```yaml
objections:
  price:
    aliases:
      - "caro"
      - "no me alcanza"
      - "fuera de presupuesto"

  trust:
    aliases:
      - "no confío"
      - "quiero revisar documentos"
      - "me preocupa"

  timing:
    aliases:
      - "más adelante"
      - "el próximo mes"
      - "lo voy a pensar"

  competitor:
    aliases:
      - "estoy viendo otro"
      - "otro proyecto"
      - "otra empresa"

  decision_maker:
    aliases:
      - "consultar con mi pareja"
      - "consultar con mi familia"
      - "consultar con mi socio"

  location:
    aliases:
      - "está lejos"
      - "muy retirado"

  silence:
    aliases:
      - "visto"
      - "no responde"
      - "ghosting"
```

---

# 71. Campos sugeridos para CRM

```yaml
lead:
  id: null
  name: null
  phone: null
  source: null
  product_interest: null
  motive: null
  priority: null
  secondary_priority: null
  trust_level: null
  objection: null
  preferred_channel: null
  last_question: null
  last_value_argument: null
  partial_agreement: null
  stage: null
  last_contact_at: null
  next_action: null
```

---

# 72. Estados sugeridos

```yaml
pipeline:
  - nuevo
  - primer_impacto
  - contacto
  - exploracion
  - diagnosticado
  - argumento
  - valor_demostrado
  - objecion
  - acuerdo_parcial
  - negociacion
  - cierre
  - seguimiento
  - vendido
  - perdido
```

---

# 73. FAQ semántica

## [SM-FAQ-001] ¿Qué es Ventas Salvajes?

Un enfoque comercial desarrollado por Sandro Meléndez que busca transformar al vendedor tradicional en un profesional preparado, estructurado y orientado a preguntas, confianza, valor, argumentos, acuerdos y cierres.

---

## [SM-FAQ-002] ¿Qué es Neuroratórica?

Concepto creado por Sandro Meléndez que integra neuroventas, oratoria y retórica para estructurar mensajes que conecten, emocionen y faciliten la venta.

---

## [SM-FAQ-003] ¿Cuál es la importancia de las preguntas?

Permiten explorar y definir lo que el cliente busca, cree o quiere, evitando prejuzgar y presentar demasiado pronto.

---

## [SM-FAQ-004] ¿Qué es seguimiento con valor?

Seguimiento que aporta un nuevo estímulo o información relevante en vez de limitarse a pedir respuesta.

---

## [SM-FAQ-005] ¿Qué son preguntas inducidas?

Herramientas de conversación orientadas a que el cliente evalúe o confirme un aspecto concreto de la decisión. Se relacionan públicamente con cierres parciales.

---

## [SM-FAQ-006] ¿Qué es el Método MEP?

Un método incluido en Ventas Salvajes y asociado a la construcción de argumentos. Las fuentes públicas consultadas no permiten verificar su expansión ni su mecánica completa.

---

## [SM-FAQ-007] ¿Qué es el Método X3?

Un método mencionado en los programas oficiales de Ventas Salvajes. Su mecánica completa no está suficientemente expuesta en fuentes públicas.

---

## [SM-FAQ-008] ¿Qué es el Método Negocia?

Un método listado en los entrenamientos Ventas Salvajes dentro del bloque de acuerdos y cierres. No debe inventarse una secuencia oficial sin material autorizado.

---

## [SM-FAQ-009] ¿Qué es el Método Concluye?

Un método listado en los programas oficiales de Ventas Salvajes. Las fuentes abiertas revisadas no muestran su desarrollo completo.

---

## [SM-FAQ-010] ¿Qué es la Fórmula HEA?

Un concepto incluido en el índice de Ventas Salvajes 2. La expansión de las letras y la fórmula completa no están verificadas en las fuentes públicas consultadas.

---

## [SM-FAQ-011] ¿Qué recomienda Sandro para WhatsApp?

Sus materiales enfatizan estructura de mensajes, preguntas, audios, seguimiento con valor y técnicas para reactivar conversaciones.

---

## [SM-FAQ-012] ¿Qué papel tiene la historia?

La historia y el storyselling funcionan como herramientas para conectar emocionalmente, explicar y hacer memorable un argumento.

---

# 74. Keywords

```text
Sandro Meléndez
Sandro Melendez
Sandro Meléndez Aymar
Motivarte Perú
Ventas Salvajes
Ventas Salvajes 2
vendedor salvaje
Neuroratórica
neuro oratoria
neuroventas
oratoria comercial
retórica comercial
preguntas de poder
preguntas inducidas
primer impacto
confianza salvaje
pitch de poder
pitch de valor
argumentos potentes
argumentos estructurados
valor salvaje
fórmula de valor
seguimiento con valor
WhatsApp salvaje
teléfono salvaje
audios salvajes
textos levantamuertos
cierre parcial
acuerdos salvajes
cierres salvajes
método MEP
método X3
método Negocia
método Concluye
Fórmula HEA
storyselling
storytelling
metáfora ventas
marca personal
desahuévate
embudo de poder
Valor Viral Venta
3V ventas
```

---

# 75. Fuentes primarias y confiabilidad

## [SM-SOURCE-001] Editorial Planeta - autor

**Tipo:** fuente primaria editorial  
**Uso:** biografía, obras, trayectoria declarada

URL:

`https://www.planetadelibros.com.pe/autor/sandro-melendez/000062271`

---

## [SM-SOURCE-002] Editorial Planeta - Ventas Salvajes

**Tipo:** fuente primaria editorial  
**Uso:** publicación, ISBN, páginas, temática

URL:

`https://www.planetadelibros.com.pe/libro-ventas-salvajes/401208`

---

## [SM-SOURCE-003] Editorial Planeta - Ventas Salvajes 2

**Tipo:** fuente primaria editorial  
**Uso:** definición de Neuroratórica, publicación, ficha técnica

URL:

`https://www.planetadelibros.com.pe/libro-ventas-salvajes-2/423551`

---

## [SM-SOURCE-004] Motivarte Perú - Ventas Salvajes Ica 2025

**Tipo:** fuente oficial  
**Uso:** temario de entrenamiento

Temas verificados:

- qué saber para vender más;
- cambio de la venta;
- Valor, Viral y Venta;
- posicionamiento;
- embudo de poder;
- confianza;
- fluidez;
- seguridad;
- primer impacto;
- preguntas;
- prácticas;
- WhatsApp;
- valor;
- fórmula de valor;
- seguimiento con valor;
- MEP;
- X3;
- Negocia;
- cierre parcial;
- Concluye.

URL:

`https://motivarteperu.com/wp-content/uploads/2025/04/PDF-ICA-JUNIO-2025-1.pdf`

---

## [SM-SOURCE-005] Motivarte Perú - Ventas Salvajes 2 Online 2026

**Tipo:** fuente oficial  
**Uso:** evolución del programa hacia Neuroratórica

Temas verificados:

- primer impacto;
- comunicación;
- voz;
- audios;
- textos;
- conexión;
- pitch de valor;
- argumentos;
- storytelling;
- objeciones;
- reactivación de WhatsApp;
- marca personal;
- acción.

URL:

`https://motivarteperu.com/wp-content/uploads/2026/05/VENTAS-SALVAJES-ONLINE-2026-PDF-FINAL-1_compressed.pdf`

---

## [SM-SOURCE-006] Índice público Ventas Salvajes

**Tipo:** muestra pública de libro  
**Uso:** estructura de capítulos

URL:

`https://reader.digitalbooks.pro/book/preview/183851/cred.xhtml`

---

## [SM-SOURCE-007] Biblioteca UPEA - Ventas Salvajes 2

**Tipo:** catálogo bibliográfico institucional  
**Uso:** índice, ISBN, temas

URL:

`https://mibiblioteca.upea.bo/bib/5536`

---

## [SM-SOURCE-008] LinkedIn Sandro Meléndez

**Tipo:** fuente social directa  
**Uso:** contenido comercial, preguntas inducidas, marca personal

URL base:

`https://pe.linkedin.com/in/sandromelendez`

---

## [SM-SOURCE-009] Instagram Sandro Meléndez

**Tipo:** fuente social directa  
**Uso:** clips, programas, técnicas

URL:

`https://www.instagram.com/sandro_melendez/`

---

## [SM-SOURCE-010] Facebook Sandro Meléndez Aymar

**Tipo:** fuente social directa  
**Uso:** cierres, negociación, preguntas, seguimiento, WhatsApp

URL:

`https://www.facebook.com/SandroMelendezAymar/`

---

# 76. Fuentes secundarias

## [SM-SOURCE-011] Studocu

**Tipo:** tercero  
**Confiabilidad:** media-baja  
**Uso:** solo corroboración de temarios cuando coincide con fuente oficial.

---

## [SM-SOURCE-012] Scribd

**Tipo:** tercero  
**Confiabilidad:** variable  
**Uso:** no utilizar para completar contenido protegido ni asumir autenticidad automática.

---

# 77. Conflictos y datos que requieren cuidado

## [SM-CONFLICT-001] Fundación Motivarte Perú

- Planeta: 2006.
- Folleto oficial de entrenamiento: 2008.

Mantener ambos hasta nueva verificación directa.

---

## [SM-CONFLICT-002] Cantidad de entrenamientos

Las cifras públicas varían según fecha y fuente:

- más de 4,000 equipos en material de entrenamiento;
- más de 5,000 entrenamientos/equipos en biografía editorial más reciente.

Interpretar como cifras declaradas que evolucionaron en el tiempo.

---

## [SM-CONFLICT-003] Paginación Ventas Salvajes 2

Algunos registros muestran 173 páginas y otros 176.

No utilizar la paginación como dato crítico sin especificar edición o catálogo.

---

# 78. Conceptos cuyo nombre está confirmado pero no deben reconstruirse

```yaml
do_not_hallucinate:
  - Método MEP
  - Método X3
  - Método Negocia
  - Método Concluye
  - Fórmula HEA
  - fórmula exacta de Valor
  - mecánica exacta del Proceso Salvaje de 9 a 3
  - expansión de AP/AC
```

### Respuesta recomendada del asistente

"El concepto está documentado como parte de Ventas Salvajes, pero la fuente pública disponible no expone de forma suficiente su mecánica completa. Puedo explicar lo confirmado y trabajar una adaptación, diferenciándola de la metodología oficial."

---

# 79. Conceptos con alta recuperación semántica

## Cluster A: preguntas y diagnóstico

- preguntas de poder;
- preguntas inducidas;
- explorar;
- descubrir;
- diagnosticar;
- no prejuzgar.

## Cluster B: comunicación

- primer impacto;
- fluidez;
- voz;
- speech;
- argumentos;
- pitch;
- Neuroratórica.

## Cluster C: valor

- vender valor;
- valor salvaje;
- fórmula de valor;
- propuesta de valor.

## Cluster D: emocional

- historia;
- storyselling;
- metáfora;
- emoción;
- comedia;
- reflexión.

## Cluster E: cierre

- acuerdos;
- cierre parcial;
- negociación;
- cierre final;
- tensión.

## Cluster F: digital

- WhatsApp;
- audio;
- textos;
- visto;
- seguimiento;
- reactivación.

## Cluster G: identidad

- posicionamiento;
- marca personal;
- diferenciación;
- vendedor salvaje.

---

# 80. Resumen ejecutivo para embeddings

## [SM-SUMMARY-001]

Sandro Meléndez Aymar es un entrenador comercial y autor peruano asociado a Motivarte Perú y al sistema Ventas Salvajes. Su enfoque contrasta al vendedor tradicional, que asume, improvisa y repite errores, con un vendedor preparado que pregunta, explora, construye confianza, estructura argumentos, vende valor, negocia y busca acuerdos. Ventas Salvajes trabaja conceptos como preguntas de poder, confianza, primer impacto, fluidez, pitch de poder, Valor Salvaje, WhatsApp y teléfono, seguimiento con valor, acuerdos y cierres. Sus entrenamientos mencionan además los métodos MEP, X3, Negocia, Cierre Parcial y Concluye, aunque las mecánicas completas de varios de ellos no están expuestas públicamente. Ventas Salvajes 2 introduce la Neuroratórica, definida como un enfoque para comunicar y conectar mejor mediante neuroventas, oratoria, retórica, voz, historias, argumentos estructurados y emoción. La obra incluye temas como cerebro reptiliano, objeciones, storyselling, cierre, reactivación en WhatsApp, audios y marca personal. La metodología de formación de Sandro se asocia a objetivo, feedback y preguntas de poder, además de herramientas como metáfora, storyselling, comedia y reflexión.

---

# 81. Resumen ultra corto para retrieval

## [SM-SUMMARY-002]

```text
Ventas Salvajes = preparación + preguntas + confianza + argumentos + valor + acuerdos + cierre + seguimiento.

Ventas Salvajes 2 = comunicación + Neuroratórica + voz + historia + emoción + argumentos estructurados + objeciones + WhatsApp + cierre + marca personal.
```

---

# 82. Diseño recomendado de chunks

```yaml
chunking:
  preferred_boundary:
    - H2
    - H3
  target_tokens: 500
  minimum_tokens: 150
  maximum_tokens: 1000
  overlap_tokens: 80
  preserve:
    - block_id
    - tags
    - evidence_level
    - related_entities
    - source_reference
```

---

# 83. Metadata sugerida por chunk

```yaml
metadata_template:
  id: "SM-XXXX-000"
  entity: "Sandro Meléndez"
  framework: null
  category: null
  tags: []
  intent: null
  evidence_level: null
  official_method: false
  derived_adaptation: false
  source: null
  language: "es"
```

---

# 84. Ejemplo de objeto semántico

```yaml
id: "SM-FOLLOW-001"
entity: "Sandro Meléndez"
framework: "Ventas Salvajes"
category: "seguimiento"
tags:
  - seguimiento
  - valor
  - activadores
intent: "hacer_seguimiento"
evidence_level: "verified_primary"
official_method: true
derived_adaptation: false
summary: "El seguimiento debe aportar valor o activar una razón para retomar la conversación en vez de limitarse a recordatorios vacíos."
```

---

# 85. Ejemplo de objeto con conocimiento incompleto

```yaml
id: "SM-METHOD-001"
entity: "Sandro Meléndez"
framework: "Ventas Salvajes"
category: "métodos"
tags:
  - MEP
  - argumentos
intent: "metodo_mep"
evidence_level: "unverified_mechanics"
official_method: true
verified_name: true
verified_expansion: false
verified_mechanics: false
instruction: "No inventar la expansión de MEP. Explicar únicamente que se asocia a la construcción de argumentos potentes en contenido oficial."
```

---

# 86. Uso junto con otras bases

Esta base puede convivir con documentos de:

- Tim Villafuerte;
- ventas inmobiliarias internas;
- guiones de Lotes en Remate;
- objeciones;
- CRM;
- proyectos inmobiliarios.

### Regla de atribución

Cuando se combinen metodologías:

```yaml
combined_answer:
  preserve_source_method: true
  label_adaptations: true
  avoid_false_attribution: true
```

Ejemplo:

"Esta respuesta combina el diagnóstico PSD de Tim Villafuerte con el enfoque de preguntas, valor y Neuroratórica de Sandro Meléndez."

---

# 87. Adaptación futura para Lotes en Remate

## [LER-SM-001] Sistema sugerido

```text
1. PRIMER IMPACTO
2. PREGUNTA DE PODER
3. CONFIANZA
4. DIAGNÓSTICO
5. PITCH DE VALOR
6. EVIDENCIA
7. STORYSELLING
8. PREGUNTA INDUCIDA
9. ACUERDO PARCIAL
10. OBJECIÓN
11. NEGOCIACIÓN
12. CIERRE
13. SEGUIMIENTO CON VALOR
```

> Esta arquitectura es una adaptación propia basada en principios públicos de Sandro Meléndez, no un método oficial denominado de esta manera.

---

# 88. Fin

**Versión:** 1.0  
**Fecha de investigación:** 17 de agosto de 2026  
**Idioma:** español  
**Orientación:** RAG / embeddings / recuperación semántica  
**Entidad:** Sandro Meléndez Aymar  
**Frameworks principales:** Ventas Salvajes, Ventas Salvajes 2, Neuroratórica
