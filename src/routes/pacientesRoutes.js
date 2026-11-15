const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pacientesController');

// Toda rota com :id passa antes por aqui: se o paciente não existir, responde 404.
router.param('id', ctrl.carregarPaciente);

// Acesso e perfil do paciente
router.post('/pacientes', ctrl.criarOuEntrar);
router.get('/pacientes/:id', ctrl.obterPaciente);
router.put('/pacientes/:id', ctrl.atualizarPaciente);
router.delete('/pacientes/:id', ctrl.removerPaciente);
router.delete('/pacientes/:id/dados', ctrl.apagarDadosPaciente);

// Triagem e orientações (Frio / Calor)
router.get('/triagem/perguntas', ctrl.listarPerguntasTriagem);
router.post('/pacientes/:id/triagem', ctrl.avaliarTriagem);
router.get('/orientacoes/:tipo', ctrl.obterOrientacao);

// Registros de sessão e evolução
router.post('/pacientes/:id/registros', ctrl.criarRegistro);
router.get('/pacientes/:id/registros', ctrl.listarRegistros);
router.get('/pacientes/:id/evolucao', ctrl.obterEvolucao);

// Lembretes
router.post('/pacientes/:id/lembretes', ctrl.criarLembrete);
router.get('/pacientes/:id/lembretes', ctrl.listarLembretes);
router.put('/pacientes/:id/lembretes/:lembreteId', ctrl.atualizarLembrete);
router.delete('/pacientes/:id/lembretes/:lembreteId', ctrl.removerLembrete);

// Chat com fisioterapeuta
router.get('/pacientes/:id/chat', ctrl.listarMensagens);
router.post('/pacientes/:id/chat', ctrl.enviarMensagem);

// Informações gerais e clínicas próximas
router.get('/informacoes', ctrl.listarInformacoes);
router.get('/fisioterapeutas-proximos', ctrl.listarFisioterapeutasProximos);

module.exports = router;
