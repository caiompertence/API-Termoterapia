process.env.DB_PATH = ':memory:';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const app = require('../src/app');
const { naoEncontrado, tratarErros } = require('../src/middlewares/errorHandler');

let server, base, pacienteId, lembreteId;
const call = async (method, path, body) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

before(() => new Promise((ok) => { server = app.listen(0, () => { base = `http://localhost:${server.address().port}`; ok(); }); }));
after(() => server.close());

test('GET / e documentação Swagger respondem 200', async () => {
  assert.equal((await call('GET', '/')).status, 200);
  assert.equal((await call('GET', '/docs.json')).status, 200);
  const html = await fetch(base + '/docs/');
  assert.equal(html.status, 200);
});

test('POST /api/pacientes: cria (201), valida (400), entra (200) e rejeita senha errada (401)', async () => {
  assert.equal((await call('POST', '/api/pacientes', { nome: 'Ana', email: 'x', senha: '123456' })).status, 400);
  assert.equal((await call('POST', '/api/pacientes', { nome: 'Ana', email: 'ana@email.com', senha: '123' })).status, 400);
  assert.equal((await call('POST', '/api/pacientes', { email: 'ana@email.com', senha: '123456' })).status, 400); // sem nome ao criar

  const criado = await call('POST', '/api/pacientes', { nome: 'Ana', email: 'Ana@Email.com', senha: 'segredo1' });
  assert.equal(criado.status, 201);
  assert.equal(criado.body.senha, undefined);
  assert.equal(criado.body.senha_hash, undefined);
  pacienteId = criado.body.id;

  const login = await call('POST', '/api/pacientes', { email: 'ana@email.com', senha: 'segredo1' });
  assert.equal(login.status, 200);
  assert.equal(login.body.id, pacienteId);
  assert.equal((await call('POST', '/api/pacientes', { email: 'ana@email.com', senha: 'errada123' })).status, 401);
});

test('GET /api/pacientes/:id: 200 e 404', async () => {
  assert.equal((await call('GET', `/api/pacientes/${pacienteId}`)).status, 200);
  assert.equal((await call('GET', '/api/pacientes/nao-existe')).status, 404);
});

test('PUT /api/pacientes/:id: 200, 400, 404 e 409', async () => {
  const ok = await call('PUT', `/api/pacientes/${pacienteId}`, { nome: 'Ana Souza', email: 'ana.souza@email.com' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.nome, 'Ana Souza');
  assert.equal((await call('PUT', `/api/pacientes/${pacienteId}`, { nome: '', email: 'a@a.com' })).status, 400);
  assert.equal((await call('PUT', '/api/pacientes/xxx', { nome: 'A', email: 'a@a.com' })).status, 404);

  await call('POST', '/api/pacientes', { nome: 'Bruno', email: 'bruno@email.com', senha: 'segredo1' });
  assert.equal((await call('PUT', `/api/pacientes/${pacienteId}`, { nome: 'Ana', email: 'bruno@email.com' })).status, 409);
});

test('Triagem: perguntas, decisões e validações', async () => {
  assert.equal((await call('GET', '/api/triagem/perguntas')).body.length, 4);
  const frio = await call('POST', `/api/pacientes/${pacienteId}/triagem`, { respostas: ['Joelho', 'Há semanas ou meses', 'Inchado, vermelho ou quente', 'Não'] });
  assert.equal(frio.status, 200);
  assert.equal(frio.body.decisao, 'frio');
  const calor = await call('POST', `/api/pacientes/${pacienteId}/triagem`, { respostas: ['Costas', 'Há semanas ou meses', 'Duro, tenso ou rígido', 'Não'] });
  assert.equal(calor.body.decisao, 'calor');
  const alerta = await call('POST', `/api/pacientes/${pacienteId}/triagem`, { respostas: ['Costas', 'Há semanas ou meses', 'Duro, tenso ou rígido', 'Sim'] });
  assert.equal(alerta.body.decisao, 'alerta');
  assert.equal((await call('POST', `/api/pacientes/${pacienteId}/triagem`, { respostas: ['a'] })).status, 400);
  assert.equal((await call('POST', `/api/pacientes/${pacienteId}/triagem`, { respostas: [1, null, 3, 4] })).status, 400);
  assert.equal((await call('POST', '/api/pacientes/xxx/triagem', { respostas: ['a', 'b', 'c', 'Não'] })).status, 404);
  assert.equal((await call('GET', `/api/pacientes/${pacienteId}`)).body.ultimaOrientacao, 'calor');
});

test('Orientações: 200 e 404', async () => {
  assert.equal((await call('GET', '/api/orientacoes/frio')).status, 200);
  assert.equal((await call('GET', '/api/orientacoes/calor')).status, 200);
  assert.equal((await call('GET', '/api/orientacoes/toString')).status, 404);
});

test('Registros e evolução', async () => {
  const p = `/api/pacientes/${pacienteId}`;
  assert.equal((await call('POST', `${p}/registros`, { recurso: 'Gelo', dor: 3 })).status, 400);
  assert.equal((await call('POST', `${p}/registros`, { recurso: 'Frio', dor: 11 })).status, 400);
  assert.equal((await call('POST', `${p}/registros`, { recurso: 'Frio', dor: '' })).status, 400);
  assert.equal((await call('POST', `${p}/registros`, { recurso: 'Frio', dor: null })).status, 400);
  assert.equal((await call('POST', `${p}/registros`, { recurso: 'Frio', dor: 3, sintomas: 'x' })).status, 400);

  const a = await call('POST', `${p}/registros`, { recurso: 'Frio', dor: 4, sintomas: ['Alívio'] });
  assert.equal(a.status, 201);
  assert.equal(a.body.registro.alerta, false);
  assert.equal(a.body.aviso, null);
  const b = await call('POST', `${p}/registros`, { recurso: 'Calor', dor: 6, sintomas: ['Ardência'] });
  assert.equal(b.body.registro.alerta, true);
  assert.ok(b.body.aviso);

  const lista = await call('GET', `${p}/registros`);
  assert.equal(lista.status, 200);
  assert.equal(lista.body.length, 2);
  assert.equal(lista.body[0].recurso, 'Calor'); // mais recente primeiro

  const ev = await call('GET', `${p}/evolucao`);
  assert.equal(ev.status, 200);
  assert.deepEqual([ev.body.totalSessoes, ev.body.dorMedia, ev.body.sessoesComAlerta], [2, 5, 1]);
  assert.equal(ev.body.historico[0].recurso, 'Frio'); // histórico em ordem cronológica
});

test('Lembretes: POST, GET, PUT, DELETE', async () => {
  const p = `/api/pacientes/${pacienteId}`;
  assert.equal((await call('POST', `${p}/lembretes`, { horario: '25:00', recurso: 'Frio' })).status, 400);
  assert.equal((await call('POST', `${p}/lembretes`, { horario: '19:30', recurso: 'Vapor' })).status, 400);

  const criado = await call('POST', `${p}/lembretes`, { horario: '19:30', recurso: 'Calor' });
  assert.equal(criado.status, 201);
  lembreteId = criado.body.id;
  assert.equal((await call('GET', `${p}/lembretes`)).body.length, 1);

  const upd = await call('PUT', `${p}/lembretes/${lembreteId}`, { horario: '08:00', recurso: 'Frio' });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.horario, '08:00');
  assert.equal((await call('PUT', `${p}/lembretes/inexistente`, { horario: '08:00', recurso: 'Frio' })).status, 404);
  assert.equal((await call('PUT', `${p}/lembretes/${lembreteId}`, { horario: 'abc', recurso: 'Frio' })).status, 400);

  assert.equal((await call('DELETE', `${p}/lembretes/${lembreteId}`)).status, 204);
  assert.equal((await call('DELETE', `${p}/lembretes/${lembreteId}`)).status, 404);
});

test('Chat: boas-vindas, envio e validação', async () => {
  const p = `/api/pacientes/${pacienteId}/chat`;
  const inicial = await call('GET', p);
  assert.equal(inicial.status, 200);
  assert.equal(inicial.body.length, 1);
  assert.equal((await call('POST', p, { texto: '   ' })).status, 400);
  const envio = await call('POST', p, { texto: 'Olá!' });
  assert.equal(envio.status, 201);
  assert.equal(envio.body.length, 2);
  assert.equal((await call('GET', p)).body.length, 3);
});

test('Informações e fisioterapeutas próximos', async () => {
  assert.equal((await call('GET', '/api/informacoes')).body.length, 4);
  assert.equal((await call('GET', '/api/fisioterapeutas-proximos')).body.length, 3);
});

test('DELETE dados mantém a conta; DELETE paciente remove tudo', async () => {
  const p = `/api/pacientes/${pacienteId}`;
  assert.equal((await call('DELETE', `${p}/dados`)).status, 204);
  assert.equal((await call('GET', `${p}/registros`)).body.length, 0);
  assert.equal((await call('GET', p)).status, 200);
  assert.equal((await call('DELETE', p)).status, 204);
  assert.equal((await call('GET', p)).status, 404);
  assert.equal((await call('DELETE', p)).status, 404);
});

test('Rota inexistente -> 404 e JSON malformado -> 400', async () => {
  assert.equal((await call('GET', '/api/rota-que-nao-existe')).status, 404);
  const res = await fetch(base + '/api/pacientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{quebrado' });
  assert.equal(res.status, 400);
});

test('Falha inesperada -> 500 pelo tratador global', async () => {
  const mini = express();
  mini.get('/boom', () => { throw new Error('falha simulada'); });
  mini.use(naoEncontrado);
  mini.use(tratarErros);
  const s = mini.listen(0);
  const originalError = console.error;
  console.error = () => {};
  try {
    const res = await fetch(`http://localhost:${s.address().port}/boom`);
    assert.equal(res.status, 500);
    assert.equal((await res.json()).erro, 'Erro interno do servidor.');
  } finally {
    console.error = originalError;
    s.close();
  }
});
