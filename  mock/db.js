// ============================================================
// SIGMAN v2.0 — mock/db.js
// Dados do DATABASE v1 para desenvolvimento offline.
// Trocar por chamadas reais em api.js quando backend estiver pronto.
// ============================================================

export const MOCK_SALAS = [
  'BACALHAU','CARNE MOÍDA','CÁRNEOS','DEFUMADOS','DESOSSA',
  'EFLUENTE INDUSTRIAL','EFLUENTES FINAIS','EFLUENTES SANITÁRIOS',
  'EMBALAGEM SECUNDÁRIA','EXPEDIÇÃO','LÁCTEOS','LAVANDERIA',
  'LINGUIÇAS','PIZZA','PORCIONAMENTOS','RECEBIMENTO',
  'SALMOURAS','SECUNDÁRIA','TEMPERADOS','UTILIDADES',
];

export const MOCK_MAQUINAS = [
  { id:'LÁCTEOS_FATIADORA_WEBER',     sala:'LÁCTEOS',        nome:'FATIADORA AUTOMÁTICA WEBER WLN905',       tag:'095-FAT001', criticidade:1, periodicidade:'Mensal' },
  { id:'LÁCTEOS_TERMOFORMADORA_ULMA', sala:'LÁCTEOS',        nome:'TERMOFORMADORA ULMA TFS700',              tag:'095-TER005', criticidade:1, periodicidade:'Mensal' },
  { id:'BACALHAU_TERMOFORMADORA_ULMA',sala:'BACALHAU',       nome:'TERMOFORMADORA ULMA TFS300',              tag:'095-TER008', criticidade:1, periodicidade:'Mensal' },
  { id:'CÁRNEOS_FATIADORA_WEBER',     sala:'CÁRNEOS',        nome:'FATIADORA AUTOMÁTICA WEBER WLN405',       tag:'095-FAT002', criticidade:1, periodicidade:'Mensal' },
  { id:'DEFUMADOS_TERMOFORMADORA',    sala:'DEFUMADOS',      nome:'TERMOFORMADORA ULMA TFS300',              tag:'095-TER007', criticidade:1, periodicidade:'Mensal' },
  { id:'LINGUIÇAS_TERMOFORMADORA',    sala:'LINGUIÇAS',      nome:'TERMOFORMADORA ULMA TFS300',              tag:'095-TER004', criticidade:1, periodicidade:'Mensal' },
  { id:'LINGUIÇAS_EMBUTIDEIRA',       sala:'LINGUIÇAS',      nome:'EMBUTIDEIRA HANDTMANN VF612',             tag:'095-EMB002', criticidade:1, periodicidade:'Mensal' },
  { id:'TEMPERADOS_TERMOFORMADORA',   sala:'TEMPERADOS',     nome:'TERMOFORMADORA ULMA TFS300',              tag:'095-TER003', criticidade:1, periodicidade:'Mensal' },
  { id:'TEMPERADOS_DUPLAVAC',         sala:'TEMPERADOS',     nome:'SELADORA DUPLAVAC CV250-SHD',             tag:'095-SEL002', criticidade:2, periodicidade:'Mensal' },
  { id:'TEMPERADOS_TUMBLER',          sala:'TEMPERADOS',     nome:'TUMBLER MAXMAC TB-253',                   tag:'095-TUM002', criticidade:1, periodicidade:'Mensal' },
  { id:'PORCIONAMENTOS_TERMOFORM',    sala:'PORCIONAMENTOS', nome:'TERMOFORMADORA ULMA TFS300',              tag:'TFS300',     criticidade:1, periodicidade:'Mensal' },
  { id:'PORCIONAMENTOS_FATIADORA',    sala:'PORCIONAMENTOS', nome:'FATIADORA DADAUX',                        tag:'ICONE 700',  criticidade:4, periodicidade:'Mensal' },
  { id:'CARNE_MOÍDA_EMBUTIDEIRA',     sala:'CARNE MOÍDA',    nome:'EMBUTIDEIRA HANDTMANN VF620',             tag:'095-EMB001', criticidade:1, periodicidade:'Mensal' },
  { id:'CARNE_MOÍDA_TERMOFORMADORA',  sala:'CARNE MOÍDA',    nome:'TERMOFORMADORA EMBALAGEM ULMA TFS600',    tag:'095-TER001', criticidade:1, periodicidade:'Mensal' },
  { id:'CARNE_MOÍDA_PESAGEM',         sala:'CARNE MOÍDA',    nome:'SISTEMA DE PESAGEM HANDTMANN WS 910',     tag:'095-SIS016', criticidade:1, periodicidade:'Mensal' },
  { id:'DESOSSA_SELADORA',            sala:'DESOSSA',        nome:'SELADORA CRYOVAC VS95',                   tag:'095-SEL001', criticidade:1, periodicidade:'Mensal' },
  { id:'DESOSSA_SECADORA',            sala:'DESOSSA',        nome:'SECADORA CRYOVAC RA06',                   tag:'095-SEC001', criticidade:1, periodicidade:'Mensal' },
  { id:'SALMOURAS_INJETORA',          sala:'SALMOURAS',      nome:'INJETORA HENNEKEN HPI 450',               tag:'095-INJ001', criticidade:2, periodicidade:'Mensal' },
  { id:'SALMOURAS_MISTURADOR',        sala:'SALMOURAS',      nome:'MISTURADOR DE MASSAS EKOMEX ML500',       tag:'095-MIS002', criticidade:3, periodicidade:'Mensal' },
  { id:'SALMOURAS_ELEVADOR',          sala:'SALMOURAS',      nome:'ELEVADOR EKOMEX ZM200',                   tag:'095-ELE005', criticidade:3, periodicidade:'Mensal' },
  { id:'PIZZA_TERMOFORMADORA',        sala:'PIZZA',          nome:'TERMOFORMADORA ULMA TFS200',              tag:'095-TER010', criticidade:1, periodicidade:'Mensal' },
  { id:'BACALHAU_SERRA_FITA',         sala:'BACALHAU',       nome:'SERRA FITA MONTEMIL SFM2850',             tag:'095-SER006', criticidade:2, periodicidade:'Mensal' },
  { id:'CÁRNEOS_TERMOFORMADORA_TFS6', sala:'CÁRNEOS',        nome:'TERMOFORMADORA ULMA TFS600',              tag:'095-TER006', criticidade:1, periodicidade:'Mensal' },
];

export const MOCK_USUARIOS = [
  { login:'admin',      nome:'Administrador',      perfil:'administracao', senha:'admin123'     },
  { login:'amauri',     nome:'Amauri Prymel',      perfil:'administracao', senha:'admin123'     },
  { login:'marcia',     nome:'Marcia Souza',        perfil:'administracao', senha:'admin123'     },
  { login:'leonardo',   nome:'Leonardo Dias',       perfil:'administracao', senha:'admin123'     },
  { login:'larissa',    nome:'Larissa Melo',        perfil:'administracao', senha:'admin123'     },
  { login:'adilson',    nome:'Adilson Pereira',     perfil:'manutencao',   senha:'adilson123'   },
  { login:'carlos',     nome:'Carlos da Cruz',      perfil:'manutencao',   senha:'carlos123'    },
  { login:'danilo',     nome:'Danilo Mariano',      perfil:'manutencao',   senha:'danilo123'    },
  { login:'joao',       nome:'João Pereira',        perfil:'manutencao',   senha:'joao123'      },
  { login:'paulo',      nome:'Paulo do Carmo',      perfil:'manutencao',   senha:'paulo123'     },
  { login:'tiago',      nome:'Tiago Britici',       perfil:'administracao', senha:'tiago123'    },
  { login:'marcio',     nome:'Marcio Machado',      perfil:'manutencao',   senha:'marcio123'    },
  { login:'producao',   nome:'Produção',            perfil:'producao',     senha:'producao123'  },
  { login:'ricardo',    nome:'Ricardo Dias',        perfil:'diretoria',    senha:'ricardodias'  },
  { login:'angelica',   nome:'Angélica Prymel',     perfil:'diretoria',    senha:'angelicaprymel' },
  { login:'qualidade',  nome:'Equipe de Qualidade', perfil:'producao',     senha:'qualidade'    },
  { login:'welington',  nome:'Welington Oliveira',  perfil:'administracao', senha:'welington123' },
];

export const MOCK_CONFIGURACOES = {
  horas_turno_1: 7.1,
  horas_turno_2: 7.1,
  horas_turno_3: 0,
  meta_disponibilidade: 91,
  meta_performance: 90,
  meta_qualidade: 99,
};

// Primeiras 20 OS do DATABASE para visualização inicial
export const MOCK_ORDENS = [
  { numero:'OS-0001', data:'2026-05-27', sala:'TEMPERADOS',     maq:'SELADORA DUPLAVAC CV250-SHD', tipo:'Corretiva',  prioridade:'1', manut:'Paulo do Carmo',  ini:'10:05', fim:'10:25', durMin:20,  paradaMin:20,  prob:'Solda',                           acao:'Limpeza da resistência e borracha',                origem:'direta' },
  { numero:'OS-0002', data:'2026-05-27', sala:'BACALHAU',       maq:'TERMOFORMADORA ULMA TFS300',  tipo:'Corretiva',  prioridade:'2', manut:'Danilo Mariano',  ini:'13:40', fim:'14:09', durMin:29,  paradaMin:29,  prob:'Impressão em pontos saindo falhada', acao:'Limpeza nos pontos de impressão',                   origem:'direta' },
  { numero:'OS-0003', data:'2026-05-27', sala:'TEMPERADOS',     maq:'SELADORA DUPLAVAC CV250-SHD', tipo:'Corretiva',  prioridade:'1', manut:'Paulo do Carmo',  ini:'13:27', fim:'14:58', durMin:91,  paradaMin:91,  prob:'Solda',                           acao:'Trocado teflon das 2 resistências',                 origem:'direta' },
  { numero:'OS-0005', data:'2026-05-27', sala:'LINGUIÇAS',      maq:'TERMOFORMADORA ULMA TFS300',  tipo:'Corretiva',  prioridade:'3', manut:'Adilson Pereira', ini:'14:40', fim:'15:00', durMin:20,  paradaMin:20,  prob:'Cabo do sensor arrebentado',      acao:'Refeita a conexão e liberado',                      origem:'direta' },
  { numero:'OS-0012', data:'2026-05-28', sala:'CÁRNEOS',        maq:'TERMOFORMADORA ULMA TFS600',  tipo:'Corretiva',  prioridade:'1', manut:'Paulo do Carmo',  ini:'06:40', fim:'09:19', durMin:159, paradaMin:159, prob:'Não liga',                        acao:'Curto circuito na alimentação 24V, refeito cabeamento', origem:'direta' },
  { numero:'OS-0023', data:'2026-05-29', sala:'DESOSSA',        maq:'SECADORA CRYOVAC RA06',       tipo:'Corretiva',  prioridade:'1', manut:'Danilo Mariano',  ini:'07:20', fim:'10:50', durMin:210, paradaMin:210, prob:'Circuito de segurança não rearmando', acao:'Retirado motor e realizado troca',               origem:'direta' },
  { numero:'OS-0027', data:'2026-05-30', sala:'TEMPERADOS',     maq:'TERMOFORMADORA ULMA TFS300',  tipo:'Preventiva', prioridade:'2', manut:'Danilo Mariano',  ini:'07:30', fim:'12:15', durMin:285, paradaMin:285, prob:'Manutenção preventiva geral',      acao:'Troca de teflon, limpeza de placas, lubrificação',  origem:'direta' },
  { numero:'OS-0057', data:'2026-06-03', sala:'CARNE MOÍDA',    maq:'TERMOFORMADORA EMBALAGEM ULMA TFS600', tipo:'Corretiva', prioridade:'1', manut:'Paulo do Carmo', ini:'10:20', fim:'11:00', durMin:40, paradaMin:40, prob:'Módulo segurança', acao:'Trocado módulo de segurança e botão emergência', origem:'direta' },
  { numero:'OS-0082', data:'2026-06-10', sala:'BACALHAU',       maq:'TERMOFORMADORA ULMA TFS300',  tipo:'Corretiva',  prioridade:'1', manut:'Danilo Mariano',  ini:'08:16', fim:'09:10', durMin:54,  paradaMin:54,  prob:'Corrente arrebentou',             acao:'Emenda feita e ajuste no sensor',                   origem:'direta' },
  { numero:'OS-0101', data:'2026-06-11', sala:'SALMOURAS',      maq:'ELEVADOR EKOMEX ZM200',       tipo:'Corretiva',  prioridade:'1', manut:'Danilo Mariano',  ini:'09:20', fim:'12:20', durMin:180, paradaMin:180, prob:'Elevador não funcionava',          acao:'Motor com bobina interna rompida — enviado para manutenção externa', origem:'direta' },
  { numero:'OS-0112', data:'2026-06-12', sala:'BACALHAU',       maq:'TERMOFORMADORA ULMA TFS300',  tipo:'Corretiva',  prioridade:'1', manut:'Paulo do Carmo',  ini:'06:45', fim:'07:40', durMin:55,  paradaMin:55,  prob:'Motor queimado',                  acao:'Trocado por motor reserva',                         origem:'direta' },
  { numero:'OS-0124', data:'2026-06-15', sala:'DEFUMADOS',      maq:'TERMOFORMADORA ULMA TFS300',  tipo:'Corretiva',  prioridade:'1', manut:'Danilo Mariano',  ini:'07:39', fim:'08:35', durMin:56,  paradaMin:56,  prob:'Não alcançava ordem de vácuo',    acao:'Troca de válvula defeituosa',                       origem:'direta' },
  { numero:'OS-0140', data:'2026-06-16', sala:'CARNE MOÍDA',    maq:'EMBUTIDEIRA HANDTMANN VF620', tipo:'Corretiva',  prioridade:'2', manut:'Tiago Britici',   ini:'08:50', fim:'09:20', durMin:30,  paradaMin:30,  prob:'Elevador de Bobinas não ligava',  acao:'Acúmulo de água no quadro, troca da seccionadora',  origem:'direta' },
  { numero:'OS-0141', data:'2026-06-16', sala:'BACALHAU',       maq:'TERMOFORMADORA ULMA TFS300',  tipo:'Preventiva', prioridade:'1', manut:'Adilson Pereira', ini:'08:20', fim:'12:00', durMin:220, paradaMin:220, prob:'Porcas de regulagem travadas',    acao:'Retirado bloco, retificadas buchas, trocados rolamentos', origem:'direta' },
  { numero:'OS-0142', data:'2026-06-16', sala:'CARNE MOÍDA',    maq:'EMBUTIDEIRA HANDTMANN VF620', tipo:'Corretiva',  prioridade:'1', manut:'Paulo do Carmo',  ini:'11:00', fim:'14:30', durMin:210, paradaMin:210, prob:'Vácuo',                           acao:'Trocado bomba, palhetas, óleo e válvula',           origem:'direta' },
  { numero:'OS-0145', data:'2026-06-15', sala:'DESOSSA',        maq:'TERMOFORMADORA ULMA TFS300',  tipo:'Melhoria',   prioridade:'2', manut:'Adilson Pereira', ini:'14:52', fim:'15:53', durMin:61,  paradaMin:61,  prob:'Ajuste chapa lateral',            acao:'Ajustado chapa e encostada na esteira',             origem:'plan', origemNum:'PL-0001' },
];

export const MOCK_PLANEJADAS = [
  { numero:'PL-0001', sala:'DESOSSA',  maq:'ESTEIRA EC - PARA OSSOS SULMAQ EASY CLEAN', tipo:'Melhoria',   prioridade:'2', prazo:'2026-06-13', horasTurno:3, desc:'Ajustar chapa lateral de transferência para evitar queda de ossos na esteira (risco de segurança).', status:'Concluída' },
  { numero:'PL-0002', sala:'CÁRNEOS',  maq:'BALANÇA DE BANCADA TOLEDO 10-2090',          tipo:'Inspeção',   prioridade:'2', prazo:'2026-06-20', horasTurno:1, desc:'Realizar aferição das balanças da fatiadora Weber', status:'Atrasada' },
];

export const MOCK_SOLICITACOES = [
  { numero:'SOL-0001', sala:'LÁCTEOS',     maq:'FATIADORA AUTOMÁTICA WEBER WLN905', tipo:'Corretiva', prioridade:'1', desc:'Botão de emergência da fatiadora não está funcionando', status:'Concluída',       solicitante:'Leonardo Dias',  manut:'Tiago Britici' },
  { numero:'SOL-0002', sala:'CARNE MOÍDA', maq:'__outros__',                        tipo:'Corretiva', prioridade:'3', desc:'Vazamentos de água do registro na sala.',               status:'Não Executada',   solicitante:'Leonardo Dias',  manut:'' },
  { numero:'SOL-0003', sala:'LÁCTEOS',     maq:'__outros__',                        tipo:'Corretiva', prioridade:'3', desc:'Vazamentos de água no registro.',                      status:'Concluída',       solicitante:'Leonardo Dias',  manut:'Cícero' },
];

export const MOCK_RACS = [];

// Estado inicial completo
export function getMockDB() {
  return {
    salas:         [...MOCK_SALAS],
    maquinas:      [...MOCK_MAQUINAS],
    usuarios:      [...MOCK_USUARIOS],
    ordens:        MOCK_ORDENS.map(o => ({ id: crypto.randomUUID(), criadoEm: o.data + 'T00:00:00Z', ...o })),
    planejadas:    MOCK_PLANEJADAS.map(p => ({ id: crypto.randomUUID(), criadoEm: '2026-06-10T00:00:00Z', ...p })),
    solicitacoes:  MOCK_SOLICITACOES.map(s => ({ id: crypto.randomUUID(), criadoEm: '2026-06-10T00:00:00Z', ...s })),
    inspecoes:     [],
    racs:          [],
    historico:     [],
    configuracoes: { ...MOCK_CONFIGURACOES },
    // Contadores de numeração — iniciam após o último existente
    osC:   146,
    plC:   3,
    solC:  4,
    racC:  1,
  };
}
