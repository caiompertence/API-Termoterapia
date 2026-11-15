// Especificação OpenAPI 3.0 da API, exibida pelo Swagger UI em /docs

const json = (schema) => ({ 'application/json': { schema } });
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const resp = (description, schema) => (schema ? { description, content: json(schema) } : { description });
const erro = (description) => resp(description, ref('Erro'));

const idPaciente = {
  name: 'id', in: 'path', required: true, description: 'ID do paciente', schema: { type: 'string', format: 'uuid' }
};
const idLembrete = {
  name: 'lembreteId', in: 'path', required: true, description: 'ID do lembrete', schema: { type: 'string', format: 'uuid' }
};

const r400 = erro('Dados inválidos (400)');
const r404 = erro('Paciente ou recurso não encontrado (404)');
const r500 = erro('Erro interno do servidor (500)');

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Termoterapia — API de Pacientes',
    version: '2.0.0',
    description:
      'API REST em camadas (rotas, controladores, dados) para o app Termoterapia: ' +
      'triagem entre frio e calor, registros de sessão, lembretes e chat com fisioterapeuta. ' +
      'Dados persistidos em SQLite. Códigos HTTP usados: 200, 201, 204, 400, 401, 404, 409 e 500.'
  },
  servers: [{ url: '/', description: 'Servidor atual' }],
  tags: [
    { name: 'Pacientes', description: 'Cadastro, login e perfil' },
    { name: 'Triagem', description: 'Perguntas, decisão e orientações' },
    { name: 'Registros', description: 'Como me senti e evolução' },
    { name: 'Lembretes', description: 'Lembretes de sessão' },
    { name: 'Chat', description: 'Conversa com o fisioterapeuta' },
    { name: 'Informações', description: 'Conteúdo educativo e clínicas próximas' }
  ],
  paths: {
    '/api/pacientes': {
      post: {
        tags: ['Pacientes'],
        summary: 'Cadastra um paciente ou entra (login)',
        description: 'Se o e-mail não existe, cria a conta (201, nome obrigatório). Se existe, confere a senha e entra (200).',
        requestBody: { required: true, content: json(ref('PacienteEntrada')) },
        responses: {
          200: resp('Login realizado', ref('Paciente')),
          201: resp('Paciente criado', ref('Paciente')),
          400: r400,
          401: erro('E-mail ou senha incorretos (401)'),
          500: r500
        }
      }
    },
    '/api/pacientes/{id}': {
      get: {
        tags: ['Pacientes'], summary: 'Busca um paciente', parameters: [idPaciente],
        responses: { 200: resp('Paciente encontrado', ref('Paciente')), 404: r404, 500: r500 }
      },
      put: {
        tags: ['Pacientes'], summary: 'Atualiza nome, e-mail e (opcionalmente) senha', parameters: [idPaciente],
        requestBody: { required: true, content: json(ref('PacienteAtualizacao')) },
        responses: {
          200: resp('Paciente atualizado', ref('Paciente')),
          400: r400, 404: r404,
          409: erro('E-mail já usado por outro paciente (409)'),
          500: r500
        }
      },
      delete: {
        tags: ['Pacientes'], summary: 'Remove o paciente e todos os seus dados', parameters: [idPaciente],
        responses: { 204: resp('Removido, sem corpo'), 404: r404, 500: r500 }
      }
    },
    '/api/pacientes/{id}/dados': {
      delete: {
        tags: ['Pacientes'], summary: 'Apaga registros, lembretes e chat (mantém a conta)', parameters: [idPaciente],
        responses: { 204: resp('Dados apagados, sem corpo'), 404: r404, 500: r500 }
      }
    },
    '/api/triagem/perguntas': {
      get: {
        tags: ['Triagem'], summary: 'Lista as 4 perguntas da triagem',
        responses: { 200: resp('Perguntas', { type: 'array', items: ref('PerguntaTriagem') }), 500: r500 }
      }
    },
    '/api/pacientes/{id}/triagem': {
      post: {
        tags: ['Triagem'], summary: 'Avalia a triagem e decide: frio, calor ou alerta', parameters: [idPaciente],
        requestBody: { required: true, content: json(ref('TriagemEntrada')) },
        responses: { 200: resp('Decisão da triagem', ref('TriagemResultado')), 400: r400, 404: r404, 500: r500 }
      }
    },
    '/api/orientacoes/{tipo}': {
      get: {
        tags: ['Triagem'], summary: 'Orientação de uso do frio ou do calor',
        parameters: [{ name: 'tipo', in: 'path', required: true, schema: { type: 'string', enum: ['frio', 'calor'] } }],
        responses: { 200: resp('Orientação', ref('Orientacao')), 404: erro('Tipo inválido (404)'), 500: r500 }
      }
    },
    '/api/pacientes/{id}/registros': {
      post: {
        tags: ['Registros'], summary: 'Registra como o paciente se sentiu na sessão', parameters: [idPaciente],
        requestBody: { required: true, content: json(ref('RegistroEntrada')) },
        responses: { 201: resp('Registro criado', ref('RegistroCriado')), 400: r400, 404: r404, 500: r500 }
      },
      get: {
        tags: ['Registros'], summary: 'Lista os registros (mais recentes primeiro)', parameters: [idPaciente],
        responses: { 200: resp('Registros', { type: 'array', items: ref('Registro') }), 404: r404, 500: r500 }
      }
    },
    '/api/pacientes/{id}/evolucao': {
      get: {
        tags: ['Registros'], summary: 'Resumo da evolução: total, dor média e alertas', parameters: [idPaciente],
        responses: { 200: resp('Evolução', ref('Evolucao')), 404: r404, 500: r500 }
      }
    },
    '/api/pacientes/{id}/lembretes': {
      post: {
        tags: ['Lembretes'], summary: 'Cria um lembrete', parameters: [idPaciente],
        requestBody: { required: true, content: json(ref('LembreteEntrada')) },
        responses: { 201: resp('Lembrete criado', ref('Lembrete')), 400: r400, 404: r404, 500: r500 }
      },
      get: {
        tags: ['Lembretes'], summary: 'Lista os lembretes', parameters: [idPaciente],
        responses: { 200: resp('Lembretes', { type: 'array', items: ref('Lembrete') }), 404: r404, 500: r500 }
      }
    },
    '/api/pacientes/{id}/lembretes/{lembreteId}': {
      put: {
        tags: ['Lembretes'], summary: 'Atualiza um lembrete', parameters: [idPaciente, idLembrete],
        requestBody: { required: true, content: json(ref('LembreteEntrada')) },
        responses: { 200: resp('Lembrete atualizado', ref('Lembrete')), 400: r400, 404: r404, 500: r500 }
      },
      delete: {
        tags: ['Lembretes'], summary: 'Remove um lembrete', parameters: [idPaciente, idLembrete],
        responses: { 204: resp('Removido, sem corpo'), 404: r404, 500: r500 }
      }
    },
    '/api/pacientes/{id}/chat': {
      get: {
        tags: ['Chat'], summary: 'Lista as mensagens do chat', parameters: [idPaciente],
        responses: { 200: resp('Mensagens', { type: 'array', items: ref('Mensagem') }), 404: r404, 500: r500 }
      },
      post: {
        tags: ['Chat'], summary: 'Envia uma mensagem (recebe resposta automática)', parameters: [idPaciente],
        requestBody: { required: true, content: json({ type: 'object', required: ['texto'], properties: { texto: { type: 'string', example: 'A dor diminuiu depois do calor.' } } }) },
        responses: { 201: resp('Mensagem do paciente + resposta automática', { type: 'array', items: ref('Mensagem') }), 400: r400, 404: r404, 500: r500 }
      }
    },
    '/api/informacoes': {
      get: {
        tags: ['Informações'], summary: 'Conteúdo educativo sobre termoterapia',
        responses: { 200: resp('Informações', { type: 'array', items: ref('Informacao') }), 500: r500 }
      }
    },
    '/api/fisioterapeutas-proximos': {
      get: {
        tags: ['Informações'], summary: 'Clínicas de fisioterapia próximas',
        responses: { 200: resp('Clínicas', { type: 'array', items: ref('Fisioterapeuta') }), 500: r500 }
      }
    }
  },
  components: {
    schemas: {
      Erro: { type: 'object', properties: { erro: { type: 'string', example: 'Paciente não encontrado.' } } },
      Paciente: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nome: { type: 'string', example: 'Maria Silva' },
          email: { type: 'string', example: 'maria@email.com' },
          ultimaOrientacao: { type: 'string', nullable: true, enum: ['frio', 'calor'] },
          criadoEm: { type: 'string', format: 'date-time' }
        }
      },
      PacienteEntrada: {
        type: 'object', required: ['email', 'senha'],
        properties: {
          nome: { type: 'string', example: 'Maria Silva', description: 'Obrigatório apenas ao criar a conta' },
          email: { type: 'string', example: 'maria@email.com' },
          senha: { type: 'string', minLength: 6, example: 'segredo123' }
        }
      },
      PacienteAtualizacao: {
        type: 'object', required: ['nome', 'email'],
        properties: {
          nome: { type: 'string', example: 'Maria S. Souza' },
          email: { type: 'string', example: 'maria.souza@email.com' },
          senha: { type: 'string', minLength: 6, description: 'Opcional: só envie para trocar a senha' }
        }
      },
      PerguntaTriagem: {
        type: 'object',
        properties: { id: { type: 'integer' }, pergunta: { type: 'string' }, opcoes: { type: 'array', items: { type: 'string' } } }
      },
      TriagemEntrada: {
        type: 'object', required: ['respostas'],
        properties: {
          respostas: {
            type: 'array', minItems: 4, items: { type: 'string' },
            example: ['Joelho', 'Há poucos dias (pancada, torção ou esforço)', 'Inchado, vermelho ou quente', 'Não']
          }
        }
      },
      Orientacao: {
        type: 'object',
        properties: {
          tipo: { type: 'string' }, nome: { type: 'string' }, duracaoMinutos: { type: 'integer' },
          passos: { type: 'array', items: { type: 'string' } }, alerta: { type: 'string' }
        }
      },
      TriagemResultado: {
        type: 'object',
        properties: {
          decisao: { type: 'string', enum: ['frio', 'calor', 'alerta'] },
          orientacao: ref('Orientacao'),
          titulo: { type: 'string', description: 'Só quando decisao = alerta' },
          mensagem: { type: 'string', description: 'Só quando decisao = alerta' }
        }
      },
      RegistroEntrada: {
        type: 'object', required: ['recurso', 'dor'],
        properties: {
          recurso: { type: 'string', enum: ['Frio', 'Calor'] },
          sintomas: { type: 'array', items: { type: 'string' }, example: ['Alívio'] },
          dor: { type: 'integer', minimum: 0, maximum: 10, example: 4 }
        }
      },
      Registro: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }, pacienteId: { type: 'string', format: 'uuid' },
          recurso: { type: 'string', enum: ['Frio', 'Calor'] },
          sintomas: { type: 'array', items: { type: 'string' } },
          dor: { type: 'integer' }, alerta: { type: 'boolean' }, criadoEm: { type: 'string', format: 'date-time' }
        }
      },
      RegistroCriado: {
        type: 'object',
        properties: { registro: ref('Registro'), aviso: { type: 'string', nullable: true } }
      },
      Evolucao: {
        type: 'object',
        properties: {
          totalSessoes: { type: 'integer' }, dorMedia: { type: 'number' }, sessoesComAlerta: { type: 'integer' },
          historico: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' }, recurso: { type: 'string' }, dor: { type: 'integer' },
                alerta: { type: 'boolean' }, data: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      },
      LembreteEntrada: {
        type: 'object', required: ['horario', 'recurso'],
        properties: {
          horario: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', example: '19:30' },
          recurso: { type: 'string', enum: ['Frio', 'Calor'] }
        }
      },
      Lembrete: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }, pacienteId: { type: 'string', format: 'uuid' },
          horario: { type: 'string', example: '19:30' }, recurso: { type: 'string', enum: ['Frio', 'Calor'] }
        }
      },
      Mensagem: {
        type: 'object',
        properties: {
          id: { type: 'string' }, pacienteId: { type: 'string' },
          remetente: { type: 'string', enum: ['paciente', 'fisioterapeuta'] },
          texto: { type: 'string' }, criadoEm: { type: 'string', format: 'date-time' }
        }
      },
      Informacao: { type: 'object', properties: { titulo: { type: 'string' }, conteudo: { type: 'string' } } },
      Fisioterapeuta: {
        type: 'object',
        properties: { id: { type: 'integer' }, nome: { type: 'string' }, especialidade: { type: 'string' }, distanciaKm: { type: 'number' } }
      }
    }
  }
};
