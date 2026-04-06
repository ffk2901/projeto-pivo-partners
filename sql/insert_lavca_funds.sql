-- ============================================
-- MAPEAMENTO LAVCA - Inserção de novos fundos
-- Pivo Partners | Abril 2026
-- ============================================
-- Tabela: investors
-- Colunas: investor_id, investor_name, tags, email, notes, origin
-- ============================================

INSERT INTO investors (investor_id, investor_name, tags, email, notes, origin)
VALUES

-- 1. 30N VENTURES (México)
(
  'inv-30n-ventures',
  '30N Ventures',
  'VC;Early-stage;Growth;M&A;Secundárias;LatAm;México',
  '',
  '30N Ventures investe em empresas de alto crescimento em mercados emergentes, com foco em proporcionar liquidez a seus investidores desde o primeiro momento. A gestora se diferencia por uma abordagem centrada em M&A e operações de secundárias, integrando um playbook de liquidez ao processo de investimento desde a análise inicial de cada oportunidade. O time combina mais de 75 anos de experiência em classes de ativos na América Latina e no Vale do Silício, adotando uma filosofia disciplinada e data-driven, sem aderir à lógica de "spray-and-pray". || Estágio: Early-stage a Growth | Ticket Médio: US$ 2M (range: US$ 500K – US$ 5M) | Diferencial: Playbook proprietário de liquidez via M&A e secundárias.',
  'intl'
),

-- 2. AGGIR VENTURES (Brasil)
(
  'inv-aggir-ventures',
  'Aggir Ventures',
  'VC;Healthtech;Digital Health;MedTech;Brasil',
  '',
  'Gestora de Venture Capital focada exclusivamente no setor de saúde brasileiro. A Aggir investe em empreendedores excepcionais que utilizam avanços digitais, tecnológicos e científicos para transformar o cuidado e ampliar o acesso à saúde no país. O modelo de gestão é hands-on e orientado ao longo prazo, aportando experiência acumulada e uma rede qualificada de contatos que abrange saúde, tecnologia, finanças e empreendedorismo. Os investimentos priorizam novos modelos de cuidado, transformação digital como alavanca de eficiência e a descentralização da jornada de saúde. || Setores: Healthtech, Digital Health, MedTech | Abordagem: Hands-on, longo prazo, network qualificado.',
  'br'
),

-- 3. IKJ CAPITAL (EUA / Brasil)
(
  'inv-ikj-capital',
  'IKJ Capital',
  'VC;Early-stage;Healthtech;Saúde Mental;Longevidade;EUA;Brasil',
  '',
  'Fundo de investimento early-stage dedicado a empresas de tecnologia em saúde. A IKJ Capital foca em soluções que endereçam alguns dos maiores desafios do setor, incluindo saúde mental, condições crônicas e extensão da longevidade saudável (healthspan). || Estágio: Early-stage | Setores: Healthtech — saúde mental, doenças crônicas, longevidade.',
  'intl'
),

-- 4. SP VENTURES (Brasil)
(
  'inv-sp-ventures',
  'SP Ventures',
  'VC;AgFood;FoodTech;ClimateTech;Brasil',
  '',
  'Gestora de Venture Capital que opera na interseção entre segurança alimentar e crise climática. A SP Ventures investe em empreendedores que desafiam o status quo da cadeia de valor AgroAlimentar, apoiando-os com capital, rede de contatos, recrutamento de talentos e mentoria estratégica para transformar visão em negócios escaláveis e de impacto. || Setores: AgFood, FoodTech, ClimateTech | Diferencial: Rede especializada no ecossistema AgroAlimentar.',
  'br'
),

-- 5. TRIAXIS CAPITAL (Brasil)
(
  'inv-triaxis-capital',
  'Triaxis Capital',
  'VC;Early-stage;Growth;Tech;Brasil',
  '',
  'Gestora de Venture Capital que apoia startups inovadoras de base tecnológica com capital estratégico, governança estruturada e acesso a uma rede global de conexões. A Triaxis se diferencia por buscar empresas fora do radar convencional, combinando rigor técnico, análise aprofundada e acompanhamento ativo para garantir crescimento sustentável. Os veículos de investimento são destinados a investidores qualificados. || Estágio: Early-stage a Growth | Setores: Startups de base tecnológica (setor-agnóstico) | Abordagem: Governança estruturada, acompanhamento ativo, rede global.',
  'br'
),

-- 6. EQWOW VENTURES (Brasil)
(
  'inv-eqwow-ventures',
  'Eqwow Ventures',
  'VC;Impacto;Sustentabilidade;Inovação;Brasil',
  '',
  'Fundo de Venture Capital que investe em empresas escaláveis focadas em resolver problemas contemporâneos relevantes. A Eqwow combina a busca por retorno financeiro com sustentabilidade e inovação, apoiando empreendedores que atuam como catalisadores de mudanças positivas e desafiam o status quo por meio de conhecimento coletivo e novas lideranças. || Setores: Generalista — foco em impacto e escalabilidade | Abordagem: Inovação, sustentabilidade e geração de valor para stakeholders.',
  'br'
),

-- 7. THEVENTURECITY (Internacional)
(
  'inv-theventurecity',
  'TheVentureCity',
  'VC;Series A;Deeptech;Fintech;Healthtech;Logística;Cyber;B2B;Data-driven;EUA;Europa;LatAm',
  '',
  'Fundo global de Venture Capital early-stage, com abordagem data-driven e expertise operacional voltada para crescimento product-led. A TheVentureCity investe em empresas onde dados proprietários e inteligência artificial são o núcleo da proposta de valor, com ênfase em modelos B2B. Embora generalista, possui alta concentração em Deeptech, Fintech, Healthtech, Logística e Cybersecurity. O fundo oferece ferramentas proprietárias desenvolvidas para fundadores, ajudando startups a extrair insights críticos de seus dados para tomada de decisão de longo prazo. || Estágio: Series A | Geografia: EUA, Europa, América Latina | Setores: Deeptech, Fintech, Healthtech, Logística, Cyber (B2B) | Diferencial: Ferramentas proprietárias de data insights para portfólio.',
  'intl'
),

-- 8. THALESLAB (Uruguai)
(
  'inv-thaleslab',
  'ThalesLAB',
  'Aceleradora;IA;Soft-landing;Mentoria;Uruguai',
  '',
  'Aceleradora tecnológica baseada no Uruguai que oferece capacitação, tecnologia, rede de contatos, mentorias e apoio na captação de capital semente. A ThalesLAB também atua como consultoria em inteligência artificial para empresas e empreendedores, além de assessorar startups internacionais nos programas de incentivos disponíveis no Uruguai para facilitar operações de soft-landing e expansão no país. || Tipo: Aceleradora e consultoria em IA | Serviços: Aceleração, soft-landing, mentoria, capital semente.',
  'intl'
),

-- 9. IDB LAB (LatAm e Caribe)
(
  'inv-idb-lab',
  'IDB Lab',
  'VC;Impacto;Inclusão Financeira;Disruptive Tech;LatAm;Caribe;DFI',
  '',
  'Braço de inovação e venture do Grupo Banco Interamericano de Desenvolvimento (BID). O IDB Lab fomenta inovação empreendedora e tecnologias disruptivas com dois objetivos centrais: beneficiar populações em situação de pobreza e vulnerabilidade, e ativar novas indústrias para crescimento sustentável na América Latina e no Caribe. Apoia startups de alto impacto e seus ecossistemas por meio de financiamento flexível, conhecimento aplicado e conexões globais. || Tipo: Braço de inovação e venture capital (BID Group) | Geografia: América Latina e Caribe | Foco: Impacto social, inclusão financeira, tecnologias disruptivas.',
  'intl'
),

-- 10. GOOD KARMA PARTNERS (Brasil)
(
  'inv-good-karma-partners',
  'Good Karma Partners',
  'Impacto;Problem-first;Escala;Brasil',
  '',
  'Investidora orientada por propósito que desenvolve suas teses de investimento a partir da natureza do problema a ser resolvido. A Good Karma Partners busca negócios que tenham como objetivo central a solução de grandes desafios do mundo atual, priorizando iniciativas replicáveis, escaláveis, de caráter urgente e com proposta de valor clara capaz de gerar retorno financeiro aos investidores ao longo do tempo. || Critérios: Propósito, Escala, Urgência e Retorno | Abordagem: Problem-first — a tese nasce do problema, não do setor.',
  'br'
),

-- 11. BUENTRIP VENTURES (Equador / pan-LatAm)
(
  'inv-buentrip-ventures',
  'BuenTrip Ventures',
  'VC;Pre-Seed;Seed;B2B;Software;Fintech;Logística;E-commerce;LatAm;Equador',
  '',
  'Gestora de Venture Capital early-stage focada em startups B2B que oferecem soluções baseadas em software para setores-chave da economia latino-americana. Setor-agnóstica, com histórico de investimentos em Fintech, Logística, E-commerce, Plataformas, Marketplaces, Healthtech e Edtech. A BuenTrip construiu ao longo de uma década um ecossistema proprietário de deal-flow que permite atrair, selecionar e apoiar fundadores frequentemente negligenciados por outros investidores. Como founders-turned-investors, a gestora combina programa de aceleração, capital e uma rede de conhecimento e conexões para fundadores B2B de software na região. || Estágio: Pre-Seed e Seed | Geografia: América Latina e fundadores latino-americanos no exterior | Setores: B2B Software — setor-agnóstico | Diferencial: Ecossistema proprietário, aceleração e deal-flow regional.',
  'intl'
),

-- 12. EPIC ANGELS (LatAm e Ásia-Pacífico)
(
  'inv-epic-angels',
  'Epic Angels',
  'Anjo;Pre-Seed;Seed;Series A;Diversidade;LatAm;Ásia-Pacífico',
  '',
  'Grupo de investidores-anjo focado em startups early-stage na Ásia-Pacífico e América Latina, atuando em todos os verticais. Investe em fundadores que priorizam agilidade sobre ego, com a exigência de que ao menos uma mulher ocupe posição C-level na empresa. Os angels são executores ativos: além de capital, oferecem conhecimento, mentoria, rede global e tomam assentos em boards. || Estágio: Pre-Seed, Seed, Series A | Ticket: Até US$ 250K por empresa | Requisito: Ao menos uma mulher no C-level.',
  'intl'
),

-- 13. THE YIELD LAB LATAM (LatAm)
(
  'inv-yield-lab-latam',
  'The Yield Lab Latam',
  'VC;Seed;Series A;Series B;AgriFoodTech;ClimateTech;Argentina;Brasil;Chile;LatAm',
  '',
  'Gestora de Venture Capital especializada em AgriFoodTech com a maior presença e experiência na América Latina. Fundada em 2017 e parte de uma rede global de fundos (The Yield Lab), investe em startups early-stage de alto potencial que endereçam os múltiplos desafios da indústria agroalimentar — da fazenda ao prato. Atua como ponte entre investidores, startups, corporações, produtores rurais, setor público e comunidades de pesquisa para promover a transformação sustentável do setor. || Estágio: Seed a Series B | Ticket: US$ 100K a US$ 1M+ | Setores: AgriFoodTech — cereais, proteína animal, bioenergia, florestal | Critérios: Tração comercial, modelos escaláveis, impacto em sustentabilidade.',
  'intl'
),

-- 14. SORORITÉ CAPITAL (Brasil)
(
  'inv-sororite-capital',
  'Sororité Capital',
  'VC;Pre-Seed;Diversidade;Mulheres Fundadoras;Tech;Brasil',
  '',
  'Gestora de Venture Capital focada em investir em startups de base tecnológica ou tech-enabled lideradas por ao menos uma mulher no time de fundação, com atuação relevante na empresa. Investe no estágio Pre-Seed em modelos de negócio escaláveis com potencial de crescimento exponencial, com foco geográfico no Brasil. || Estágio: Pre-Seed | Geografia: Brasil | Requisito: Ao menos uma mulher fundadora com atuação relevante | Setores: Startups de base tecnológica ou tech-enabled.',
  'br'
),

-- 15. MARIA ALICE FRONTINI (Brasil)
(
  'inv-maria-alice-frontini',
  'Maria Alice Frontini',
  'Anjo;Early-stage;Pre-Seed;Tech;IA;Healthcare;Biotech;Agro;Brasil',
  '',
  'Investidora-anjo ativa no ecossistema de startups de base tecnológica no Brasil, com mais de 25 investimentos diretos em portfólio. Atua como Presidente do MIT & MIT Sloan Club of Brazil e possui posições em boards de empresas como Pin People, Dadosfera e Central da Visão. Seu foco abrange tecnologia, dados/IA, saúde, biotech e agro. || Tipo: Investidora-anjo (Pessoa Física) | Estágio: Early-stage, Pre-Seed | Setores: Tech, Dados/IA, Healthcare, Biotech, Agro | Portfólio: Amyi, Bossa Box, GoEpik, Pin People, Traive, entre outros.',
  'br'
),

-- 16. CAPRIA VENTURES (EUA / Global South)
(
  'inv-capria-ventures',
  'Capria Ventures',
  'VC;Applied AI;Global South;Impacto;Escala;EUA',
  '',
  'Fundo de Venture Capital sediado nos EUA com foco em empresas de tecnologia no Global South que constroem negócios escaláveis e rentáveis capazes de impactar centenas de milhões de pessoas. Com ênfase em Applied AI, a Capria investe em startups na vanguarda da inovação, com potencial de disruptar setores tradicionais e criar novas indústrias. Além de capital, oferece experiência operacional, insights setoriais e uma rede global de mentoria. || Foco Temático: Applied AI | Geografia: Global South | Diferencial: Mentoria operacional, rede global, foco em rentabilidade.',
  'intl'
),

-- 17. INVEST TECH (Brasil)
(
  'inv-invest-tech',
  'Invest Tech',
  'VC;PE;TI;Telecom;Tech-enabled;Brasil',
  '',
  'Gestora de Venture Capital e Private Equity com mais de R$ 500 milhões sob gestão, pioneira em fundos dedicados a TI e telecomunicações no Brasil. A Invest Tech investe em empresas que utilizam tecnologia como fator crítico para melhoria de processos, eficiência operacional e longevidade dos negócios. Seu portfólio inclui empresas como Vero Internet, Logcomex, IntuitiveCare, GoBots e Monuv. || Tipo: Venture Capital e Private Equity | AUM: R$ 500M+ | Setores: TI, Telecomunicações, Tech-enabled businesses.',
  'br'
),

-- 18. KALEI VENTURES (EUA / Global South)
(
  'inv-kalei-ventures',
  'Kalei Ventures',
  'VC;IA;AI-native;Global South;EUA',
  '',
  'Fundo de Venture Capital focado em startups AI-native que demonstram potencial tangível e de curto prazo para engajamento com clientes reais. A Kalei busca a combinação rara de tecnólogos nativos em IA com veteranos de startups que possuem capacidade de go-to-market e conexões para escalar rapidamente. A missão é construir pontes entre o Vale do Silício — principal hub de inovação em IA — e o Global South, onde a adoção de IA pode representar um salto tecnológico transformador. A abordagem de sourcing é criteriosa: foco em plataformas versáteis com potencial de monetização real desde o dia 1. || Foco Temático: IA Aplicada | Diferencial: Ponte Silicon Valley – Global South | Critérios: Monetização imediata, fundadores operacionais, sem hype.',
  'intl'
),

-- 19. DRIVEN VC (Chile)
(
  'inv-driven-vc',
  'Driven VC',
  'VC;Tech;Chile;LatAm',
  '',
  'Fundo de Venture Capital chileno com foco em investimentos em tecnologia na América Latina. A Driven apoia empreendedores da região com capital e suporte estratégico para escalar seus negócios. || Geografia: Chile / América Latina.',
  'intl'
),

-- 20. ZENTYNEL (México)
(
  'inv-zentynel',
  'Zentynel',
  'VC;Early-stage;Biotech;MedTech;Digital Health;AgTech;FoodTech;LatAm;México',
  '',
  'Fundo de Venture Capital early-stage focado em biotecnologia e ciências da vida na América Latina, fundado através da visão convergente da Fundación Ciencia & Vida e da Venturance Alternative Assets. A Zentynel combina capital, profundidade científica e expertise operacional para ajudar fundadores a transformar ciência de fronteira em negócios escaláveis. Os investimentos abrangem saúde humana e animal (fármacos, vacinas, diagnósticos, dispositivos médicos), saúde digital, plataformas de IA, agtech, foodtech e biotech ambiental. De 25% a 30% do fundo é reservado para follow-ons. || Estágio: Early-stage | Ticket: US$ 1M – US$ 2M | Setores: Biotech, MedTech, Digital Health, AgTech, FoodTech | Diferencial: Profundidade científica e suporte operacional hands-on.',
  'intl'
),

-- 21. FOUNDATION CAPITAL (EUA)
(
  'inv-foundation-capital',
  'Foundation Capital',
  'VC;Early-stage;Tech;EUA',
  '',
  'Fundo de Venture Capital norte-americano de longa trajetória, com presença consolidada no ecossistema de tecnologia e inovação. A Foundation Capital investe em empresas de tecnologia early-stage com potencial transformador. || Geografia: EUA.',
  'intl'
),

-- 22. 500 GLOBAL (EUA / LatAm)
(
  'inv-500-global',
  '500 Global',
  'VC;Aceleradora;IA;LatAm;EUA',
  '',
  'Plataforma global de Venture Capital com presença na América Latina desde 2012, acumulando um portfólio de mais de 300 startups sediadas na região ao longo de quatro fundos dedicados. Além de investimento direto, a 500 Global atua como parceira de fundadores, investidores e instituições, oferecendo programas de aceleração (19+ cohorts), educação em venture capital, hackathons (Release Before Ready) e uma plataforma de mídia própria (Descubre.vc). Com foco na crescente oportunidade de IA na região, a gestora trabalha para fortalecer o ecossistema de inovação da América Latina, do estágio de ideia ao IPO. || Portfólio LatAm: 300+ startups | Atuação: Fundos dedicados, aceleração, educação em VC | Diferencial: Ecossistema completo — capital, aceleração, mídia e eventos.',
  'intl'
),

-- 23. BRAIN VENTURES (Brasil)
(
  'inv-brain-ventures',
  'Brain Ventures',
  'VC;Capital Semente;Incubadoras;Parques Tecnológicos;Brasil',
  '',
  'Nascida em 2013 como BRAIN — Brazilian Accelerator of Innovation, a gestora atua na aproximação entre capital de risco e ambientes de inovação brasileiros. Opera em três frentes: portfólio próprio de empresas, fundos de investimento e criação de hubs de inovação. Seu principal veículo, o Fundo Primatec (FIP de capital semente), é o primeiro e único fundo brasileiro que se compromete em regulamento a destinar contrapartida financeira às incubadoras e parques tecnológicos parceiros. O Primatec opera desde 2015 com 14 companhias em portfólio, oriundas de 6 estados e 10 ambientes de inovação, sendo gerido pela Antera Gestão de Recursos. || Estágio: Capital Semente | Veículo: Fundo Primatec (FIP) | Diferencial: Contrapartida financeira a incubadoras e parques tecnológicos.',
  'br'
),

-- 24. GERA CAPITAL (Brasil)
(
  'inv-gera-capital',
  'Gera Capital',
  'PE;Growth;Gestão Ativa;Brasil',
  '',
  'Gestora de recursos brasileira com mais de 10 anos de atuação e R$ 1 bilhão investidos, focada em desenvolver growth companies por meio de profunda experiência em gestão, dedicação setorial e atuação ativa nas companhias investidas. A Gera busca negócios em crescimento liderados por empreendedores excepcionais que solucionam dores de mercados relevantes, com fundamentos sólidos e diferenciais competitivos de longo prazo. || Tipo: Private Equity / Growth | AUM: R$ 1B+ investidos | Abordagem: Gestão ativa, orientação de longo prazo.',
  'br'
),

-- 25. PATRICIA OSORIO / GVANGELS (Brasil)
(
  'inv-patricia-osorio-gvangels',
  'Patricia Osorio / GVAngels',
  'Anjo;Grupo de Anjos;IA;MarTech;Brasil',
  '',
  'Patricia Osorio é co-fundadora do GVAngels, grupo de investimento-anjo que já investiu mais de US$ 3 milhões em diversas startups. Também é co-fundadora da Birdie.ai, startup de IA que transforma feedback de clientes em insights de crescimento. Anteriormente, foi sócia de uma empresa de marketing technology no Brasil que cresceu para US$ 30M de ARR com expansão para outros países da América Latina. || Tipo: Grupo de investimento-anjo | AUM: US$ 3M+ investidos via GVAngels.',
  'br'
),

-- 26. 39A VENTURES (Brasil)
(
  'inv-39a-ventures',
  '39A Ventures',
  'Venture Building;Consultoria;IA;Crédito;Fintech;Brasil',
  '',
  'Ecossistema de venture building e consultoria especializada que apoia empresas de todos os portes no desenvolvimento e gestão de novos negócios — da estratégia à execução operacional. A 39A combina competências multidisciplinares em inteligência artificial, estruturação de crédito e tecnologia financeira. Na vertical de crédito, atua na estruturação de ofertas para PMEs, incluindo definição de modelos de negócio, políticas de crédito, precificação, automação via IA/ML e planejamento operacional, endereçando um mercado de R$ 350+ bilhões que ainda enfrenta barreiras significativas de acesso. || Tipo: Venture Building e Consultoria | Verticais: Crédito para PMEs, IA aplicada, novos negócios | Serviços: Estratégia, tecnologia, originação, execução operacional.',
  'br'
),

-- 27. GRIDX (Brasil)
(
  'inv-gridx',
  'GRIDX',
  'VC;Deep Biotech;Saúde;Agro;Bioindústria;Materiais;Brasil',
  '',
  'Fundo de Venture Capital focado em deep biotech e na transição para uma economia baseada em sistemas biológicos. A GRIDX investe em startups que utilizam a célula viva como plataforma tecnológica para transformar setores como saúde, agricultura, bioindústria e materiais. A tese parte da premissa de que a transição dos limites do paradigma industrial extrativo exige repensar como produzimos e organizamos a matéria — projetando sistemas centrados na saúde humana e planetária. || Setores: Deep Biotech — saúde, agro, bioindústria, materiais | Diferencial: Tese de longo prazo em biomanufatura e biotecnologia de fronteira.',
  'br'
),

-- 28. ATTOM CAPITAL (México / LatAm)
(
  'inv-attom-capital',
  'Attom Capital',
  'VC;Secundárias;Post-Series A;Series B;Series C;Fintech;B2B SaaS;LatAm;México',
  '',
  'Fundo de Venture Capital secundário focado na aquisição de stakes em startups excepcionais da América Latina, desbloqueando liquidez para investidores early-stage e proporcionando liberdade para que fundadores continuem construindo. A Attom investe tipicamente em empresas post-Series A até Series C, com preferência por fintech e B2B SaaS, priorizando eficiência de capital, resiliência e fundamentos sólidos. A proposta central é permitir que o ecossistema latino-americano recicle capital e continue compondo retornos, sem forçar exits prematuros ou timelines artificiais. || Estágio: Post-Series A a Series C (secundárias) | Setores: Fintech, B2B SaaS (generalista com convicção) | Diferencial: Secundárias estratégicas — liquidez sem comprometer controle.',
  'intl'
),

-- 29. SONEN CAPITAL (EUA / Global)
(
  'inv-sonen-capital',
  'Sonen Capital',
  'Impacto;OCIO;Advisory;ESG;Institucional;EUA',
  '',
  'Gestora de investimentos de impacto que atua como Outsourced CIO (OCIO) e Investment Advisor para famílias, fundações e investidores institucionais globais. A Sonen Capital constrói portfólios de investimento que integram objetivos sociais e ambientais aos financeiros, ajudando clientes a alinhar cada dólar investido ou concedido como grant à sua missão. A atuação inclui educação para boards, definição de estratégias de investimento alinhadas à missão e implementação de portfólios customizados voltados a resultados sustentáveis. || Tipo: Impact Investing — OCIO e Advisory | Clientes: Famílias, fundações, investidores institucionais | Diferencial: Alinhamento missão–investimento, educação para boards.',
  'intl'
)

ON CONFLICT (investor_id) DO NOTHING;
