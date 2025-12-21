const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');
const { db } = require('../firebaseConfig'); // Configuração do Firebase Admin

const filePath = 'C:/Users/juanm/Documents/GitHub/ExodusIA-exodus-backend/functions/Teste-de-Sono.csv';

async function processCSV(filePath) {
  console.log(`Lendo arquivo CSV: ${filePath}`);
  const rows = [];
  const notFoundEmails = [];
  let questions = [];

  // Mapeamento das colunas do CSV para os campos do responses
  const fieldMapping = {
    "Pontuação sono dia 1": "pontuacao_sono_dia_1",
    "Pontuação sono dia 2": "pontuacao_sono_dia_2", 
    "Pontuação sono dia 3": "pontuacao_sono_dia_3",
    // Variações alternativas de nomes que podem aparecer
    "Pontuacao sono dia 1": "pontuacao_sono_dia_1",
    "Pontuacao sono dia 2": "pontuacao_sono_dia_2",
    "Pontuacao sono dia 3": "pontuacao_sono_dia_3",
    "Sleep Score Day 1": "pontuacao_sono_dia_1",
    "Sleep Score Day 2": "pontuacao_sono_dia_2",
    "Sleep Score Day 3": "pontuacao_sono_dia_3",
    "Sono Dia 1": "pontuacao_sono_dia_1",
    "Sono Dia 2": "pontuacao_sono_dia_2",
    "Sono Dia 3": "pontuacao_sono_dia_3"
  };

  // Função para converter a resposta em número
  const extractScoreFromResponse = (response) => {
    if (!response) {
      return 0; // Valor padrão
    }
    
    // Se já é um número
    if (typeof response === 'number') {
      return Math.max(0, Math.min(100, response)); // Garante que está entre 0-100
    }
    
    // Se é string, tenta converter
    if (typeof response === 'string') {
      const trimmed = response.trim();
      const parsed = parseInt(trimmed, 10);
      
      if (!isNaN(parsed)) {
        return Math.max(0, Math.min(100, parsed)); // Garante que está entre 0-100
      }
    }
    
    console.warn(`Não foi possível converter a pontuação: "${response}"`);
    return 0;
  };

  // Função para identificar colunas de timestamp
  const getTimestampColumn = (headers) => {
    const timestampColumns = [
      'Timestamp', 
      'Carimbo de data/hora', 
      'Data/Hora', 
      'Data',
      'DateTime'
    ];
    
    return headers.find(header => 
      timestampColumns.some(tsCol => 
        header.toLowerCase().includes(tsCol.toLowerCase())
      )
    );
  };

  // Função para identificar colunas de email
  const getEmailColumn = (headers) => {
    const emailColumns = [
      'Email', 
      'Email Address', 
      'Endereço de email', 
      'Endereço de e-mail',
      'E-mail'
    ];
    
    return headers.find(header => 
      emailColumns.some(emailCol => 
        header.toLowerCase().includes(emailCol.toLowerCase())
      )
    );
  };

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      if (questions.length === 0) {
        const headers = Object.keys(row);
        const timestampColumn = getTimestampColumn(headers);
        const emailColumn = getEmailColumn(headers);
        
        // Pega todas as colunas exceto Timestamp e Email
        questions = headers.filter((key) => 
          key !== timestampColumn && 
          key !== emailColumn
        );
        
        console.log('Headers encontrados:', headers);
        console.log('Coluna de timestamp:', timestampColumn);
        console.log('Coluna de email:', emailColumn);
        console.log('Perguntas/Campos de pontuação:', questions);
      }
      rows.push(row);
    })
    .on('end', async () => {
      console.log(`Total de linhas lidas: ${rows.length}`);
      let processedCount = 0;

      // Identifica as colunas dinamicamente
      const headers = Object.keys(rows[0] || {});
      const timestampColumn = getTimestampColumn(headers);
      const emailColumn = getEmailColumn(headers);

      for (const row of rows) {
        const email = row[emailColumn];
        const timestamp = row[timestampColumn];
        
        if (!email) {
          console.warn('Linha sem email encontrada, pulando...');
          continue;
        }

        // Criando responses com os campos de pontuação
        const responses = {};
        let rawDataString = '';

        questions.forEach((question) => {
          const fieldName = fieldMapping[question];
          const answer = row[question];

          if (fieldName) {
            // Converte a pontuação em número
            responses[fieldName] = extractScoreFromResponse(answer);
          } else {
            // Se não tem mapeamento específico, usa o nome da coluna diretamente
            responses[question.toLowerCase().replace(/\s+/g, '_')] = extractScoreFromResponse(answer);
          }

          // Monta o raw_data preservando os dados originais
          rawDataString += `${question}: "${answer}"\n`;
        });

        // Debug: mostra as primeiras conversões para verificar
        if (processedCount < 3) {
          console.log(`\nExample conversion for ${email}:`);
          Object.keys(responses).forEach(key => {
            console.log(`${key}: ${responses[key]}`);
          });
        }

        // Converte timestamp se existir
        let formTimestamp;
        if (timestamp) {
          try {
            let date;
            
            // Tenta diferentes formatos de data
            if (timestamp.includes('/')) {
              // Formato: "28/04/2025 06:56:37" ou "28/04/2025"
              const [datePart, timePart = '00:00:00'] = timestamp.split(' ');
              const [day, month, year] = datePart.split('/');
              const [hour, minute, second] = timePart.split(':');
              
              date = new Date(
                parseInt(year), 
                parseInt(month) - 1, // JavaScript months are 0-indexed
                parseInt(day),
                parseInt(hour) || 0,
                parseInt(minute) || 0,
                parseInt(second) || 0
              );
            } else if (timestamp.includes('-')) {
              // Formato ISO: "2025-04-28T06:56:37" ou "2025-04-28"
              date = new Date(timestamp);
            } else {
              // Tenta parsing direto
              date = new Date(timestamp);
            }
            
            if (isNaN(date.getTime())) {
              throw new Error('Data inválida');
            }
            
            formTimestamp = admin.firestore.Timestamp.fromDate(date);
            console.log(`Timestamp convertido para ${email}: ${date.toISOString()}`);
          } catch (error) {
            console.warn(`Erro ao converter timestamp para ${email}: ${timestamp}. Usando timestamp do servidor.`);
            formTimestamp = admin.firestore.FieldValue.serverTimestamp();
          }
        } else {
          formTimestamp = admin.firestore.FieldValue.serverTimestamp();
        }

        const formData = {
          title: 'Teste de Sono',
          timestamp: formTimestamp,
          instructor: '/instructors/9Sti3H8AZL2wnTQT23ff',
          raw_data: rawDataString.trim(),
          responses: responses,
          type: 'sleep_test',
        };

        try {
          const clientSnapshot = await db
            .collection('clients')
            .where('email', '==', email)
            .get();

          if (clientSnapshot.empty) {
            console.warn(`Nenhum cliente encontrado para o e-mail: ${email}`);
            notFoundEmails.push(email);
            continue;
          }

          const clientId = clientSnapshot.docs[0].id;
          await db.collection(`clients/${clientId}/forms`).add(formData);

          processedCount++;
          console.log(`✓ Documento criado com sucesso para: ${email} (Cliente: ${clientId})`);
        } catch (error) {
          console.error(`✗ Erro ao processar ${email}:`, error.message);
        }
      }

      console.log('\n' + '='.repeat(60));
      console.log('PROCESSAMENTO CONCLUÍDO - TESTE DE SONO');
      console.log('='.repeat(60));
      console.log(`Total de linhas no CSV: ${rows.length}`);
      console.log(`Documentos criados com sucesso: ${processedCount}`);
      console.log(`E-mails não encontrados: ${notFoundEmails.length}`);
      console.log(`Taxa de sucesso: ${((processedCount / rows.length) * 100).toFixed(2)}%`);
      
      if (notFoundEmails.length > 0) {
        console.log('\nE-mails não encontrados:');
        notFoundEmails.forEach(email => console.log(`- ${email}`));
      }
      
      console.log('\nExemplo de responses salvo:');
      if (rows.length > 0) {
        const sampleRow = rows[0];
        const sampleResponses = {};
        questions.slice(0, 3).forEach((question) => {
          const fieldName = fieldMapping[question];
          if (fieldName) {
            sampleResponses[fieldName] = extractScoreFromResponse(sampleRow[question]);
          }
        });
        console.log(JSON.stringify(sampleResponses, null, 2));
      }

      // Mostra estatísticas das pontuações processadas
      console.log('\nEstatísticas das pontuações:');
      const allScores = rows.map(row => {
        const scores = {};
        questions.forEach(question => {
          const fieldName = fieldMapping[question] || question.toLowerCase().replace(/\s+/g, '_');
          scores[fieldName] = extractScoreFromResponse(row[question]);
        });
        return scores;
      });

      if (allScores.length > 0) {
        Object.keys(allScores[0]).forEach(field => {
          const scores = allScores.map(s => s[field]).filter(s => s > 0);
          if (scores.length > 0) {
            const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
            const min = Math.min(...scores);
            const max = Math.max(...scores);
            console.log(`${field}: Média=${avg.toFixed(1)}, Min=${min}, Max=${max}`);
          }
        });
      }
    });
}

// Executa o processamento
processCSV(filePath).catch(console.error);