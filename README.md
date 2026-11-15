# Termoterapia — API de Pacientes

API REST em camadas para o app **Termoterapia** (projeto da UC de Usabilidade), desenvolvida na A3 de Sistemas Distribuídos.
O paciente responde a uma triagem rápida e recebe a orientação de **frio**, **calor** ou **alerta** (procurar um fisioterapeuta), além de registrar como se sentiu, criar lembretes e conversar com o fisioterapeuta.

## Tecnologias
- Node.js + Express
- SQLite embutido no Node.js (`node:sqlite`) — banco em arquivo, sem instalar nem compilar nada
- Swagger UI / OpenAPI 3 (`swagger-ui-express`)
- `bcryptjs` para guardar senhas com hash

## Como rodar
Requer Node.js 22.13 ou superior (testado no 22 e no 26).

```bash
npm install
npm run dev      # ou: npm start
```

- API: http://localhost:3000
- **Documentação Swagger: http://localhost:3000/docs**
- Banco: criado automaticamente em `database/termoterapia.sqlite` na primeira execução.

Testes automatizados (13 testes, cobrem todos os verbos e códigos de status):

```bash
npm test
```

## Arquitetura em camadas
```
src/
  server.js                      # inicia o servidor
  app.js                         # monta o Express (middlewares, rotas, Swagger)
  routes/pacientesRoutes.js      # camada de rotas
  controllers/pacientesController.js   # regras de negócio e validação
  data/database.js               # camada de dados (SQLite, criação das tabelas)
  data/store.js                  # conteúdo estático (orientações, perguntas, informações)
  middlewares/errorHandler.js    # 404 e tratamento global de erros (500)
  docs/swagger.js                # especificação OpenAPI
test/api.test.js                 # testes de integração
```

## Endpoints

| Verbo | Rota | Descrição | Status |
|---|---|---|---|
| POST | `/api/pacientes` | Cadastra (201) ou entra com e-mail e senha (200) | 200, 201, 400, 401 |
| GET | `/api/pacientes/:id` | Busca paciente | 200, 404 |
| **PUT** | `/api/pacientes/:id` | Atualiza nome, e-mail e senha (opcional) | 200, 400, 404, 409 |
| DELETE | `/api/pacientes/:id` | Remove paciente e todos os seus dados | 204, 404 |
| DELETE | `/api/pacientes/:id/dados` | Apaga registros, lembretes e chat (mantém a conta) | 204, 404 |
| GET | `/api/triagem/perguntas` | Lista as perguntas da triagem | 200 |
| POST | `/api/pacientes/:id/triagem` | Decide frio, calor ou alerta | 200, 400, 404 |
| GET | `/api/orientacoes/:tipo` | Orientação de uso (`frio` ou `calor`) | 200, 404 |
| POST | `/api/pacientes/:id/registros` | Registra como se sentiu na sessão | 201, 400, 404 |
| GET | `/api/pacientes/:id/registros` | Lista registros | 200, 404 |
| GET | `/api/pacientes/:id/evolucao` | Total de sessões, dor média, alertas | 200, 404 |
| POST | `/api/pacientes/:id/lembretes` | Cria lembrete | 201, 400, 404 |
| GET | `/api/pacientes/:id/lembretes` | Lista lembretes | 200, 404 |
| **PUT** | `/api/pacientes/:id/lembretes/:lembreteId` | Atualiza lembrete | 200, 400, 404 |
| DELETE | `/api/pacientes/:id/lembretes/:lembreteId` | Remove lembrete | 204, 404 |
| GET | `/api/pacientes/:id/chat` | Mensagens do chat | 200, 404 |
| POST | `/api/pacientes/:id/chat` | Envia mensagem (resposta automática) | 201, 400, 404 |
| GET | `/api/informacoes` | Conteúdo educativo | 200 |
| GET | `/api/fisioterapeutas-proximos` | Clínicas próximas | 200 |

Qualquer falha inesperada retorna **500** (`{"erro": "Erro interno do servidor."}`), JSON malformado retorna **400** e rotas inexistentes retornam **404**.

## Exemplo rápido
```bash
curl -X POST localhost:3000/api/pacientes -H "Content-Type: application/json" \
  -d '{"nome":"Maria","email":"maria@email.com","senha":"segredo123"}'
```

## Aviso
Projeto acadêmico. As orientações de frio e calor são genéricas e não substituem a avaliação de um fisioterapeuta.
