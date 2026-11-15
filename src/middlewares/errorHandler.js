// 404 para rotas inexistentes
exports.naoEncontrado = (_req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
};

// Tratamento global de erros: JSON malformado -> 400, qualquer outra falha -> 500
// eslint-disable-next-line no-unused-vars
exports.tratarErros = (err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  console.error(err);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
};
