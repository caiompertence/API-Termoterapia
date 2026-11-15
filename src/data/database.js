// Camada de dados: banco SQLite embutido no Node.js (módulo nativo node:sqlite).
// Não precisa instalar nem compilar nada. Requer Node.js 22.13 ou superior.
// Para testes use DB_PATH=":memory:".
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'database', 'termoterapia.sqlite');
if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const raw = new DatabaseSync(dbPath);
raw.exec('PRAGMA foreign_keys = ON;');

raw.exec(`
  CREATE TABLE IF NOT EXISTS pacientes (
    id                 TEXT PRIMARY KEY,
    nome               TEXT NOT NULL,
    email              TEXT NOT NULL UNIQUE COLLATE NOCASE,
    senha_hash         TEXT NOT NULL,
    ultima_orientacao  TEXT,
    criado_em          TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS registros (
    id           TEXT PRIMARY KEY,
    paciente_id  TEXT NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    recurso      TEXT NOT NULL CHECK (recurso IN ('Frio', 'Calor')),
    sintomas     TEXT NOT NULL DEFAULT '[]',
    dor          INTEGER NOT NULL CHECK (dor BETWEEN 0 AND 10),
    alerta       INTEGER NOT NULL DEFAULT 0,
    criado_em    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lembretes (
    id           TEXT PRIMARY KEY,
    paciente_id  TEXT NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    horario      TEXT NOT NULL,
    recurso      TEXT NOT NULL CHECK (recurso IN ('Frio', 'Calor'))
  );

  CREATE TABLE IF NOT EXISTS mensagens (
    id           TEXT PRIMARY KEY,
    paciente_id  TEXT NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    remetente    TEXT NOT NULL CHECK (remetente IN ('paciente', 'fisioterapeuta')),
    texto        TEXT NOT NULL,
    criado_em    TEXT NOT NULL
  );
`);

// Interface usada pelos controladores: prepare() e transaction().
module.exports = {
  prepare: (sql) => raw.prepare(sql),
  transaction: (fn) => () => {
    raw.exec('BEGIN');
    try {
      const resultado = fn();
      raw.exec('COMMIT');
      return resultado;
    } catch (err) {
      raw.exec('ROLLBACK');
      throw err;
    }
  }
};
