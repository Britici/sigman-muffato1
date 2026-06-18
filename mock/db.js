// ============================================================
// SIGMAN v2.0 — mock/db.js
// Dados reais espelhados do Google Sheets (DATABASE v1)
// Última sincronização: 2026-06-18
// Próxima OS:  OS-0178  (osC: 178)
// Próxima PL:  PL-0003  (plC: 3)
// Próxima SOL: SOL-0004  (solC: 4)
// Próxima RAC: RAC-0001  (racC: 1)
// ============================================================

export function getMockDB() {
  return {
    // ── Contadores ───────────────────────────────────────────
    osC:  178,
    plC:  3,
    solC: 4,
    racC: 1,

    // ── Configurações ────────────────────────────────────────
    configuracoes: {
      horas_turno_1:       7.1,
      horas_turno_2:       7.1,
      horas_turno_3:       0,
      meta_disponibilidade:91,
      meta_performance:    90,
      meta_qualidade:      99,
      empresa:             'Muffato Foods',
      unidade:             'Pato Branco - PR',
    },

    // ── Usuários ─────────────────────────────────────────────
    usuarios: [
      { login:'admin',                nome:'Administrador',          perfil:'administracao', senha:'admin123',         ativo:true },
      { login:'amauri',               nome:'Amauri Prymel',          perfil:'administracao', senha:'admin123',         ativo:true },
      { login:'marcia',               nome:'Marcia Souza',           perfil:'administracao', senha:'admin123',         ativo:true },
      { login:'leonardo',             nome:'Leonardo Dias',          perfil:'administracao', senha:'admin123',         ativo:true },
      { login:'larissa',              nome:'Larissa Melo',           perfil:'administracao', senha:'admin123',         ativo:true },
      { login:'welington',            nome:'Welington Oliveira',     perfil:'administracao', senha:'welington',        ativo:true },
      { login:'adilson',              nome:'Adilson Pereira',        perfil:'manutencao',    senha:'adilson123',       ativo:true },
      { login:'carlos',               nome:'Carlos da Cruz',         perfil:'manutencao',    senha:'carlos123',        ativo:true },
      { login:'danilo',               nome:'Danilo Mariano',         perfil:'manutencao',    senha:'danilo123',        ativo:true },
      { login:'joao',                 nome:'João Pereira',           perfil:'manutencao',    senha:'joao123',          ativo:true },
      { login:'paulo',                nome:'Paulo do Carmo',         perfil:'manutencao',    senha:'paulo123',         ativo:true },
      { login:'tiago',                nome:'Tiago Britici',          perfil:'manutencao',    senha:'tiago123',         ativo:true },
      { login:'marcio',               nome:'Marcio Machado',         perfil:'manutencao',    senha:'marcio123',        ativo:true },
      { login:'ricardo',              nome:'Ricardo Dias',           perfil:'diretoria',     senha:'ricardodias',      ativo:true },
      { login:'angelica',             nome:'Angélica Prymel',        perfil:'diretoria',     senha:'angelicaprymel',   ativo:true },
      { login:'nadine',               nome:'Nadine da Silva',        perfil:'producao',      senha:'nadine',           ativo:true },
      { login:'producao-pas',         nome:'Produção P.A.S.',        perfil:'producao',      senha:'producao123',      ativo:true },
      { login:'producao-porcionados', nome:'Produção Porcionados',   perfil:'producao',      senha:'producao123',      ativo:true },
      { login:'producao-desossa',     nome:'Produção Desossa',       perfil:'producao',      senha:'producao123',      ativo:true },
      { login:'qualidade',            nome:'Equipe de Qualidade',    perfil:'producao',      senha:'qualidade',        ativo:true },
      { login:'expedicao',            nome:'Expedição',              perfil:'producao',      senha:'expedicao123',     ativo:true },
      { login:'recebimento',          nome:'Recebimento',            perfil:'producao',      senha:'recebimento123',   ativo:true },
      { login:'secundaria',           nome:'Secundária',             perfil:'producao',      senha:'secundaria123',    ativo:true },
    ],

    // ── Salas ────────────────────────────────────────────────
    salas: [
      { id:'CÁRNEOS',              nome:'CÁRNEOS',              ativo:true },
      { id:'DEFUMADOS',            nome:'DEFUMADOS',            ativo:true },
      { id:'LÁCTEOS',              nome:'LÁCTEOS',              ativo:true },
      { id:'BACALHAU',             nome:'BACALHAU',             ativo:true },
      { id:'LINGUIÇAS',            nome:'LINGUIÇAS',            ativo:true },
      { id:'TEMPERADOS',           nome:'TEMPERADOS',           ativo:true },
      { id:'PORCIONAMENTOS',       nome:'PORCIONAMENTOS',       ativo:true },
      { id:'CARNE_MOÍDA',          nome:'CARNE MOÍDA',          ativo:true },
      { id:'DESOSSA',              nome:'DESOSSA',              ativo:true },
      { id:'SALMOURAS',            nome:'SALMOURAS',            ativo:true },
      { id:'PIZZA',                nome:'PIZZA',                ativo:true },
      { id:'SECUNDÁRIA',           nome:'SECUNDÁRIA',           ativo:true },
      { id:'EMBALAGEM_SECUNDÁRIA', nome:'EMBALAGEM SECUNDÁRIA', ativo:true },
      { id:'UTILIDADES',           nome:'UTILIDADES',           ativo:true },
      { id:'DATA_CENTER',          nome:'DATA CENTER',          ativo:true },
      { id:'LAVANDERIA',           nome:'LAVANDERIA',           ativo:true },
      { id:'EFLUENTE_INDUSTRIAL',  nome:'EFLUENTE INDUSTRIAL',  ativo:true },
      { id:'EXPEDIÇÃO',            nome:'EXPEDIÇÃO',            ativo:true },
      { id:'RECEBIMENTO',          nome:'RECEBIMENTO',          ativo:true },
    ],

    // ── Máquinas ─────────────────────────────────────────────
    maquinas: [
      // LÁCTEOS
      { id:'LÁCTEOS_FAT001',   sala:'LÁCTEOS',         nome:'FATIADORA AUTOMÁTICA WEBER WLN905',                                   tag:'095-FAT001', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'LÁCTEOS_TER005',   sala:'LÁCTEOS',         nome:'TERMOFORMADORA ULMA TFS700',                                          tag:'095-TER005', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'LÁCTEOS_EST022',   sala:'LÁCTEOS',         nome:'ESTEIRA TRANSPORTADORA SULMAQ CM_99999',                              tag:'095-EST022', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'LÁCTEOS_EST021',   sala:'LÁCTEOS',         nome:'ESTEIRA TRANSPORTADORA SULMAQ CM_99999 (PLATAFORMA)',                 tag:'095-EST021', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'LÁCTEOS_BAL014',   sala:'LÁCTEOS',         nome:'CONJUNTO DE BALANÇAS WEBER CCW-500',                                  tag:'095-BAL014', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'LÁCTEOS_EST020',   sala:'LÁCTEOS',         nome:'CONJUNTO DE ESTEIRAS BASCULANTE WEBER CCR500/CCA750',                 tag:'095-EST020', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'LÁCTEOS_BAL013',   sala:'LÁCTEOS',         nome:'BALANÇA DE BANCADA TOLEDO 10-2090 (1)',                               tag:'095-BAL013', criticidade:4, periodicidade:'Mensal', ativo:true },
      { id:'LÁCTEOS_BAL012',   sala:'LÁCTEOS',         nome:'BALANÇA DE BANCADA TOLEDO 10-2090 (2)',                               tag:'095-BAL012', criticidade:4, periodicidade:'Mensal', ativo:true },
      { id:'LÁCTEOS_ELE007',   sala:'LÁCTEOS',         nome:'ELEVADOR DE CARGAS ULMA EMS300',                                      tag:'095-ELE007', criticidade:4, periodicidade:'Mensal', ativo:true },
      // CÁRNEOS
      { id:'CÁRNEOS_TER008',   sala:'CÁRNEOS',         nome:'TERMOFORMADORA ULMA TFS300',                                          tag:'095-TER008', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'CÁRNEOS_FAT002',   sala:'CÁRNEOS',         nome:'FATIADORA AUTOMÁTICA WEBER WLN405',                                   tag:'095-FAT002', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'CÁRNEOS_CUB003',   sala:'CÁRNEOS',         nome:'CUBADORA UNIVERSAL MHS 2000-105',                                     tag:'095-CUB003', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'CÁRNEOS_BAL015',   sala:'CÁRNEOS',         nome:'BALANÇA DE BANCADA TOLEDO 10-2090',                                   tag:'095-BAL015', criticidade:4, periodicidade:'Mensal', ativo:true },
      // DEFUMADOS
      { id:'DEFUMADOS_SER006', sala:'DEFUMADOS',       nome:'SERRA FITA MONTEMIL SFM2850',                                         tag:'095-SER006', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'DEFUMADOS_TER007', sala:'DEFUMADOS',       nome:'TERMOFORMADORA ULMA TFS300',                                          tag:'095-TER007', criticidade:1, periodicidade:'Mensal', ativo:true },
      // BACALHAU
      { id:'BACALHAU_TER008',  sala:'BACALHAU',        nome:'TERMOFORMADORA ULMA TFS300',                                          tag:'095-TER008', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'BACALHAU_SFM3300', sala:'BACALHAU',        nome:'SERRA FITA',                                                          tag:'SFM3300',    criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'BACALHAU_EST025',  sala:'BACALHAU',        nome:'ESTEIRA TRANSPORTADORA SULMAQ CM_99999',                              tag:'095-EST025', criticidade:2, periodicidade:'Mensal', ativo:true },
      // LINGUIÇAS
      { id:'LINGUIÇAS_EMB002', sala:'LINGUIÇAS',       nome:'EMBUTIDEIRA HANDTMANN VF612',                                         tag:'095-EMB002', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'LINGUIÇAS_TER004', sala:'LINGUIÇAS',       nome:'TERMOFORMADORA ULMA TFS300',                                          tag:'095-TER004', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'LINGUIÇAS_ELE',    sala:'LINGUIÇAS',       nome:'ELEVADOR DE CARROS 200/300 LITROS',                                   tag:'CM1117100',  criticidade:3, periodicidade:'Mensal', ativo:true },
      // TEMPERADOS
      { id:'TEMPERADOS_SEL002',sala:'TEMPERADOS',      nome:'SELADORA DUPLAVAC CV250-SHD',                                         tag:'095-SEL002', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'TEMPERADOS_ELE004',sala:'TEMPERADOS',      nome:'ELEVADOR DE CARROS SULMAK CM-11171',                                  tag:'095-ELE004', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'TEMPERADOS_TUM002',sala:'TEMPERADOS',      nome:'TUMBLER MAXMAC TB-253',                                               tag:'095-TUM002', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'TEMPERADOS_TER003',sala:'TEMPERADOS',      nome:'TERMOFORMADORA ULMA TFS300',                                          tag:'095-TER003', criticidade:1, periodicidade:'Mensal', ativo:true },
      // PORCIONAMENTOS
      { id:'PORCION_ICONE700', sala:'PORCIONAMENTOS',  nome:'FATIADORA DADAUX',                                                    tag:'ICONE 700',  criticidade:4, periodicidade:'Mensal', ativo:true },
      { id:'PORCION_TFS300',   sala:'PORCIONAMENTOS',  nome:'TERMOFORMADORA ULMA TFS300',                                          tag:'TFS300',     criticidade:1, periodicidade:'Mensal', ativo:true },
      // CARNE MOÍDA
      { id:'CARNE_EMB001',     sala:'CARNE MOÍDA',     nome:'EMBUTIDEIRA HANDTMANN VF620',                                         tag:'095-EMB001', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'CARNE_FOR001',     sala:'CARNE MOÍDA',     nome:'FORMADORA HANDTMANN RF440',                                           tag:'095-FOR001', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'CARNE_POR001',     sala:'CARNE MOÍDA',     nome:'PORCIONADORA HANDTMANN GMD 99-2',                                     tag:'095-POR001', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'CARNE_SIS016',     sala:'CARNE MOÍDA',     nome:'SISTEMA DE PESAGEM HANDTMANN WS 910',                                 tag:'095-SIS016', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'CARNE_EST014',     sala:'CARNE MOÍDA',     nome:'ESTEIRA TRANSPORTADORA JA SP600',                                     tag:'095-EST014', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'CARNE_EST015',     sala:'CARNE MOÍDA',     nome:'ESTEIRA TRANSPORTADORA JA SP300',                                     tag:'095-EST015', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'CARNE_TER001',     sala:'CARNE MOÍDA',     nome:'TERMOFORMADORA EMBALAGEM ULMA TFS600',                                tag:'095-TER001', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'CARNE_TER006',     sala:'CARNE MOÍDA',     nome:'TERMOFORMADORA ULMA TFS600',                                          tag:'095-TER006', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'CARNE_MOE002',     sala:'CARNE MOÍDA',     nome:'MOEDOR EKOMEX WW 200',                                                tag:'095-MOE002', criticidade:2, periodicidade:'Mensal', ativo:true },
      // DESOSSA
      { id:'DESOSSA_SEL001',   sala:'DESOSSA',         nome:'SELADORA CRYOVAC VS95',                                               tag:'095-SEL001', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'DESOSSA_CUB004',   sala:'DESOSSA',         nome:'CUBADORA UNIVERSAL MHS 2000-105',                                     tag:'095-CUB004', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'DESOSSA_SEC001',   sala:'DESOSSA',         nome:'SECADORA CRYOVAC RA06',                                               tag:'095-SEC001', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'DESOSSA_TUN001',   sala:'DESOSSA',         nome:'TÚNEL DE TERMOENCOLHIMENTO CRYOVAC STE98',                            tag:'095-TUN001', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'DESOSSA_ASE530',   sala:'DESOSSA',         nome:'ESFOLIADORA WEBER',                                                   tag:'ASE530',     criticidade:4, periodicidade:'Mensal', ativo:true },
      { id:'DESOSSA_NOR001',   sala:'DESOSSA',         nome:'NÓRIA DE TRANSPORTE DE CARCAÇA SULMAQ HE-2',                         tag:'095-NOR001', criticidade:4, periodicidade:'Mensal', ativo:true },
      { id:'DESOSSA_NOR002',   sala:'DESOSSA',         nome:'NÓRIA DE CARRETILHA SULMAQ 1000/2',                                   tag:'095-NOR002', criticidade:4, periodicidade:'Mensal', ativo:true },
      { id:'DESOSSA_EST013',   sala:'DESOSSA',         nome:'CONJUNTO DE ESTEIRAS DA SALA PRINCIPAL DA DESOSSA SULMAQ EASY CLEAN', tag:'095-EST013', criticidade:3, periodicidade:'Mensal', ativo:true },
      // SALMOURAS
      { id:'SALM_MOE001',      sala:'SALMOURAS',       nome:'MOEDOR MAXMAC SG 200',                                                tag:'095-MOE001', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'SALM_INJ001',      sala:'SALMOURAS',       nome:'INJETORA HENNEKEN HPI 450',                                           tag:'095-INJ001', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'SALM_MIS001',      sala:'SALMOURAS',       nome:'MISTURADOR DE SALMOURA HENNEKEN HVM-1000',                            tag:'095-MIS001', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'SALM_TUM001',      sala:'SALMOURAS',       nome:'TUMBLER HENNEKEN B2',                                                 tag:'095-TUM001', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'SALM_MIS002',      sala:'SALMOURAS',       nome:'MISTURADOR DE MASSAS EKOMEX ML500',                                   tag:'095-MIS002', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'SALM_ELE006',      sala:'SALMOURAS',       nome:'ELEVADOR MAXMAC EC-019',                                              tag:'095-ELE006', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'SALM_ELE005',      sala:'SALMOURAS',       nome:'ELEVADOR EKOMEX ZM200',                                               tag:'095-ELE005', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'SALM_BAL007',      sala:'SALMOURAS',       nome:'BALANÇA DE PISO TOLEDO 2180',                                         tag:'095-BAL007', criticidade:3, periodicidade:'Mensal', ativo:true },
      // PIZZA
      { id:'PIZZA_TER010',     sala:'PIZZA',           nome:'TERMOFORMADORA ULMA TFS200',                                          tag:'095-TER010', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'PIZZA_EST028',     sala:'PIZZA',           nome:'ESTEIRA TRANSPORTADORA SULMAQ CM_99999',                              tag:'095-EST028', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'PIZZA_EST029',     sala:'PIZZA',           nome:'ESTEIRA TRANSPORTADORA SULMAQ CM_12548_03',                           tag:'095-EST029', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'PIZZA_FAT003',     sala:'PIZZA',           nome:'FATIADORA MANUAL TOLEDO 9300 G COM',                                  tag:'095-FAT003', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'PIZZA_RAL001',     sala:'PIZZA',           nome:'RALADOR INDUSTRIAL EQUIMATEC RAL-04-CL',                              tag:'095-RAL001', criticidade:2, periodicidade:'Mensal', ativo:true },
      // SECUNDÁRIA
      { id:'SEC_EST032',       sala:'SECUNDÁRIA',      nome:'CONJUNTO DE ESTEIRAS DE SAIDA DEFUMADOS - POSTO 04',                  tag:'095-EST032', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'SEC_EST030',       sala:'SECUNDÁRIA',      nome:'CONJUNTO DE ESTEIRAS DE SAIDA BACALHAU - POSTO 05',                   tag:'095-EST030', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'SEC_DET001',       sala:'SECUNDÁRIA',      nome:'DETECTOR DE METAIS - BIZERBA 600/300-IC (01)',                        tag:'095-DET001', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'SEC_DET002',       sala:'SECUNDÁRIA',      nome:'DETECTOR DE METAIS - BIZERBA 600/300-IC (02)',                        tag:'095-DET002', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'SEC_DET003',       sala:'SECUNDÁRIA',      nome:'DETECTOR DE METAIS - BIZERBA 600/300-IC (03)',                        tag:'095-DET003', criticidade:1, periodicidade:'Mensal', ativo:true },
      // UTILIDADES
      { id:'UTIL_GER',         sala:'UTILIDADES',      nome:'GERADORES',                                                            tag:'GER',        criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'UTIL_SUB',         sala:'UTILIDADES',      nome:'SUBESTAÇÕES',                                                          tag:'SUB',        criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'UTIL_CALD',        sala:'UTILIDADES',      nome:'CALDEIRA',                                                             tag:'CALD',       criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'UTIL_ETE',         sala:'UTILIDADES',      nome:'ESTAÇÃO DE TRATAMENTO DE EFLUENTES',                                   tag:'ETE',        criticidade:2, periodicidade:'Mensal', ativo:true },
      // LAVANDERIA
      { id:'LAV_SEC002',       sala:'LAVANDERIA',      nome:'SECADORA DE ROUPAS MAMUTE SE60',                                       tag:'095-SEC002', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'LAV_LAV008',       sala:'LAVANDERIA',      nome:'LAVADORA DE ROUPAS MAMUTE LEH60',                                      tag:'095-LAV008', criticidade:1, periodicidade:'Mensal', ativo:true },
    ],

    // ── OS Executadas ────────────────────────────────────────
    ordens: [
      { numero:'OS-0001', data:'2026-05-27', sala:'TEMPERADOS',   maq:'DUPLAVAC',                      tag:'',          tipo:'Corretiva',  prioridade:'1', manut:'Paulo do Carmo',  inicio:'10:05', fim:'10:25', duracao:20,  parada:20,  problema:'Solda',                                                                                  acao:'Limpeza da resistência e borracha',        acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-27T13:27:05.411Z' },
      { numero:'OS-0002', data:'2026-05-27', sala:'BACALHAU',     maq:'TERMOFORMADORA ULMA',           tag:'',          tipo:'Corretiva',  prioridade:'2', manut:'Danilo Mariano',  inicio:'13:40', fim:'14:09', duracao:29,  parada:29,  problema:'Impressão em pontos saindo falhada.',                                                      acao:'A borracha de impressão estava com muita sujeira, acúmulo da própria impressão. Realizado limpeza nos pontos que estava ocasionando em falha, aumentado parâmetro de intensidade e realizado teste. Teve uma melhora significativa, liberado máquina para produção e instruído operador.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-27T17:12:19.125Z' },
      { numero:'OS-0003', data:'2026-05-27', sala:'TEMPERADOS',   maq:'DUPLAVAC',                      tag:'',          tipo:'Corretiva',  prioridade:'1', manut:'Paulo do Carmo',  inicio:'13:27', fim:'14:58', duracao:91,  parada:91,  problema:'Solda',                                                                                  acao:'Trocado teflon das 2 resistência, refeito conectores das resistência (Fêmea), ajustado tempo de retardo de solda e rele de solda travado.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-27T18:03:21.803Z' },
      { numero:'OS-0004', data:'2026-05-27', sala:'__outros__',   maq:'__outros__',                    tag:'',          tipo:'Corretiva',  prioridade:'3', manut:'Danilo Mariano',  inicio:'14:15', fim:'15:19', duracao:64,  parada:64,  problema:'Apontamento do porcionados // Tampa da cabine de operação com pistão estourado.',       acao:'Retirado tampa e feito adaptação para instalar pistão novo. Foi necessário adaptação por conta do pistão ser diferente.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-27T18:22:22.749Z' },
      { numero:'OS-0005', data:'2026-05-27', sala:'LINGUIÇAS',    maq:'TERMOFORMADORA ULMA',           tag:'',          tipo:'Corretiva',  prioridade:'3', manut:'Adilson Pereira', inicio:'14:40', fim:'15:00', duracao:20,  parada:20,  problema:'Cabo do sensor arrebentado pelo operador',                                            acao:'Refeita a conexão e liberado para trabalhar', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-27T18:27:46.065Z' },
      { numero:'OS-0006', data:'2026-05-28', sala:'BACALHAU',     maq:'TERMOFORMADORA ULMA',           tag:'',          tipo:'Corretiva',  prioridade:'1', manut:'Danilo Mariano',  inicio:'07:00', fim:'07:14', duracao:14,  parada:14,  problema:'Impressora fazendo impressões incorreta',                                             acao:'Realizado limpeza com limpa contato nos conectores, testado e liberado máquina para trabalho.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-28T10:16:24.778Z' },
      { numero:'OS-0007', data:'2026-05-28', sala:'BACALHAU',     maq:'TERMOFORMADORA ULMA',           tag:'TFS3300',   tipo:'Corretiva',  prioridade:'3', manut:'Adilson Pereira', inicio:'07:30', fim:'07:57', duracao:27,  parada:27,  problema:'Erro no eixo X',                                                                     acao:'Posicionada a impressora na posição correta', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-28T10:58:28.499Z' },
      { numero:'OS-0008', data:'2026-05-28', sala:'LINGUIÇAS',    maq:'TERMOFORMADORA ULMA',           tag:'',          tipo:'Corretiva',  prioridade:'1', manut:'Danilo Mariano',  inicio:'07:17', fim:'07:37', duracao:20,  parada:20,  problema:'Sensor da tampa de proteção',                                                        acao:'Realizado bypass no sensor.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-28T11:36:45.350Z' },
      { numero:'OS-0009', data:'2026-05-28', sala:'LINGUIÇAS',    maq:'TERMOFORMADORA ULMA',           tag:'',          tipo:'Corretiva',  prioridade:'1', manut:'Danilo Mariano',  inicio:'07:37', fim:'08:27', duracao:50,  parada:50,  problema:'Alcance da ordem de vácuo',                                                          acao:'Realizado ajuste paliativo na borracha que foi adaptada na placa e instruído para operador efetuar teste com produto.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-28T11:38:54.867Z' },
      { numero:'OS-0010', data:'2026-05-28', sala:'TEMPERADOS',   maq:'TERMOFORMADORA ULMA',           tag:'',          tipo:'Corretiva',  prioridade:'1', manut:'Danilo Mariano',  inicio:'08:37', fim:'08:47', duracao:10,  parada:10,  problema:'Sensor da tampa',                                                                    acao:'Feito bypass do sensor.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-28T11:52:46.581Z' },
      { numero:'OS-0011', data:'2026-05-28', sala:'TEMPERADOS',   maq:'DUPLAVAC',                      tag:'',          tipo:'Corretiva',  prioridade:'1', manut:'Danilo Mariano',  inicio:'08:47', fim:'08:53', duracao:6,   parada:6,   problema:'Selagem',                                                                            acao:'Cabo da resistência estava solto. Conectado de volta e liberado Máquina.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-28T11:54:28.116Z' },
      { numero:'OS-0012', data:'2026-05-28', sala:'CÁRNEOS',      maq:'TERMOFORMADORA ULMA',           tag:'',          tipo:'Corretiva',  prioridade:'1', manut:'Paulo do Carmo',  inicio:'06:40', fim:'09:19', duracao:159, parada:159, problema:'Não liga.',                                                                          acao:'Curto circuito na alimentação 24V, refeito cabeamento sensores.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-28T12:22:14.858Z' },
      { numero:'OS-0013', data:'2026-05-28', sala:'PORCIONAMENTOS',maq:'TERMOFORMADORA ULMA',          tag:'TFS300',    tipo:'Corretiva',  prioridade:'2', manut:'Adilson Pereira', inicio:'08:20', fim:'09:33', duracao:73,  parada:73,  problema:'Erro de foto célula',                                                                acao:'Desamada chapa na entrada da camara de solda, retirado sobrante que estava na engrenagem de arrate da corrente e verificado o ponto da máquina. Feito limpeza na foto célula, calibrado e liberado pra rodar', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-28T12:36:46.245Z' },
      { numero:'OS-0014', data:'2026-05-28', sala:'CARNE MOÍDA',  maq:'TERMOFORMADORA ULMA TFS600',    tag:'TFS600',    tipo:'Corretiva',  prioridade:'3', manut:'Adilson Pereira', inicio:'15:21', fim:'16:38', duracao:77,  parada:77,  problema:'2° faca não corta',                                                                  acao:'Apertado contra faca do lado do operador', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-28T13:54:34.913Z' },
      { numero:'OS-0015', data:'2026-05-28', sala:'__outros__',   maq:'__outros__',                    tag:'',          tipo:'Corretiva',  prioridade:'2', manut:'Danilo Mariano',  inicio:'10:55', fim:'11:00', duracao:5,   parada:5,   problema:'Secundária // esteira do posto 8 parada.',                                           acao:'Feito apenas o reset na IHM localizada no setor.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-28T14:01:09.690Z' },
      { numero:'OS-0016', data:'2026-05-28', sala:'TEMPERADOS',   maq:'__outros__',                    tag:'',          tipo:'Corretiva',  prioridade:'4', manut:'Danilo Mariano',  inicio:'14:35', fim:'14:45', duracao:10,  parada:10,  problema:'Mesa de saída de produtos da duplavac para secundária irregular.',                   acao:'Ajustado altura da mesa conforme solicitado pelos operadores.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-28T17:50:35.143Z' },
      { numero:'OS-0017', data:'2026-05-28', sala:'CARNE MOÍDA',  maq:'TERMOFORMADORA ULMA TFS600',    tag:'TFS600',    tipo:'Corretiva',  prioridade:'3', manut:'Adilson Pereira', inicio:'11:25', fim:'11:40', duracao:15,  parada:15,  problema:'Faca transversal não corta',                                                         acao:'Ajustado corte da terceira faca, lado do operador', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-28T18:12:51.676Z' },
      { numero:'OS-0018', data:'2026-05-28', sala:'LÁCTEOS',      maq:'TERMOFORMADORA ULMA TFS700',    tag:'',          tipo:'Corretiva',  prioridade:'1', manut:'Danilo Mariano',  inicio:'15:45', fim:'16:31', duracao:46,  parada:46,  problema:'Facas rotativas.',                                                                   acao:'Realizado troca de uma das facas que estava quebrada e afiado outra que não estava cortando.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-28T19:32:52.645Z' },
      { numero:'OS-0019', data:'2026-05-29', sala:'PORCIONAMENTOS',maq:'FATIADORA DADAUX',             tag:'',          tipo:'Corretiva',  prioridade:'2', manut:'Danilo Mariano',  inicio:'07:07', fim:'07:11', duracao:4,   parada:4,   problema:'Relê de segurança não rearmando.',                                                    acao:'Sensor da tampa estava fora de posição. Ajustado posição e liberado máquina para trabalho.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-29T10:14:06.361Z' },
      { numero:'OS-0020', data:'2026-05-29', sala:'PIZZA',        maq:'FATIADORA MANUAL TOLEDO 9300 G COM', tag:'095-FAT003', tipo:'Corretiva', prioridade:'2', manut:'Paulo do Carmo', inicio:'07:03', fim:'07:19', duracao:16, parada:16, problema:'Umidade nas conexões', acao:'Feito a limpeza dos contatos e rearmado dijuntor.', acao_prev:'', foto:'https://drive.google.com/file/d/1hfmxOCdZ3g5u60QCgdHAm52yPRllcLFN/view', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-29T10:20:26.690Z' },
      { numero:'OS-0021', data:'2026-05-29', sala:'LINGUIÇAS',    maq:'EMBUTIDEIRA HANDTMANN VF612',   tag:'',          tipo:'Corretiva',  prioridade:'2', manut:'Danilo Mariano',  inicio:'07:17', fim:'07:26', duracao:9,   parada:9,   problema:'Torcedor não estava encaixando.',                                                     acao:'Tivemos que força-lo para cima para dar encaixe, instruído operador.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-29T10:27:35.481Z' },
      { numero:'OS-0022', data:'2026-05-29', sala:'LÁCTEOS',      maq:'TERMOFORMADORA ULMA TFS700',    tag:'095-TER005',tipo:'Corretiva',  prioridade:'2', manut:'Adilson Pereira', inicio:'08:00', fim:'08:23', duracao:23,  parada:23,  problema:'Faca rotativa não corta',                                                            acao:'Retirado faca rotativa para afiar', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-29T11:27:28.400Z' },
      { numero:'OS-0023', data:'2026-05-29', sala:'DESOSSA',      maq:'SECADORA CRYOVAC RA06',         tag:'095-SEC001',tipo:'Corretiva',  prioridade:'1', manut:'Danilo Mariano',  inicio:'07:20', fim:'10:50', duracao:210, parada:210, problema:'Circuito de segurança não estava rearmando e motor da esteira com óleo.',          acao:'Retirado motor da esteira e realizado troca. Verificamos circuito para identificarmos o que estava ocasionando a falha no relê de segurança. Por conta da alta demanda da produção fizemos um paliativo para liberarmos a máquina enquanto solucionava o problema do relê de segurança.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-29T17:08:42.015Z' },
      { numero:'OS-0024', data:'2026-05-29', sala:'TEMPERADOS',   maq:'TERMOFORMADORA ULMA TFS300',    tag:'095-TER003',tipo:'Corretiva',  prioridade:'2', manut:'Paulo do Carmo',  inicio:'14:30', fim:'14:46', duracao:16,  parada:16,  problema:'Faca transversal',                                                                   acao:'Retirado produto que caiu no pistão', acao_prev:'', foto:'https://drive.google.com/file/d/1ILCxHWRMgebZVc65q_gK3y-3qU5qc1SL/view', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-29T17:49:17.963Z' },
      { numero:'OS-0025', data:'2026-05-29', sala:'TEMPERADOS',   maq:'SELADORA DUPLAVAC CV250-SHD',   tag:'095-SEL002',tipo:'Corretiva',  prioridade:'2', manut:'Danilo Mariano',  inicio:'14:45', fim:'15:00', duracao:15,  parada:15,  problema:'Máquina não alcançando vácuo.',                                                       acao:'Realizado troca nos pontos da borracha de vedação estava danificada.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-29T18:20:02.201Z' },
      { numero:'OS-0026', data:'2026-05-30', sala:'CARNE MOÍDA',  maq:'EMBUTIDEIRA HANDTMANN',         tag:'VF620',     tipo:'Corretiva',  prioridade:'1', manut:'Danilo Mariano',  inicio:'09:19', fim:'09:25', duracao:6,   parada:6,   problema:'Disjuntor Q3 desarmou.',                                                             acao:'Rearmado disjuntor e liberado máquina.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-30T12:26:48.647Z' },
      { numero:'OS-0027', data:'2026-05-30', sala:'TEMPERADOS',   maq:'TERMOFORMADORA ULMA TFS300',    tag:'095-TER003',tipo:'Preventiva', prioridade:'2', manut:'Danilo Mariano',  inicio:'07:30', fim:'12:15', duracao:285, parada:285, problema:'Manutenção preventiva geral.',                                                        acao:'Retirado placas de temperatura de pré formação para limpeza, trocado teflon e ajustado borracha da mesma; Retirado placas de solda para limpeza e desobstruído os vãos de vácuo; Realizado troca das 2 facas transversais; Lubrificado com graxa todos os pontos da máquina; Verificado vazamento do pistão de formação e realizado a troca de 2 conexões da válvula; Por fim realizamos teste de vácuo e ficou ok.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-30T15:58:24.691Z' },
      { numero:'OS-0028', data:'2026-05-30', sala:'TEMPERADOS',   maq:'SELADORA DUPLAVAC CV250-SHD',   tag:'095-SEL002',tipo:'Preventiva', prioridade:'2', manut:'Danilo Mariano',  inicio:'10:40', fim:'12:00', duracao:80,  parada:80,  problema:'Manutenção preventiva.',                                                             acao:'Realizado ajuste da borracha de vedação; Reaperto nas conexões da resistência; Feito teste na máquina.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-30T15:59:58.230Z' },
      { numero:'OS-0029', data:'2026-06-01', sala:'TEMPERADOS',   maq:'TUMBLER MAXMAC TB-253',         tag:'095-TUM002',tipo:'Corretiva',  prioridade:'3', manut:'Danilo Mariano',  inicio:'06:55', fim:'07:12', duracao:17,  parada:17,  problema:'Conexão da mangueira solta.',                                                        acao:'Feito encaixe novamente.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-06-01T10:14:50.968Z' },
      { numero:'OS-0030', data:'2026-06-01', sala:'BACALHAU',     maq:'TERMOFORMADORA ULMA TFS300',    tag:'095-TER008',tipo:'Corretiva',  prioridade:'3', manut:'Danilo Mariano',  inicio:'06:42', fim:'06:50', duracao:8,   parada:8,   problema:'Facas rotativas.',                                                                   acao:'Produção perdeu parafusos trava de 3 facas. Colocado parafusos novos.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-06-01T10:18:37.962Z' },
      // OS-0031 a OS-0060 omitidas por brevidade — incluir via syncAll() do Sheets
      // A partir daqui mantemos apenas as mais recentes para o mock inicial
      { numero:'OS-0140', data:'2026-06-16', sala:'CARNE MOÍDA',  maq:'__outros__',                    tag:'',          tipo:'Corretiva',  prioridade:'2', manut:'Tiago Britici',   inicio:'08:50', fim:'09:20', duracao:30,  parada:30,  problema:'Elevador de Bobinas não estava ligando.',                                            acao:'Ao abrir a tampa do quadro elétrico foi identificado acúmulo de água no seu interior, causando a danificação da chave seccionadora. Realizamos a ligação direta no disjuntor motor do equipamento e solicitamos uma nova seccionadora para substituição.', acao_prev:'', foto:'https://drive.google.com/file/d/1WQuKSqbBtCrEs_NNT_0AbOYSgX8RW2Z1/view', pecas:'', origem:'direta', ref:'', criadoEm:'2026-06-16T13:54:24.270Z' },
      { numero:'OS-0177', data:'2026-06-18', sala:'CÁRNEOS',      maq:'TERMOFORMADORA ULMA TFS600',    tag:'',          tipo:'Corretiva',  prioridade:'1', manut:'Danilo Mariano',  inicio:'14:40', fim:'14:59', duracao:19,  parada:19,  problema:'Faca rotativa quebrada.',                                                            acao:'Realizado a troca de 1 faca quebrada e troca de 2 molas de outros 2 conjuntos de faca rotativa.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-06-18T18:00:36.627Z' },
    ],

    // ── OS Planejadas ────────────────────────────────────────
    planejadas: [
      {
        numero:'PL-0001', sala:'DESOSSA',
        maq:'ESTEIRA EC - 79006-OSB 001 00021 - PARA OSSOS SULMAQ EASY CLEAN', tag:'',
        tipo:'Melhoria', prioridade:'2', prazo:'2026-06-13', horas:3,
        descricao:'Ajustar chapa lateral de transferência para evitar queda de ossos na esteira (risco de segurança).',
        status:'Concluída', manutExec:'Adilson Pereira dos Santos',
        dataExec:'2026-06-15', inicio:'14:52', fim:'15:53', duracao:61,
        servicoExec:'Ajustado chapa e encostada na esteira de transferência de osso.',
        criadoEm:'2026-06-10T13:29:26.641Z', concluidoEm:'2026-06-16T20:53:23.433Z',
      },
      {
        numero:'PL-0002', sala:'CÁRNEOS',
        maq:'BALANÇA DE BANCADA TOLEDO 10-2090', tag:'',
        tipo:'Inspeção', prioridade:'2', prazo:'2026-06-20', horas:1,
        descricao:'Realizar aferição das balança da fatiadora Weber',
        status:'Atrasada', manutExec:'', dataExec:'', inicio:'', fim:'', duracao:0,
        servicoExec:'', criadoEm:'2026-06-10T21:55:24.612Z', concluidoEm:'',
      },
    ],

    // ── Solicitações ─────────────────────────────────────────
    solicitacoes: [
      {
        numero:'SOL-0001', sala:'LÁCTEOS', maq:'FATIADORA AUTOMÁTICA WEBER WLN905',
        tipo:'Corretiva', prioridade:'1',
        descricao:'Botão de emergência da fatiadora não está funcionando',
        status:'Concluída', solicitante:'Leonardo Dias', manutExec:'Tiago Britici',
        dataExec:'2026-06-10', servicoExec:'Após abrimos painel da IHM foi verificado que o bloco de contato do botão de emergência se soltou - o mesmo está apresentando desgaste. Realizado solicitação do material para substituição futura.',
        criadoEm:'2026-06-10T14:07:36.206Z', concluidoEm:'2026-06-10T17:38:17.525Z',
      },
      {
        numero:'SOL-0002', sala:'CARNE MOÍDA', maq:'__outros__',
        tipo:'Corretiva', prioridade:'3',
        descricao:'Vazamentos de água do registro na sala.',
        status:'Não Executada', solicitante:'Leonardo Dias', manutExec:'',
        dataExec:'', servicoExec:'',
        criadoEm:'2026-06-10T14:10:05.776Z', concluidoEm:'',
      },
      {
        numero:'SOL-0003', sala:'LÁCTEOS', maq:'__outros__',
        tipo:'Corretiva', prioridade:'3',
        descricao:'Vazamentos de água no registro.',
        status:'Concluída', solicitante:'Leonardo Dias', manutExec:'Cícero',
        dataExec:'2026-06-10', servicoExec:'Foi realizado reaperto das conexões no registro.',
        criadoEm:'2026-06-10T14:10:45.446Z', concluidoEm:'2026-06-10T14:12:11.974Z',
      },
    ],

    // ── Inspeções / RACs / Histórico (vazios no v1) ──────────
    inspecoes: [],
    racs:      [],
    historico: [],
  };
}
