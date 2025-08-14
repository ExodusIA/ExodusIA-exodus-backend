const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');
const { db } = require('../firebaseConfig'); // Configuração do Firebase Admin

const filePath = 'C:/Users/juanm/Documents/GitHub/ExodusIA-exodus-backend/functions/Consciencia-Alimentar.csv';

async function processCSV(filePath) {
  console.log(`Lendo arquivo CSV: ${filePath}`);
  const rows = [];
  const notFoundEmails = [];
  let questions = [];

  // Mapeamento exato das colunas do CSV para os campos do responses
  const fieldMapping = {
    "1.1. Como você percebe a fome antes de comer?": "1_1",
    "1.2. Durante as refeições, como você se sente em relação ao ritmo da mastigação?": "1_2",
    "1.3. Você percebe sinais de saciedade ao longo da refeição?": "1_3",
    "1.4. Você come enquanto faz outras atividades (TV, celular, computador, trabalho)?": "1_4",
    "2.1. Você come em resposta a emoções como ansiedade, tédio ou estresse?": "2_1",
    "2.2. Como você lida com a vontade de comer algo específico fora do horário das refeições?": "2_2",
    "3.1. Quantas porções de frutas e vegetais você consome por dia?": "3_1",
    "3.2. Você prioriza alimentos frescos e minimamente processados na sua alimentação?": "3_2",
    "3.3. Com que frequência você consome grãos integrais (aveia, quinoa, arroz integral, pão integral)?": "3_3",
    "3.4. Como você lida com o açúcar na sua alimentação?": "3_4",
    "4.1. Você planeja suas refeições e compras de alimentos?": "4_1",
    "4.2. Você considera o impacto ambiental dos seus hábitos alimentares?": "4_2",
    "5.1. Como você lida com a alimentação em eventos sociais?": "5_1",
    "5.2. Quando sai para comer fora, qual a sua escolha mais comum?": "5_2",
    "6.1. Você percebe como os alimentos impactam seu corpo e sua mente?": "6_1",
    "6.2. Como você costuma comer?": "6_2",
    "6.3. Você respeita os sinais do seu corpo antes, durante e depois das refeições?": "6_3"
  };

  // Função para extrair apenas a letra da resposta
  const extractLetterFromResponse = (response) => {
    if (!response || typeof response !== 'string') {
      return 'D'; // Valor padrão
    }
    
    // Remove espaços e procura pela letra no início da resposta
    const trimmed = response.trim();
    const match = trimmed.match(/^([ABCD])\)/);
    
    if (match) {
      return match[1]; // Retorna apenas a letra (A, B, C, ou D)
    }
    
    // Fallback: se não conseguir identificar, retorna D
    console.warn(`Não foi possível identificar a letra da resposta: "${response}"`);
    return 'D';
  };

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      if (questions.length === 0) {
        // Pega todas as colunas exceto Timestamp e Email
        questions = Object.keys(row).filter((key) => 
          key !== 'Timestamp' && 
          key !== 'Email' && 
          key !== 'Email Address'
        );
        console.log('Perguntas encontradas:', questions.length);
      }
      rows.push(row);
    })
    .on('end', async () => {
      console.log(`Total de linhas lidas: ${rows.length}`);
      let processedCount = 0;

      for (const row of rows) {
        const email = row['Email'] || row['Email Address']; // Flexibilidade para ambos os nomes
        const timestamp = row['Timestamp'];
        
        // Remove campos não relacionados às perguntas
        delete row['Email'];
        delete row['Email Address'];
        delete row['Timestamp'];

        if (!email) {
          console.warn('Linha sem email encontrada, pulando...');
          continue;
        }

        // Criando responses com os nomes dos campos corretos
        const responses = {};
        let rawDataString = '';

        questions.forEach((question) => {
          const fieldName = fieldMapping[question];
          const answer = row[question] || "D) Valor padrão"; // Valor padrão

          if (fieldName) {
            // Extrai apenas a letra da resposta
            responses[fieldName] = extractLetterFromResponse(answer);
          }

          // Monta o raw_data preservando a resposta completa
          rawDataString += `${question}: "${answer}"\n`;
        });

        // Debug: mostra as primeiras conversões para verificar
        if (processedCount < 3) {
          console.log(`\nExample conversion for ${email}:`);
          Object.keys(responses).slice(0, 3).forEach(key => {
            const originalQuestion = Object.keys(fieldMapping).find(q => fieldMapping[q] === key);
            console.log(`${key}: ${responses[key]} (from: "${row[originalQuestion]?.substring(0, 50)}...")`);
          });
        }

        // Converte timestamp se existir
        let formTimestamp;
        if (timestamp) {
          try {
            // Formato esperado: "13/03/2025 06:07:02"
            const [datePart, timePart] = timestamp.split(' ');
            const [day, month, year] = datePart.split('/');
            const [hour, minute, second] = timePart.split(':');
            
            const date = new Date(
              parseInt(year), 
              parseInt(month) - 1, // JavaScript months are 0-indexed
              parseInt(day),
              parseInt(hour),
              parseInt(minute),
              parseInt(second)
            );
            
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
          title: 'Consciência Alimentar',
          timestamp: formTimestamp,
          instructor: '/instructors/9Sti3H8AZL2wnTQT23ff',
          raw_data: rawDataString.trim(),
          responses: responses,
          type: 'mindful_eating',
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
      console.log('PROCESSAMENTO CONCLUÍDO');
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
      const sampleRow = rows[0];
      const sampleResponses = {};
      questions.slice(0, 3).forEach((question) => {
        const fieldName = fieldMapping[question];
        if (fieldName) {
          sampleResponses[fieldName] = extractLetterFromResponse(sampleRow[question]);
        }
      });
      console.log(JSON.stringify(sampleResponses, null, 2));
    });
}

// Executa o processamento
processCSV(filePath).catch(console.error);