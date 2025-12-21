const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');
const { db } = require('../firebaseConfig'); // Configuração do Firebase Admin

const filePath = 'C:/Users/juanm/Documents/GitHub/ExodusIA-exodus-backend/functions/psicologica.csv';

async function processCSV(filePath) {
  console.log(`Lendo arquivo CSV: ${filePath}`);
  const rows = [];
  const notFoundEmails = [];
  let questions = [];

  // Mapeamento exato das colunas do CSV para os campos do responses
  const fieldMapping = {
    // Escala de Estresse Percebido (Perguntas 1-10)
    "1. No último mês, com que frequência se sentiu incomodado com alguma coisa que tenha acontecido de forma inesperada?": "q1",
    "2. No último mês, com que frequência se sentiu incapaz de controlar as coisas importantes da sua vida?": "q2",
    "3. No último mês, com que frequência se sentiu nervoso e estressado?": "q3",
    "4. No último mês, com que frequência se sentiu confiante na sua capacidade para resolver os seus problemas pessoais?": "q4",
    "5. No último mês, com que frequência sentiu que as coisas lhe estavam a correr bem?": "q5",
    "6. No último mês, com que frequência sentiu que não conseguia lidar com todas as coisas que tinha para fazer?": "q6",
    "7. No último mês, com que frequência conseguiu controlar as irritações da sua vida?": "q7",
    "8. No último mês, com que frequência sentiu que estava a ter tudo sob controle?": "q8",
    "9. No último mês, com que frequência se sentiu zangado por coisas que não estavam sob o seu controle?": "q9",
    "10. No último mês, com que frequência sentiu que as dificuldades se estavam a avolumar de tal forma que não iria conseguir geri-las?": "q10",
    
    // Escala de Ansiedade Generalizada (Perguntas 11-17)
    "11. Sentir-se nervoso(a), ansioso(a) ou muito tenso": "q11",
    "12. Não ser capaz de impedir ou controlar as preocupações": "q12",
    "13. Preocupar-se muito com diversas coisas": "q13",
    "14. Dificuldade em relaxar": "q14",
    "15. Ficar tão agitado(a) que se torna difícil permanecer sentado(a)": "q15",
    "16. Ficar facilmente aborrecido(a) ou irritado(a)": "q16",
    "17. Sentir medo como se algo horrível fosse acontecer": "q17",
    
    // Escala de Depressão (Perguntas 18-26)
    "18. Tive pouco interesse ou prazer em fazer as coisas": "q18",
    "19. Senti desânimo, desalento ou falta de esperança": "q19",
    "20. Tive dificuldade em adormecer ou em dormir sem interrupções, ou dormi demais": "q20",
    "21. Senti cansaço ou falta de energia": "q21",
    "22. Tive falta ou excesso de apetite": "q22",
    "23. Senti que não gosto de mim mesmo — ou que sou um(a) fracasso/a": "q23",
    "24. Tive dificuldade em concentrar-me nas coisas, como ao ler o jornal ou ver televisão": "q24",
    "25. Movimentei-me ou falei tão lentamente que outras pessoas poderão ter notado. Ou o oposto: estive agitado/a a ponto de andar de um lado para o outro muito mais do que é habitual": "q25",
    "26. Pensei que seria melhor estar morto/a, ou em magoar-me a mim próprio/a de alguma forma": "q26"
  };

  // Função para extrair a resposta e convertê-la para o valor padrão
  const extractResponseValue = (response, questionNumber) => {
    if (!response || typeof response !== 'string') {
      // Valores padrão diferentes por escala
      return questionNumber <= 10 ? 'às vezes' : 'alguns dias';
    }

    const trimmed = response.toLowerCase().trim();
    
    // Para perguntas 1-10 (Escala de Estresse Percebido)
    if (questionNumber <= 10) {
      if (trimmed.includes('quase nunca') || trimmed.includes('nunca')) {
        return 'quase nunca';
      } else if (trimmed.includes('poucas vezes') || trimmed.includes('raramente')) {
        return 'poucas vezes';
      } else if (trimmed.includes('às vezes') || trimmed.includes('algumas vezes')) {
        return 'às vezes';
      } else if (trimmed.includes('bastante vezes') || trimmed.includes('frequentemente')) {
        return 'bastante vezes';
      } else if (trimmed.includes('muitas vezes') || trimmed.includes('sempre')) {
        return 'muitas vezes';
      }

      // Fallback para perguntas 1-10: tenta identificar por números ou letras
      if (trimmed.includes('1') || trimmed.startsWith('a)')) {
        return 'quase nunca';
      } else if (trimmed.includes('2') || trimmed.startsWith('b)')) {
        return 'poucas vezes';
      } else if (trimmed.includes('3') || trimmed.startsWith('c)')) {
        return 'às vezes';
      } else if (trimmed.includes('4') || trimmed.startsWith('d)')) {
        return 'bastante vezes';
      } else if (trimmed.includes('5') || trimmed.startsWith('e)')) {
        return 'muitas vezes';
      }

      console.warn(`[Q${questionNumber}] Não foi possível identificar a resposta: "${response}"`);
      return 'às vezes'; // Valor padrão médio para escala de estresse
    }
    
    // Para perguntas 11-26 (Escalas de Ansiedade e Depressão)
    else {
      if (trimmed.includes('nunca') || trimmed.includes('nenhuma vez')) {
        return 'nunca';
      } else if (trimmed.includes('alguns dias') || trimmed.includes('várias vezes') || trimmed.includes('poucas vezes')) {
        return 'alguns dias';
      } else if (trimmed.includes('mais da metade dos dias') || trimmed.includes('maioria dos dias') || trimmed.includes('metade')) {
        return 'mais da metade dos dias';
      } else if (trimmed.includes('quase todos os dias') || trimmed.includes('todos os dias') || trimmed.includes('sempre')) {
        return 'quase todos os dias';
      }

      // Fallback para perguntas 11-26: tenta identificar por números ou letras
      if (trimmed.includes('0') || trimmed.includes('1') || trimmed.startsWith('a)')) {
        return 'nunca';
      } else if (trimmed.includes('1') || trimmed.includes('2') || trimmed.startsWith('b)')) {
        return 'alguns dias';
      } else if (trimmed.includes('2') || trimmed.includes('3') || trimmed.startsWith('c)')) {
        return 'mais da metade dos dias';
      } else if (trimmed.includes('3') || trimmed.includes('4') || trimmed.startsWith('d)')) {
        return 'quase todos os dias';
      }

      console.warn(`[Q${questionNumber}] Não foi possível identificar a resposta: "${response}"`);
      return 'alguns dias'; // Valor padrão baixo para escalas de ansiedade/depressão
    }
  };

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      if (questions.length === 0) {
        // Pega todas as colunas exceto Carimbo de data/hora e Endereço de e-mail
        questions = Object.keys(row).filter((key) => 
          key !== 'Carimbo de data/hora' && 
          key !== 'Endereço de e-mail'
        );
        console.log('Perguntas encontradas:', questions.length);
        console.log('Primeiras 5 perguntas:', questions.slice(0, 5));
      }
      rows.push(row);
    })
    .on('end', async () => {
      console.log(`Total de linhas lidas: ${rows.length}`);
      let processedCount = 0;

      for (const row of rows) {
        const email = row['Endereço de e-mail'];
        const timestamp = row['Carimbo de data/hora'];
        
        // Remove campos não relacionados às perguntas
        delete row['Endereço de e-mail'];
        delete row['Carimbo de data/hora'];

        if (!email) {
          console.warn('Linha sem email encontrada, pulando...');
          continue;
        }

        // Criando responses com os nomes dos campos corretos
        const responses = {};
        let rawDataString = '';

        questions.forEach((question) => {
          const fieldName = fieldMapping[question];
          const answer = row[question] || (fieldName && parseInt(fieldName.replace('q', '')) <= 10 ? "às vezes" : "alguns dias");

          if (fieldName) {
            // Pega o número da pergunta para determinar a escala
            const questionNumber = parseInt(fieldName.replace('q', ''));
            // Converte a resposta para o formato padronizado baseado na escala
            responses[fieldName] = extractResponseValue(answer, questionNumber);
          } else {
            // Se não encontrar mapeamento, tenta criar um baseado na posição
            const questionIndex = questions.indexOf(question) + 1;
            if (questionIndex <= 26) {
              responses[`q${questionIndex}`] = extractResponseValue(answer, questionIndex);
            }
          }

          // Monta o raw_data preservando a resposta completa
          rawDataString += `${question}: "${answer}"\n`;
        });

        // Debug: mostra as primeiras conversões para verificar
        if (processedCount < 3) {
          console.log(`\nExample conversion for ${email}:`);
          console.log('Estresse (q1-q10):');
          Object.keys(responses).filter(k => parseInt(k.replace('q', '')) <= 10).slice(0, 3).forEach(key => {
            console.log(`${key}: ${responses[key]}`);
          });
          console.log('Ansiedade/Depressão (q11-q26):');
          Object.keys(responses).filter(k => parseInt(k.replace('q', '')) > 10).slice(0, 3).forEach(key => {
            console.log(`${key}: ${responses[key]}`);
          });
        }

        // Converte timestamp se existir
        let formTimestamp;
        if (timestamp) {
          try {
            // Tenta vários formatos de data
            let date;
            
            if (timestamp.includes('/')) {
              // Formato: "13/03/2025 06:07:02"
              const [datePart, timePart = "00:00:00"] = timestamp.split(' ');
              const [day, month, year] = datePart.split('/');
              const [hour, minute, second] = timePart.split(':');
              
              date = new Date(
                parseInt(year),
                parseInt(month) - 1, // JavaScript months are 0-indexed
                parseInt(day),
                parseInt(hour || 0),
                parseInt(minute || 0),
                parseInt(second || 0)
              );
            } else {
              // Formato ISO ou outros formatos
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
          title: 'Avaliação Psicológica',
          timestamp: formTimestamp,
          instructor: '/instructors/9Sti3H8AZL2wnTQT23ff',
          raw_data: rawDataString.trim(),
          responses: responses,
          type: 'psychological',
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
      console.log('PROCESSAMENTO CONCLUÍDO - AVALIAÇÃO PSICOLÓGICA');
      console.log('='.repeat(60));
      console.log(`Total de linhas no CSV: ${rows.length}`);
      console.log(`Documentos criados com sucesso: ${processedCount}`);
      console.log(`E-mails não encontrados: ${notFoundEmails.length}`);
      console.log(`Taxa de sucesso: ${((processedCount / rows.length) * 100).toFixed(2)}%`);
      
      if (notFoundEmails.length > 0) {
        console.log('\nE-mails não encontrados:');
        notFoundEmails.forEach(email => console.log(`- ${email}`));
      }
      
      console.log('\nEstrutura das dimensões psicológicas:');
      console.log('- Estresse Percebido (q1-q10): quase nunca | poucas vezes | às vezes | bastante vezes | muitas vezes');
      console.log('- Ansiedade Generalizada (q11-q17): nunca | alguns dias | mais da metade dos dias | quase todos os dias');  
      console.log('- Sintomas Depressivos (q18-q26): nunca | alguns dias | mais da metade dos dias | quase todos os dias');
      
      console.log('\nExemplo de responses salvo:');
      if (rows.length > 0) {
        const sampleRow = rows[0];
        const sampleResponses = {};
        
        // Mostra exemplos de cada escala
        questions.slice(0, 2).forEach((question) => {
          const fieldName = fieldMapping[question];
          if (fieldName) {
            const questionNumber = parseInt(fieldName.replace('q', ''));
            sampleResponses[fieldName] = extractResponseValue(sampleRow[question], questionNumber);
          }
        });
        
        // Adiciona exemplo da escala de ansiedade/depressão
        const anxietyQuestion = questions.find(q => fieldMapping[q] && fieldMapping[q].includes('11'));
        if (anxietyQuestion) {
          const fieldName = fieldMapping[anxietyQuestion];
          sampleResponses[fieldName] = extractResponseValue(sampleRow[anxietyQuestion], 11);
        }
        
        console.log(JSON.stringify(sampleResponses, null, 2));
      }
    });
}

// Executa o processamento
processCSV(filePath).catch(console.error);