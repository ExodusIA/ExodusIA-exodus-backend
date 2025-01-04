const xlsx = require('xlsx'); // Biblioteca para ler arquivos XLS
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://pjgclgmtygvdjsadpikd.supabase.co'; // Substitua pelo URL do seu Supabase
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqZ2NsZ210eWd2ZGpzYWRwaWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIxMTQ4NDYsImV4cCI6MjA0NzY5MDg0Nn0.yTRWRAmk-eA-96Sx9-1_iM4Rh72DS2BnwZMjtd6wEPw'; // Substitua pela sua chave de API
const supabase = createClient(supabaseUrl, supabaseKey);

// Caminho do arquivo XLS
const filePath = './../../mental_health.xlsx';

// Função para converter respostas qualitativas em valores numéricos
const mapQualitativeToNumeric = (response, scaleType) => {
  if (!response || response.trim() === '') return null;

  const normalized = response.trim().toLowerCase();

  // Escala 1: Stress (Quase nunca - Muitas vezes)
  const scaleStress = {
    'quase nunca': 1,
    'poucas vezes': 2,
    'às vezes': 3,
    'bastante vezes': 4,
    'muitas vezes': 5
  };

  // Escala 2: Ansiedade (Nunca - Quase todos os dias)
  const scaleAnxiety = {
    'nunca': 1,
    'alguns dias': 2,
    'vários dias': 3, // Valor antigo tratado como "Alguns dias"
    'mais de metade dos dias': 3,
    'mais da metade dos dias': 3,
    'quase todos os dias': 4
  };

  // Escala 3: Depressão (Mesmo que ansiedade)
  const scaleDepression = scaleAnxiety;

  switch (scaleType) {
    case 'stress': return scaleStress[normalized] || null;
    case 'anxiety': return scaleAnxiety[normalized] || null;
    case 'depression': return scaleDepression[normalized] || null;
    default: 
      console.warn(`Escala desconhecida: ${scaleType}`);
      return null;
  }
};

// Função principal para processar e inserir os dados
const migrateMentalHealthAssessments = async () => {
  try {
    // Passo 1: Buscar os clientes no Supabase
    const { data: clients, error: clientsError } = await supabase.from('clients').select('id, email');
    if (clientsError || !clients) {
      console.error('Erro ao buscar clientes:', clientsError);
      return;
    }

    // Criar um mapa de clientes para busca rápida pelo e-mail
    const clientMap = new Map(clients.map(client => [client.email.trim().toLowerCase(), client.id]));
    console.log(`Clientes carregados: ${clients.length}`);

    // Passo 2: Ler o arquivo XLS
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`Foram encontrados ${sheetData.length} registros.`);

    for (const row of sheetData) {
      const clientEmail = (row['Endereço de e-mail'] || '').trim().toLowerCase();
      const clientId = clientMap.get(clientEmail);
      if (!clientId) {
        console.error(`Cliente com email "${clientEmail}" não encontrado.`);
        continue;
      }

      const assessmentDate = new Date(row['Carimbo de data/hora']);
      if (isNaN(assessmentDate)) {
        console.error(`Data inválida no registro: ${row['Carimbo de data/hora']}`);
        continue;
      }

      // Mapear as perguntas
      const assessment = {
        client_id: clientId,
        assessment_date: assessmentDate.toISOString(),

        // Perguntas de Stress
        stress_incomodo: mapQualitativeToNumeric(row['1. No último mês, com que frequência se sentiu incomodado com alguma coisa que tenha acontecido de forma inesperada?'], 'stress'),
        controle_importante: mapQualitativeToNumeric(row['2. No último mês, com que frequência se sentiu incapaz de controlar as coisas importantes da sua vida?'], 'stress'),
        nervoso_estressado: mapQualitativeToNumeric(row['3. No último mês, com que frequência se sentiu nervoso e estressado?'], 'stress'),
        confianca_problemas: mapQualitativeToNumeric(row['4. No último mês, com que frequência se sentiu confiante na sua capacidade para resolver os seus problemas pessoais?'], 'stress'),
        coisas_correndo_bem: mapQualitativeToNumeric(row['5. No último mês, com que frequência sentiu que as coisas lhe estavam a correr bem?'], 'stress'),
        nao_lidar: mapQualitativeToNumeric(row['6. No último mês, com que frequência sentiu que não conseguia lidar com todas as coisas que tinha para fazer?'], 'stress'),

        // Perguntas de Ansiedade
        ansioso_tenso: mapQualitativeToNumeric(row['11. Sentir-se nervoso(a), ansioso(a) ou muito tenso'], 'anxiety'),
        controlar_preocupacoes: mapQualitativeToNumeric(row['12. Não ser capaz de impedir ou controlar as preocupações'], 'anxiety'),
        dificuldade_relaxar: mapQualitativeToNumeric(row['14. Dificuldade em relaxar'], 'anxiety'),

        // Perguntas de Depressão
        pouco_prazer: mapQualitativeToNumeric(row['18. Tive pouco interesse ou prazer em fazer as coisas'], 'depression'),
        desanimo_esperanca: mapQualitativeToNumeric(row['19.  Senti desânimo, desalento ou falta de esperança'], 'depression'),
        dificuldade_sono: mapQualitativeToNumeric(row['20. Tive dificuldade em adormecer ou em dormir sem interrupções, ou dormi demais'], 'depression'),
        cansaco_energia: mapQualitativeToNumeric(row['21. Senti cansaço ou falta de energia'], 'depression')
      };

      // Inserir os dados no Supabase
      const { error } = await supabase.from('mental_health_assessments').insert([assessment]);

      if (error) {
        console.error(`Erro ao inserir avaliação para "${clientEmail}":`, error.message);
      } else {
        console.log(`Avaliação inserida para "${clientEmail}".`);
      }
    }

    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a migração:', error.message);
  }
};

// Executar a migração
migrateMentalHealthAssessments();
