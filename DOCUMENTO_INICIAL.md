# Documento Inicial — A3 Sistemas Distribuídos

**Projeto:** Termoterapia — API de Pacientes
**Grupo:** Arthur Santana, Caio Pertence, Davi Augusto, Lucas Belisário, Lucas Machado.

## 1. Tema
Orientação para o uso doméstico de **termoterapia** (aplicação de frio ou calor) por pacientes em acompanhamento fisioterapêutico.

## 2. Descrição
A API é o back-end do app Termoterapia, projetado na UC de Usabilidade. Ela atende ao fluxo do paciente:

1. **Acesso:** cadastro e login com e-mail e senha (senha armazenada com hash).
2. **Triagem rápida:** quatro perguntas (local, tempo do incômodo, aspecto do local e sinais de risco) que resultam em uma decisão: **frio**, **calor** ou **alerta** (falar com um fisioterapeuta antes de usar).
3. **Orientações:** passos, duração e cuidados para cada recurso.
4. **Registro de sessão ("Como me senti"):** nível de dor de 0 a 10 e sintomas, com aviso automático quando há sinal de alerta.
5. **Evolução:** total de sessões, dor média e sessões com alerta.
6. **Lembretes** de horário para as sessões.
7. **Chat** com o fisioterapeuta, conteúdo educativo e clínicas próximas.

## 3. Problema que resolve
Pacientes costumam ter dúvida sobre quando usar frio ou calor e podem aplicá-los de forma incorreta ou insegura (por exemplo, em local com ferida, dormência ou problema de circulação). A API centraliza a decisão guiada, o acompanhamento e a comunicação com o profissional.

## 4. Requisitos do roteiro e como foram atendidos

| # | Requisito | Atendimento |
|---|---|---|
| 1 | API para o projeto da UC de Usabilidade | API do app Termoterapia |
| 2 | Múltiplas camadas, Flask ou FastAPI (preferencialmente) | Camadas de rotas, controladores e dados. Implementada em **Node.js/Express** (a indicação de Flask/FastAPI é preferencial, não obrigatória) |
| 3 | Rotas GET, PUT, POST e DELETE | Todos os verbos implementados (ver tabela no README) |
| 4 | Documentação Swagger ou similar | Swagger UI em `/docs` (OpenAPI 3) |
| 5 | Status HTTP 200, 400, 404, 500 | Todos usados, além de 201, 204, 401 e 409 |
| 6 | Dados em um BD de sua escolha | **SQLite** (módulo embutido do Node.js), com tabelas relacionadas e exclusão em cascata |

## 5. Modelo de dados
- `pacientes` (id, nome, email único, senha_hash, ultima_orientacao, criado_em)
- `registros` (id, paciente_id → pacientes, recurso, sintomas, dor, alerta, criado_em)
- `lembretes` (id, paciente_id → pacientes, horario, recurso)
- `mensagens` (id, paciente_id → pacientes, remetente, texto, criado_em)

## 6. Tecnologias
Node.js, Express, SQLite (node:sqlite), Swagger UI, bcryptjs, GitHub.

## 7. Como executar
Ver o `README.md` do repositório (`npm install` e `npm run dev`; Swagger em `/docs`).
