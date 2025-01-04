const xlsx = require('xlsx'); // Biblioteca para ler arquivos XLS
const { createClient } = require('@supabase/supabase-js');
const { parse } = require('date-fns'); // Biblioteca para formatar datas

// Configuração do Supabase
    const supabaseUrl = 'https://pjgclgmtygvdjsadpikd.supabase.co'; // Substitua pelo URL do seu Supabase
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqZ2NsZ210eWd2ZGpzYWRwaWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIxMTQ4NDYsImV4cCI6MjA0NzY5MDg0Nn0.yTRWRAmk-eA-96Sx9-1_iM4Rh72DS2BnwZMjtd6wEPw'; // Substitua pela sua chave de API
const supabase = createClient(supabaseUrl, supabaseKey);

// Caminho do arquivo XLS
const filePath = './../../auto.xlsx';

// Função para processar e inserir os dados
const convertExcelDate = (excelSerialDate) => {
    const excelEpoch = new Date(1900, 0, 1); // 1º de janeiro de 1900
    const days = Math.floor(excelSerialDate) - 2; // Subtrai 2 dias (ajuste do Excel para o bug do ano bissexto)
    const milliseconds = (excelSerialDate - Math.floor(excelSerialDate)) * 86400000; // Parte decimal para horas
    return new Date(excelEpoch.getTime() + days * 86400000 + milliseconds); // Soma os dias e os milissegundos
  };
  
  // Função para processar e inserir os dados
  const migrateAssessments = async () => {
    try {
      // Passo 1: Buscar todos os clientes do Supabase
      const { data: clients, error: clientsError } = await supabase.from('clients').select('id, email');
      if (clientsError || !clients) {
        console.error('Erro ao buscar clientes do Supabase:', clientsError);
        return;
      }
  
      // Criar um mapa de clientes para busca rápida pelo e-mail
      const clientMap = new Map(clients.map(client => [client.email.trim().toLowerCase(), client.id]));
      console.log(`Clientes carregados: ${clients.length}`);
  
      // Passo 2: Ler o arquivo XLS
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  
      console.log(`Foram encontrados ${sheetData.length} registros no arquivo XLS.`);
  
      for (const row of sheetData) {
        // Captura e normaliza o e-mail
        const clientEmail = (row['Email Address'] || '').trim().toLowerCase();
        console.log(`Processando cliente com email: "${clientEmail}"`);
  
        // Busca o client_id no mapa de clientes
        const clientId = clientMap.get(clientEmail);
  
        if (!clientId) {
          console.error(`Cliente com email "${clientEmail}" não encontrado no mapa.`);
          continue;
        }
  
        // Corrigir o Timestamp
        const rawTimestamp = row['Timestamp'];
        let assessmentDate;
  
        if (typeof rawTimestamp === 'number') {
          // Se for uma data serial do Excel
          assessmentDate = convertExcelDate(rawTimestamp);
        } else {
          // Se for uma string de data
          assessmentDate = new Date(rawTimestamp);
        }
  
        if (isNaN(assessmentDate)) {
          console.error(`Data inválida no registro: ${rawTimestamp}`);
          continue;
        }
  
        // Mapear as colunas do XLS para os campos da tabela
        const contatoComANatureza = row['1. Você tem tido contato com a natureza atualmente?'];
        const viverNoAgora = row['2. Quanto você vive no agora, focado no momento presente?'];
        const sensoDeComunidade = row['3. Você tem convivido em sociedade? Como anda sua vida social?'];
        const autoconhecimento = row['4. Tem desenvolvido seu autoconhecimento?'];
        const viverEmEquilibrio = row['5. Você tem uma vida equilibrada?'];
        const generosidade = (row['6. Você pratica a gentileza com os outros?'] +
                              row['7. Você pratica a gentileza com você mesmo?']) / 2;
        const comerComQualidade = row['8. Você tem se alimentado com qualidade?'];
        const autonomiaDoCorpo = row['9. Você sente que tem autonomia sobre seu corpo?'];
  
        // Inserir os dados na tabela self_assessments
        const { error } = await supabase.from('self_assessments').insert([
          {
            client_id: clientId,
            assessment_date: assessmentDate.toISOString(), // Formata para ISO 8601
            generosidade,
            autoconhecimento,
            comer_com_qualidade: comerComQualidade,
            contato_com_a_natureza: contatoComANatureza,
            senso_de_comunidade: sensoDeComunidade,
            viver_no_agora: viverNoAgora,
            viver_em_equilibrio: viverEmEquilibrio,
            autonomia_do_corpo: autonomiaDoCorpo,
          },
        ]);
  
        if (error) {
          console.error(
            `Erro ao inserir avaliação para o cliente com email "${clientEmail}":`,
            error.message
          );
        } else {
          console.log(`Autoavaliação inserida para o cliente com email "${clientEmail}".`);
        }
      }
  
      console.log('Migração das avaliações concluída!');
    } catch (error) {
      console.error('Erro durante a migração das avaliações:', error.message);
    }
  };
  
  
  
  
  
  
  
// Executar a migração
migrateAssessments();
