// Conteúdo estático do app (não depende de paciente).
// Os dados dos pacientes ficam no banco SQLite (ver database.js).

const ORI = {
  frio: {
    tipo: 'frio',
    nome: 'Frio',
    duracaoMinutos: 15,
    passos: [
      'Enrole a bolsa de gelo em uma toalha fina.',
      'Sente ou deite de forma confortável e apoie a bolsa sobre o local.',
      'Retire quando acabar o tempo e olhe a pele.'
    ],
    alerta: 'Nunca coloque o gelo direto na pele. Se a pele ficar muito branca, doer ou formigar, retire na hora.'
  },
  calor: {
    tipo: 'calor',
    nome: 'Calor',
    duracaoMinutos: 20,
    passos: [
      'Encha a bolsa com água morna, não fervendo, e enrole em uma toalha.',
      'Sente ou deite de forma confortável e apoie a bolsa sobre o local.',
      'Retire quando acabar o tempo e olhe a pele.'
    ],
    alerta: 'Não deixe direto na pele e não durma com a bolsa. Não use em local inchado ou com ferida. Se arder, retire na hora.'
  }
};

const PERGUNTAS_TRIAGEM = [
  { id: 1, pergunta: 'Onde você sente o incômodo?', opcoes: ['Joelho', 'Costas', 'Ombro / pescoço', 'Mão / outro'] },
  { id: 2, pergunta: 'Quando o incômodo começou?', opcoes: ['Há poucos dias (pancada, torção ou esforço)', 'Há semanas ou meses', 'Não lembro'] },
  { id: 3, pergunta: 'Como está o local agora?', opcoes: ['Inchado, vermelho ou quente', 'Duro, tenso ou rígido', 'Nenhuma dessas'] },
  { id: 4, pergunta: 'No local, você tem ferida aberta, dormência ou problema de circulação?', opcoes: ['Não', 'Sim', 'Não sei'] }
];

const INFORMACOES = [
  { titulo: 'O que é termoterapia?', conteudo: 'É o uso de calor ou de frio para cuidar do corpo. Pode ajudar a aliviar a dor. O seu fisioterapeuta mostra qual usar.' },
  { titulo: 'Quando o frio costuma ajudar', conteudo: 'Logo depois de uma pancada, torção ou esforço. Quando o local está inchado, vermelho ou quente.' },
  { titulo: 'Quando o calor costuma ajudar', conteudo: 'Quando o local está duro, tenso ou rígido. Em dores que duram semanas ou meses.' },
  { titulo: 'Quando não usar sem falar com o profissional', conteudo: 'Se tiver ferida aberta, dormência ou problema de circulação. Se a dor piorar. Se tiver dúvida.' }
];

const FISIOTERAPEUTAS_PROXIMOS = [
  { id: 1, nome: 'Clínica Movimento', especialidade: 'Fisioterapia ortopédica', distanciaKm: 1.2 },
  { id: 2, nome: 'Espaço Reabilita', especialidade: 'Esportiva e pós-operatório', distanciaKm: 2.8 },
  { id: 3, nome: 'Fisio Coluna', especialidade: 'Coluna e articulações', distanciaKm: 4.1 }
];

// Mensagem de boas-vindas exibida no início de todo chat
const MENSAGEM_BOAS_VINDAS = {
  id: 'boas-vindas',
  remetente: 'fisioterapeuta',
  texto: 'Olá! Como foi a sessão de hoje?',
  criadoEm: null
};

module.exports = { ORI, PERGUNTAS_TRIAGEM, INFORMACOES, FISIOTERAPEUTAS_PROXIMOS, MENSAGEM_BOAS_VINDAS };
