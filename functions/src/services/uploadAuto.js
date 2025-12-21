const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');
const { db } = require('../firebaseConfig'); // Configuração do Firebase Admin

const filePath = 'C:/Users/juanm/Documents/GitHub/ExodusIA-exodus-backend/functions/Estilo-de-vida.csv';

async function processCSV(filePath) {
  console.log(`Lendo arquivo CSV: ${filePath}`);
  const rows = [];
  const notFoundEmails = [];
  let questions = [];

  // Mapeamento das perguntas para os campos do responses
  const fieldMapping = {
    "1. Voce tem tido contato com a natureza atualmente?": "contato_com_a_natureza",
    "2. Quanto você vive no agora, focado no momento presente?": "viver_no_agora",
    "3. Voce tem convivido em sociedade? Como anda sua vida social?": "senso_de_comunidade",
    "4. Tem desenvolvido seu autoconhecimento?": "autoconhecimento",
    "5. Voce tem uma vida equilibrada?": "viver_em_equilibrio",
    "6. Voce pratica a gentileza com os outros?": "generosidade",
    "8. Voce tem se alimentado com qualidade?": "comer_com_qualidade",
    "9. Voce sente que tem autonomia sobre seu corpo?": "autonomia_do_corpo"
  };

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      if (questions.length === 0) {
        questions = Object.keys(row).filter((key) => key !== 'Email Address' && key !== 'Timestamp');
      }
      rows.push(row);
    })
    .on('end', async () => {
      console.log(`Total de linhas lidas: ${rows.length}`);
      let processedCount = 0;

      for (const row of rows) {
        const email = row['Email Address'];
        delete row['Email Address'];
        delete row['Timestamp'];

        // Criando responses com os nomes dos campos corretos
        const responses = {};
        let rawDataString = '';

        questions.forEach((question) => {
          const fieldName = fieldMapping[question];
          const answer = row[question] || "0"; // Garante que há um valor

          if (fieldName) {
            responses[fieldName] = Number(answer); // Salva no responses como número
          }

          rawDataString += `${question}: "${answer}"\n`; // Monta o raw_data como string
        });

        const formData = {
          title: 'Autoavaliação de estilo de vida',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          instructor: '/instructors/9Sti3H8AZL2wnTQT23ff',
          raw_data: rawDataString.trim(), // Remove espaços extras no final
          responses: responses,
          type: 'roda_filosofia',
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
          console.log(`Documento criado com sucesso para o cliente: ${clientId}`);
        } catch (error) {
          console.error(`Erro ao processar o e-mail ${email}:`, error);
        }
      }

      console.log(`Processamento concluído. Total de documentos criados: ${processedCount}`);
      console.log('E-mails não encontrados:', notFoundEmails);
    });
}

processCSV(filePath);
