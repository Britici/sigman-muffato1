// ============================================================
// SIGMAN v2.0 — mock/db.js
// Dados reais espelhados do Google Sheets (DATABASE v1)
// Última sincronização: 2026-06-18
// Próxima OS:  OS-0178  (osC: 178)
// Próxima PL:  PL-0003  (plC: 3)
// Próxima SOL: SOL-0004  (solC: 4)
// Próxima RAC: RAC-0001  (racC: 1)
//
// MIGRAÇÃO DE PERFIS (2026-06-18):
//   administracao → pcm            (Leonardo, Larissa, Marcia, Amauri, Welington)
//   diretoria     → administrativo (Ricardo, Angélica)
//   manutencao    → manutencao     (sem alteração)
//   producao      → producao       (sem alteração)
//   admin (usuário "admin")        → perfil 'admin' (novo nível máximo)
//
// SENHAS: resetadas para senha = login do usuário (provisória),
// armazenadas como senhaHash (SHA-256). Cada usuário deve trocar a
// própria senha no primeiro acesso; o administrador pode alterar a
// qualquer momento na tela de Usuários.
// Ex.: login 'tiago' → senha provisória 'tiago'.
//
// ⚠️ SHA-256 sem salt é proteção mínima client-side — NÃO usar
// como hashing definitivo. O backend Express deverá re-hashear
// com bcrypt/argon2 + salt na migração para PostgreSQL.
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
    // Senha provisória = login do próprio usuário (ex.: 'tiago' → 'tiago').
    // Cada usuário deve alterar a senha no primeiro acesso; o admin
    // pode redefinir a qualquer momento na tela de Usuários.
    usuarios: [
      { login:'admin',                nome:'Administrador',          perfil:'admin',          senhaHash:'8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', ativo:true },
      { login:'amauri',               nome:'Amauri Prymel',          perfil:'pcm',            senhaHash:'9b3dd215dbea2264058ab9802225bec9619a1fff6107f7e4a6d214a85d3bc1a6', ativo:true },
      { login:'marcia',               nome:'Marcia Souza',           perfil:'pcm',            senhaHash:'d077e58dee24d6cc828a2b7ba7644912dc991d4f19a1f9b6ec825e45406bbe2f', ativo:true },
      { login:'leonardo',             nome:'Leonardo Dias',          perfil:'pcm',            senhaHash:'18ccba186d8757c20cbf05d7a98b2c64f9f16eb64ea4a64659bbc5c9b7b3a7fe', ativo:true },
      { login:'larissa',              nome:'Larissa Melo',           perfil:'pcm',            senhaHash:'95a8f6568fa7ad6aba1bdcd6620a471a0aca7d4c447f508a94ae4aab2ed86bd3', ativo:true },
      { login:'welington',            nome:'Welington Oliveira',     perfil:'pcm',            senhaHash:'a08172a4e8c58a295ce348a2b6db6f3fa7ea02c243b98f0bcead321c2b444a56', ativo:true },
      { login:'adilson',              nome:'Adilson Pereira',        perfil:'manutencao',     senhaHash:'56e726b51d77a6a0447646495f5f4cf74f53158516f77a2e3391f97893c3f42c', ativo:true },
      { login:'carlos',               nome:'Carlos da Cruz',         perfil:'manutencao',     senhaHash:'7b85175b455060e3237e925f023053ca9515e8682a83c8b09911c724a1f8b75f', ativo:true },
      { login:'danilo',               nome:'Danilo Mariano',         perfil:'manutencao',     senhaHash:'da9f6713671da24a575ffbe6f0749ecb613efe7f3887b5c9f3e6cc8a94982ae9', ativo:true },
      { login:'joao',                 nome:'João Pereira',           perfil:'manutencao',     senhaHash:'ed2befb11499489e2570cb053f774b8ed93e89eddab3f78867a2a5f32c58845e', ativo:true },
      { login:'paulo',                nome:'Paulo do Carmo',         perfil:'manutencao',     senhaHash:'9d87609a3584d3fca24b7084dc445c5b6f5b8ac2c6db3a1fb0d3ab7ffe27e042', ativo:true },
      { login:'tiago',                nome:'Tiago Britici',          perfil:'manutencao',     senhaHash:'2c9a1c95814f31bb8459a7f7fc3536e73354699bace060e0876966878e1d1548', ativo:true },
      { login:'marcio',               nome:'Marcio Machado',         perfil:'manutencao',     senhaHash:'52667e8b16cdc0747e5c2b6c57328cb2fd11e4fa8b9fd5ae94be6e3d1c71fcc1', ativo:true },
      { login:'ricardo',              nome:'Ricardo Dias',           perfil:'administrativo', senhaHash:'65304dac3823069673aa9d3b90dcb9f44938e2d12f58509addc915d08922b64b', ativo:true },
      { login:'angelica',             nome:'Angélica Prymel',        perfil:'administrativo', senhaHash:'1f254faa04cffa0d0a8c75f8514f0087429c37cc3516f7abb69c6660db2e6407', ativo:true },
      { login:'nadine',               nome:'Nadine da Silva',        perfil:'producao',       senhaHash:'3af8e4b69bdc2acdabfabc682417cc1d53b84d0437aeb3787a054bfc68d9b2d4', ativo:true },
      { login:'producao-pas',         nome:'Produção P.A.S.',        perfil:'producao',       senhaHash:'e3bd5c48fe5fe7ef75b759caad8271e312c3e52f25c71419bc79298be39f94cc', ativo:true },
      { login:'producao-porcionados', nome:'Produção Porcionados',   perfil:'producao',       senhaHash:'a1c984d35d0aa1e78d56efa183c52f2404a6a7ce476e8c86f1b2296352c1392f', ativo:true },
      { login:'producao-desossa',     nome:'Produção Desossa',       perfil:'producao',       senhaHash:'43ea106d1c415f100f93edc27918a3eba54e46138c180c635574a9c12cafae47', ativo:true },
      { login:'qualidade',            nome:'Equipe de Qualidade',    perfil:'producao',       senhaHash:'7b670b41f14eba4f70d9b84ea3f78408f3d81090d211fd8add3120af336bad23', ativo:true },
      { login:'expedicao',            nome:'Expedição',              perfil:'producao',       senhaHash:'5e143390c11c531f7794a72cae1fdf2b51955bee76c648a4ff6fbc5ad27cef82', ativo:true },
      { login:'recebimento',          nome:'Recebimento',            perfil:'producao',       senhaHash:'f6fe6a3e7ce3556c0d7f5bf984597293b39ed672d064c4c86672b70b1e326ee3', ativo:true },
      { login:'secundaria',           nome:'Secundária',             perfil:'producao',       senhaHash:'075018006606cc4ed45db6dcc2cdc2ebedc2f6121e809482dc0f7fc5c4a1e90b', ativo:true },
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
      { id:'LÁCTEOS_FAT001',   sala:'LÁCTEOS',         nome:'FATIADORA AUTOMÁTICA WEBER WLN905',                                   tag:'095-FAT001', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'LÁCTEOS_TER005',   sala:'LÁCTEOS',         nome:'TERMOFORMADORA ULMA TFS700',                                          tag:'095-TER005', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'LÁCTEOS_EST022',   sala:'LÁCTEOS',         nome:'ESTEIRA TRANSPORTADORA SULMAQ CM_99999',                              tag:'095-EST022', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'LÁCTEOS_EST021',   sala:'LÁCTEOS',         nome:'ESTEIRA TRANSPORTADORA SULMAQ CM_99999 (PLATAFORMA)',                 tag:'095-EST021', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'LÁCTEOS_BAL014',   sala:'LÁCTEOS',         nome:'CONJUNTO DE BALANÇAS WEBER CCW-500',                                  tag:'095-BAL014', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'LÁCTEOS_EST020',   sala:'LÁCTEOS',         nome:'CONJUNTO DE ESTEIRAS BASCULANTE WEBER CCR500/CCA750',                 tag:'095-EST020', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'LÁCTEOS_BAL013',   sala:'LÁCTEOS',         nome:'BALANÇA DE BANCADA TOLEDO 10-2090 (1)',                               tag:'095-BAL013', criticidade:4, periodicidade:'Mensal', ativo:true },
      { id:'LÁCTEOS_BAL012',   sala:'LÁCTEOS',         nome:'BALANÇA DE BANCADA TOLEDO 10-2090 (2)',                               tag:'095-BAL012', criticidade:4, periodicidade:'Mensal', ativo:true },
      { id:'LÁCTEOS_ELE007',   sala:'LÁCTEOS',         nome:'ELEVADOR DE CARGAS ULMA EMS300',                                      tag:'095-ELE007', criticidade:4, periodicidade:'Mensal', ativo:true },
      { id:'CÁRNEOS_TER008',   sala:'CÁRNEOS',         nome:'TERMOFORMADORA ULMA TFS300',                                          tag:'095-TER008', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'CÁRNEOS_FAT002',   sala:'CÁRNEOS',         nome:'FATIADORA AUTOMÁTICA WEBER WLN405',                                   tag:'095-FAT002', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'CÁRNEOS_CUB003',   sala:'CÁRNEOS',         nome:'CUBADORA UNIVERSAL MHS 2000-105',                                     tag:'095-CUB003', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'CÁRNEOS_BAL015',   sala:'CÁRNEOS',         nome:'BALANÇA DE BANCADA TOLEDO 10-2090',                                   tag:'095-BAL015', criticidade:4, periodicidade:'Mensal', ativo:true },
      { id:'DEFUMADOS_SER006', sala:'DEFUMADOS',       nome:'SERRA FITA MONTEMIL SFM2850',                                         tag:'095-SER006', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'DEFUMADOS_TER007', sala:'DEFUMADOS',       nome:'TERMOFORMADORA ULMA TFS300',                                          tag:'095-TER007', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'BACALHAU_TER008',  sala:'BACALHAU',        nome:'TERMOFORMADORA ULMA TFS300',                                          tag:'095-TER008', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'BACALHAU_SFM3300', sala:'BACALHAU',        nome:'SERRA FITA',                                                          tag:'SFM3300',    criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'BACALHAU_EST025',  sala:'BACALHAU',        nome:'ESTEIRA TRANSPORTADORA SULMAQ CM_99999',                              tag:'095-EST025', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'LINGUIÇAS_EMB002', sala:'LINGUIÇAS',       nome:'EMBUTIDEIRA HANDTMANN VF612',                                         tag:'095-EMB002', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'LINGUIÇAS_TER004', sala:'LINGUIÇAS',       nome:'TERMOFORMADORA ULMA TFS300',                                          tag:'095-TER004', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'LINGUIÇAS_ELE',    sala:'LINGUIÇAS',       nome:'ELEVADOR DE CARROS 200/300 LITROS',                                   tag:'CM1117100',  criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'TEMPERADOS_SEL002',sala:'TEMPERADOS',      nome:'SELADORA DUPLAVAC CV250-SHD',                                         tag:'095-SEL002', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'TEMPERADOS_ELE004',sala:'TEMPERADOS',      nome:'ELEVADOR DE CARROS SULMAK CM-11171',                                  tag:'095-ELE004', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'TEMPERADOS_TUM002',sala:'TEMPERADOS',      nome:'TUMBLER MAXMAC TB-253',                                               tag:'095-TUM002', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'TEMPERADOS_TER003',sala:'TEMPERADOS',      nome:'TERMOFORMADORA ULMA TFS300',                                          tag:'095-TER003', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'PORCION_ICONE700', sala:'PORCIONAMENTOS',  nome:'FATIADORA DADAUX',                                                    tag:'ICONE 700',  criticidade:4, periodicidade:'Mensal', ativo:true },
      { id:'PORCION_TFS300',   sala:'PORCIONAMENTOS',  nome:'TERMOFORMADORA ULMA TFS300',                                          tag:'TFS300',     criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'CARNE_EMB001',     sala:'CARNE MOÍDA',     nome:'EMBUTIDEIRA HANDTMANN VF620',                                         tag:'095-EMB001', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'CARNE_FOR001',     sala:'CARNE MOÍDA',     nome:'FORMADORA HANDTMANN RF440',                                           tag:'095-FOR001', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'CARNE_POR001',     sala:'CARNE MOÍDA',     nome:'PORCIONADORA HANDTMANN GMD 99-2',                                     tag:'095-POR001', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'CARNE_SIS016',     sala:'CARNE MOÍDA',     nome:'SISTEMA DE PESAGEM HANDTMANN WS 910',                                 tag:'095-SIS016', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'CARNE_EST014',     sala:'CARNE MOÍDA',     nome:'ESTEIRA TRANSPORTADORA JA SP600',                                     tag:'095-EST014', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'CARNE_EST015',     sala:'CARNE MOÍDA',     nome:'ESTEIRA TRANSPORTADORA JA SP300',                                     tag:'095-EST015', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'CARNE_TER001',     sala:'CARNE MOÍDA',     nome:'TERMOFORMADORA EMBALAGEM ULMA TFS600',                                tag:'095-TER001', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'CARNE_TER006',     sala:'CARNE MOÍDA',     nome:'TERMOFORMADORA ULMA TFS600',                                          tag:'095-TER006', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'CARNE_MOE002',     sala:'CARNE MOÍDA',     nome:'MOEDOR EKOMEX WW 200',                                                tag:'095-MOE002', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'DESOSSA_SEL001',   sala:'DESOSSA',         nome:'SELADORA CRYOVAC VS95',                                               tag:'095-SEL001', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'DESOSSA_CUB004',   sala:'DESOSSA',         nome:'CUBADORA UNIVERSAL MHS 2000-105',                                     tag:'095-CUB004', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'DESOSSA_SEC001',   sala:'DESOSSA',         nome:'SECADORA CRYOVAC RA06',                                               tag:'095-SEC001', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'DESOSSA_TUN001',   sala:'DESOSSA',         nome:'TÚNEL DE TERMOENCOLHIMENTO CRYOVAC STE98',                            tag:'095-TUN001', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'DESOSSA_ASE530',   sala:'DESOSSA',         nome:'ESFOLIADORA WEBER',                                                   tag:'ASE530',     criticidade:4, periodicidade:'Mensal', ativo:true },
      { id:'DESOSSA_NOR001',   sala:'DESOSSA',         nome:'NÓRIA DE TRANSPORTE DE CARCAÇA SULMAQ HE-2',                         tag:'095-NOR001', criticidade:4, periodicidade:'Mensal', ativo:true },
      { id:'DESOSSA_NOR002',   sala:'DESOSSA',         nome:'NÓRIA DE CARRETILHA SULMAQ 1000/2',                                   tag:'095-NOR002', criticidade:4, periodicidade:'Mensal', ativo:true },
      { id:'DESOSSA_EST013',   sala:'DESOSSA',         nome:'CONJUNTO DE ESTEIRAS DA SALA PRINCIPAL DA DESOSSA SULMAQ EASY CLEAN', tag:'095-EST013', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'SALM_MOE001',      sala:'SALMOURAS',       nome:'MOEDOR MAXMAC SG 200',                                                tag:'095-MOE001', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'SALM_INJ001',      sala:'SALMOURAS',       nome:'INJETORA HENNEKEN HPI 450',                                           tag:'095-INJ001', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'SALM_MIS001',      sala:'SALMOURAS',       nome:'MISTURADOR DE SALMOURA HENNEKEN HVM-1000',                            tag:'095-MIS001', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'SALM_TUM001',      sala:'SALMOURAS',       nome:'TUMBLER HENNEKEN B2',                                                 tag:'095-TUM001', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'SALM_MIS002',      sala:'SALMOURAS',       nome:'MISTURADOR DE MASSAS EKOMEX ML500',                                   tag:'095-MIS002', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'SALM_ELE006',      sala:'SALMOURAS',       nome:'ELEVADOR MAXMAC EC-019',                                              tag:'095-ELE006', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'SALM_ELE005',      sala:'SALMOURAS',       nome:'ELEVADOR EKOMEX ZM200',                                               tag:'095-ELE005', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'SALM_BAL007',      sala:'SALMOURAS',       nome:'BALANÇA DE PISO TOLEDO 2180',                                         tag:'095-BAL007', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'PIZZA_TER010',     sala:'PIZZA',           nome:'TERMOFORMADORA ULMA TFS200',                                          tag:'095-TER010', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'PIZZA_EST028',     sala:'PIZZA',           nome:'ESTEIRA TRANSPORTADORA SULMAQ CM_99999',                              tag:'095-EST028', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'PIZZA_EST029',     sala:'PIZZA',           nome:'ESTEIRA TRANSPORTADORA SULMAQ CM_12548_03',                           tag:'095-EST029', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'PIZZA_FAT003',     sala:'PIZZA',           nome:'FATIADORA MANUAL TOLEDO 9300 G COM',                                  tag:'095-FAT003', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'PIZZA_RAL001',     sala:'PIZZA',           nome:'RALADOR INDUSTRIAL EQUIMATEC RAL-04-CL',                              tag:'095-RAL001', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'SEC_EST032',       sala:'SECUNDÁRIA',      nome:'CONJUNTO DE ESTEIRAS DE SAIDA DEFUMADOS - POSTO 04',                  tag:'095-EST032', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'SEC_EST030',       sala:'SECUNDÁRIA',      nome:'CONJUNTO DE ESTEIRAS DE SAIDA BACALHAU - POSTO 05',                   tag:'095-EST030', criticidade:3, periodicidade:'Mensal', ativo:true },
      { id:'SEC_DET001',       sala:'SECUNDÁRIA',      nome:'DETECTOR DE METAIS - BIZERBA 600/300-IC (01)',                        tag:'095-DET001', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'SEC_DET002',       sala:'SECUNDÁRIA',      nome:'DETECTOR DE METAIS - BIZERBA 600/300-IC (02)',                        tag:'095-DET002', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'SEC_DET003',       sala:'SECUNDÁRIA',      nome:'DETECTOR DE METAIS - BIZERBA 600/300-IC (03)',                        tag:'095-DET003', criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'UTIL_GER',         sala:'UTILIDADES',      nome:'GERADORES',                                                            tag:'GER',        criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'UTIL_SUB',         sala:'UTILIDADES',      nome:'SUBESTAÇÕES',                                                          tag:'SUB',        criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'UTIL_CALD',        sala:'UTILIDADES',      nome:'CALDEIRA',                                                             tag:'CALD',       criticidade:1, periodicidade:'Mensal', ativo:true },
      { id:'UTIL_ETE',         sala:'UTILIDADES',      nome:'ESTAÇÃO DE TRATAMENTO DE EFLUENTES',                                   tag:'ETE',        criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'LAV_SEC002',       sala:'LAVANDERIA',      nome:'SECADORA DE ROUPAS MAMUTE SE60',                                       tag:'095-SEC002', criticidade:2, periodicidade:'Mensal', ativo:true },
      { id:'LAV_LAV008',       sala:'LAVANDERIA',      nome:'LAVADORA DE ROUPAS MAMUTE LEH60',                                      tag:'095-LAV008', criticidade:1, periodicidade:'Mensal', ativo:true },
    ],

    // ── OS Executadas ────────────────────────────────────────
    ordens: [
      { numero:'OS-0001', data:'2026-05-27', sala:'TEMPERADOS',   maq:'DUPLAVAC',                      tag:'',          tipo:'Corretiva',  prioridade:'1', manut:'Paulo do Carmo',  inicio:'10:05', fim:'10:25', duracao:20,  parada:20,  problema:'Solda',                                                                                  acao:'Limpeza da resistência e borracha',        acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-27T13:27:05.411Z' },
      { numero:'OS-0002', data:'2026-05-27', sala:'BACALHAU',     maq:'TERMOFORMADORA ULMA',           tag:'',          tipo:'Corretiva',  prioridade:'2', manut:'Danilo Mariano',  inicio:'13:40', fim:'14:09', duracao:29,  parada:29,  problema:'Impressão em pontos saindo falhada.',                                                      acao:'A borracha de impressão estava com muita sujeira, acúmulo da própria impressão. Realizado limpeza nos pontos que estava ocasionando em falha, aumentado parâmetro de intensidade e realizado teste. Teve uma melhora significativa, liberado máquina para produção e instruído operador.', acao_prev:'', foto:'', pecas:'', origem:'direta', ref:'', criadoEm:'2026-05-27T17:12:19.125Z' },
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
