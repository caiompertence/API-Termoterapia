const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../data/database');
const { ORI, PERGUNTAS_TRIAGEM, INFORMACOES, FISIOTERAPEUTAS_PROXIMOS, MENSAGEM_BOAS_VINDAS } = require('../data/store');

const gerarId = () => crypto.randomUUID();
const agora = () => new Date().toISOString();
const RECURSOS = ['Frio', 'Calor'];
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const HORARIO_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// ---------- Conversores (linha do banco -> JSON da API; nunca expõem a senha) ----------
const toPaciente = (r) => ({
  id: r.id,
  nome: r.nome,
  email: r.email,
  ultimaOrientacao: r.ultima_orientacao,
  criadoEm: r.criado_em
});
const toRegistro = (r) => ({
  id: r.id,
  pacienteId: r.paciente_id,
  recurso: r.recurso,
  sintomas: JSON.parse(r.sintomas),
  dor: r.dor,
  alerta: Boolean(r.alerta),
  criadoEm: r.criado_em
});
const toLembrete = (r) => ({ id: r.id, pacienteId: r.paciente_id, horario: r.horario, recurso: r.recurso });
const toMensagem = (r) => ({ id: r.id, pacienteId: r.paciente_id, remetente: r.remetente, texto: r.texto, criadoEm: r.criado_em });

// ---------- Middleware: valida que o paciente de :id existe (404 caso contrário) ----------
exports.carregarPaciente = (req, res, next, id) => {
  const row = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ erro: 'Paciente não encontrado.' });
  req.paciente = row;
  return next();
};

// ---------- Pacientes ----------
// POST: cria a conta (201) ou, se o e-mail já existir, confere a senha e entra (200).
exports.criarOuEntrar = (req, res) => {
  const { nome, email, senha } = req.body || {};
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ erro: 'Informe um e-mail válido.' });
  }
  if (typeof senha !== 'string' || senha.length < 6) {
    return res.status(400).json({ erro: 'A senha precisa ter ao menos 6 caracteres.' });
  }

  const emailNorm = email.trim().toLowerCase();
  const existente = db.prepare('SELECT * FROM pacientes WHERE email = ?').get(emailNorm);

  if (existente) {
    if (!bcrypt.compareSync(senha, existente.senha_hash)) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }
    return res.status(200).json(toPaciente(existente));
  }

  if (typeof nome !== 'string' || !nome.trim()) {
    return res.status(400).json({ erro: 'Informe seu nome.' });
  }
  const novo = {
    id: gerarId(),
    nome: nome.trim(),
    email: emailNorm,
    senha_hash: bcrypt.hashSync(senha, 10),
    ultima_orientacao: null,
    criado_em: agora()
  };
  db.prepare(`INSERT INTO pacientes (id, nome, email, senha_hash, ultima_orientacao, criado_em)
              VALUES (@id, @nome, @email, @senha_hash, @ultima_orientacao, @criado_em)`).run(novo);
  return res.status(201).json(toPaciente(novo));
};

exports.obterPaciente = (req, res) => res.status(200).json(toPaciente(req.paciente));

// PUT: substitui nome e e-mail (senha é opcional).
exports.atualizarPaciente = (req, res) => {
  const { nome, email, senha } = req.body || {};
  if (typeof nome !== 'string' || !nome.trim()) return res.status(400).json({ erro: 'Informe seu nome.' });
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ erro: 'Informe um e-mail válido.' });
  }
  if (senha !== undefined && (typeof senha !== 'string' || senha.length < 6)) {
    return res.status(400).json({ erro: 'A senha precisa ter ao menos 6 caracteres.' });
  }

  const emailNorm = email.trim().toLowerCase();
  const conflito = db.prepare('SELECT id FROM pacientes WHERE email = ? AND id <> ?').get(emailNorm, req.paciente.id);
  if (conflito) return res.status(409).json({ erro: 'Já existe um paciente com esse e-mail.' });

  const senhaHash = senha ? bcrypt.hashSync(senha, 10) : req.paciente.senha_hash;
  db.prepare('UPDATE pacientes SET nome = ?, email = ?, senha_hash = ? WHERE id = ?')
    .run(nome.trim(), emailNorm, senhaHash, req.paciente.id);

  const atualizado = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(req.paciente.id);
  return res.status(200).json(toPaciente(atualizado));
};

// DELETE: remove o paciente e tudo que é dele (cascata).
exports.removerPaciente = (req, res) => {
  db.prepare('DELETE FROM pacientes WHERE id = ?').run(req.paciente.id);
  return res.status(204).send();
};

// DELETE: apaga só os dados (registros, lembretes, chat), mantendo a conta.
exports.apagarDadosPaciente = (req, res) => {
  const id = req.paciente.id;
  db.transaction(() => {
    db.prepare('DELETE FROM registros WHERE paciente_id = ?').run(id);
    db.prepare('DELETE FROM lembretes WHERE paciente_id = ?').run(id);
    db.prepare('DELETE FROM mensagens WHERE paciente_id = ?').run(id);
    db.prepare('UPDATE pacientes SET ultima_orientacao = NULL WHERE id = ?').run(id);
  })();
  return res.status(204).send();
};

// ---------- Triagem e orientações ----------
exports.listarPerguntasTriagem = (_req, res) => res.status(200).json(PERGUNTAS_TRIAGEM);

exports.avaliarTriagem = (req, res) => {
  const { respostas } = req.body || {};
  if (!Array.isArray(respostas) || respostas.length < 4 || !respostas.slice(0, 4).every(r => typeof r === 'string')) {
    return res.status(400).json({ erro: 'Envie as 4 respostas da triagem (texto).' });
  }

  const r = respostas;
  const resultado =
    r[3] !== 'Não' ? 'alerta' :
    r[2].startsWith('I') ? 'frio' :
    r[2].startsWith('D') ? 'calor' :
    r[1].includes('poucos') ? 'frio' :
    r[1].includes('semanas') ? 'calor' : 'alerta';

  if (resultado === 'alerta') {
    return res.status(200).json({
      decisao: 'alerta',
      titulo: 'Fale com um fisioterapeuta antes de usar calor ou frio',
      mensagem: 'Pelas suas respostas, o uso por conta própria pode não ser seguro. Ferida aberta, dormência, problema de circulação ou dúvida pedem avaliação.'
    });
  }

  db.prepare('UPDATE pacientes SET ultima_orientacao = ? WHERE id = ?').run(resultado, req.paciente.id);
  return res.status(200).json({ decisao: resultado, orientacao: ORI[resultado] });
};

exports.obterOrientacao = (req, res) => {
  const tipo = req.params.tipo;
  if (!Object.prototype.hasOwnProperty.call(ORI, tipo)) {
    return res.status(404).json({ erro: 'Tipo de orientação inválido (use frio ou calor).' });
  }
  return res.status(200).json(ORI[tipo]);
};

// ---------- Registros de sessão e evolução ----------
exports.criarRegistro = (req, res) => {
  const { recurso, sintomas = [], dor } = req.body || {};
  if (!RECURSOS.includes(recurso)) {
    return res.status(400).json({ erro: 'Recurso deve ser "Frio" ou "Calor".' });
  }
  if (!Array.isArray(sintomas) || !sintomas.every(s => typeof s === 'string')) {
    return res.status(400).json({ erro: 'Sintomas deve ser uma lista de textos.' });
  }
  const nivelDor = typeof dor === 'string' && dor.trim() === '' ? NaN : Number(dor);
  if (dor === null || dor === undefined || !Number.isInteger(nivelDor) || nivelDor < 0 || nivelDor > 10) {
    return res.status(400).json({ erro: 'Dor deve ser um número inteiro entre 0 e 10.' });
  }

  const alerta = sintomas.some(s => s !== 'Alívio');
  const registro = {
    id: gerarId(),
    paciente_id: req.paciente.id,
    recurso,
    sintomas: JSON.stringify(sintomas),
    dor: nivelDor,
    alerta: alerta ? 1 : 0,
    criado_em: agora()
  };
  db.prepare(`INSERT INTO registros (id, paciente_id, recurso, sintomas, dor, alerta, criado_em)
              VALUES (@id, @paciente_id, @recurso, @sintomas, @dor, @alerta, @criado_em)`).run(registro);

  return res.status(201).json({
    registro: toRegistro(registro),
    aviso: alerta ? 'Retire o recurso. Se o sintoma continuar, procure o seu fisioterapeuta.' : null
  });
};

exports.listarRegistros = (req, res) => {
  const rows = db.prepare('SELECT * FROM registros WHERE paciente_id = ? ORDER BY rowid DESC').all(req.paciente.id);
  return res.status(200).json(rows.map(toRegistro));
};

exports.obterEvolucao = (req, res) => {
  const lista = db.prepare('SELECT * FROM registros WHERE paciente_id = ? ORDER BY rowid ASC').all(req.paciente.id).map(toRegistro);
  const totalSessoes = lista.length;
  const dorMedia = totalSessoes ? Number((lista.reduce((acc, r) => acc + r.dor, 0) / totalSessoes).toFixed(1)) : 0;
  const sessoesComAlerta = lista.filter(r => r.alerta).length;

  return res.status(200).json({
    totalSessoes,
    dorMedia,
    sessoesComAlerta,
    historico: lista.map(r => ({ id: r.id, recurso: r.recurso, dor: r.dor, alerta: r.alerta, data: r.criadoEm }))
  });
};

// ---------- Lembretes ----------
const validarLembrete = (body) => {
  const { horario, recurso } = body || {};
  if (typeof horario !== 'string' || !HORARIO_REGEX.test(horario) || !RECURSOS.includes(recurso)) {
    return 'Informe horário (HH:MM) e recurso ("Frio" ou "Calor").';
  }
  return null;
};

exports.criarLembrete = (req, res) => {
  const erro = validarLembrete(req.body);
  if (erro) return res.status(400).json({ erro });

  const l = { id: gerarId(), paciente_id: req.paciente.id, horario: req.body.horario, recurso: req.body.recurso };
  db.prepare('INSERT INTO lembretes (id, paciente_id, horario, recurso) VALUES (@id, @paciente_id, @horario, @recurso)').run(l);
  return res.status(201).json(toLembrete(l));
};

exports.listarLembretes = (req, res) => {
  const rows = db.prepare('SELECT * FROM lembretes WHERE paciente_id = ? ORDER BY horario ASC').all(req.paciente.id);
  return res.status(200).json(rows.map(toLembrete));
};

exports.atualizarLembrete = (req, res) => {
  const erro = validarLembrete(req.body);
  if (erro) return res.status(400).json({ erro });

  const info = db.prepare('UPDATE lembretes SET horario = ?, recurso = ? WHERE id = ? AND paciente_id = ?')
    .run(req.body.horario, req.body.recurso, req.params.lembreteId, req.paciente.id);
  if (info.changes === 0) return res.status(404).json({ erro: 'Lembrete não encontrado.' });

  const row = db.prepare('SELECT * FROM lembretes WHERE id = ?').get(req.params.lembreteId);
  return res.status(200).json(toLembrete(row));
};

exports.removerLembrete = (req, res) => {
  const info = db.prepare('DELETE FROM lembretes WHERE id = ? AND paciente_id = ?').run(req.params.lembreteId, req.paciente.id);
  if (info.changes === 0) return res.status(404).json({ erro: 'Lembrete não encontrado.' });
  return res.status(204).send();
};

// ---------- Chat com fisioterapeuta ----------
exports.listarMensagens = (req, res) => {
  const rows = db.prepare('SELECT * FROM mensagens WHERE paciente_id = ? ORDER BY rowid ASC').all(req.paciente.id);
  const abertura = { ...MENSAGEM_BOAS_VINDAS, pacienteId: req.paciente.id, criadoEm: req.paciente.criado_em };
  return res.status(200).json([abertura, ...rows.map(toMensagem)]);
};

exports.enviarMensagem = (req, res) => {
  const { texto } = req.body || {};
  if (typeof texto !== 'string' || !texto.trim()) return res.status(400).json({ erro: 'Escreva uma mensagem.' });

  const momento = agora();
  const msgPaciente = { id: gerarId(), paciente_id: req.paciente.id, remetente: 'paciente', texto: texto.trim(), criado_em: momento };
  const respostaAuto = {
    id: gerarId(), paciente_id: req.paciente.id, remetente: 'fisioterapeuta',
    texto: 'Recebido. Seu fisioterapeuta responde em breve.', criado_em: momento
  };
  const ins = db.prepare(`INSERT INTO mensagens (id, paciente_id, remetente, texto, criado_em)
                          VALUES (@id, @paciente_id, @remetente, @texto, @criado_em)`);
  db.transaction(() => { ins.run(msgPaciente); ins.run(respostaAuto); })();
  return res.status(201).json([toMensagem(msgPaciente), toMensagem(respostaAuto)]);
};

// ---------- Conteúdo educativo e clínicas próximas ----------
exports.listarInformacoes = (_req, res) => res.status(200).json(INFORMACOES);
exports.listarFisioterapeutasProximos = (_req, res) => res.status(200).json(FISIOTERAPEUTAS_PROXIMOS);
