const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const pacientesRoutes = require('./routes/pacientesRoutes');
const { naoEncontrado, tratarErros } = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.status(200).json({ api: 'Termoterapia — API de Pacientes', status: 'online', documentacao: '/docs' });
});

// Documentação Swagger / OpenAPI
app.get('/docs.json', (_req, res) => res.status(200).json(swaggerSpec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Termoterapia API' }));

app.use('/api', pacientesRoutes);

app.use(naoEncontrado);
app.use(tratarErros);

module.exports = app;
