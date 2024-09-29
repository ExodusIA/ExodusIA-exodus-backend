const xlsx = require('xlsx');
const { db } = require('../firebaseConfig'); // Caminho relativo para firebaseConfig
const admin = require('firebase-admin');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const moment = require('moment-timezone');
const { title } = require('process');

// Função para ler a planilha e registrar clientes
const registerFromSheet = async () => {
  try {
    // Carregar a planilha
    const workbook = xlsx.readFile(path.join(__dirname, '..', '..', 'functions/Relatório.xlsx'));
    const sheetName = 'Transferência de dados'; // Nome da aba relevante
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    for (const row of rows) {
      const { name, email, phone, businessId, groupId, active } = row;

      // Validação básica dos dados
      if (!name || !email || !phone || !businessId) {
        console.log(`Skipping row due to missing required fields: ${JSON.stringify(row)}`);
        continue;
      }

      // Extrair o primeiro nome para o apelido
      const nickname = name.split(' ')[0];

      // Verificar se o cliente já existe
      const existingClient = await db.collection('clients').where('email', '==', email).get();
      if (!existingClient.empty) {
        console.log(`Client already registered with this email: ${email}`);
        continue;
      }

      // Referência ao documento do negócio e grupos
      const businessRef = db.doc(`businesses/${businessId}`);
      const groupRefs = groupId ? groupId.split(',').map(id => db.doc(`groups/${id.trim()}`)) : [];

      // Adicionar cliente ao Firestore
      await db.collection('clients').add({
        name,
        email,
        phone,
        nickname,
        groups: groupRefs,
        business: businessRef,
        active: active === true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Client registered successfully: ${name} (${email})`);
    }
  } catch (error) {
    console.error('Error registering clients from sheet:', error);
  }
};

const registerFormsFromSheet = async (filePath, title) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    const emailsNotFound = [];

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet);

      for (const row of rows) {
        const timestamp = row["Carimbo de data/hora"];
        const email = row["Endereço de e-mail"];

        const clientSnapshot = await db.collection('clients').where('email', '==', email).get();
        if (clientSnapshot.empty) {
          console.log(`Client not found with this email: ${email}`);
          emailsNotFound.push(email);
          continue;
        }

        const clientRef = clientSnapshot.docs[0].ref;

        const responses = Object.keys(row).filter(key => key !== "Carimbo de data/hora" && key !== "Endereço de e-mail")
          .map(key => ({
            question: key,
            answer: row[key].toString()
          }));

        const instructorRef = db.doc(`instructors/9Sti3H8AZL2wnTQT23ff`);

        const parsedTimestamp = excelDateToJSDate(timestamp);

        await clientRef.collection('forms').add({
          title: title,
          timestamp: admin.firestore.Timestamp.fromDate(parsedTimestamp),
          instructor: instructorRef,
          responses
        });

        console.log(`Form ${sheetName} registered successfully for email: ${email}`);
      }
    }

    console.log('Emails not found:', emailsNotFound);
  } catch (error) {
    console.error('Error registering forms from sheet:', error);
  }
};

// Exemplo de uso
const excelDateToJSDate = (serial) => {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);

  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  
  let total_seconds = Math.floor(86400 * fractional_day);
  
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;
  
  const jsDate = new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
  return moment(jsDate).add(1, 'days').add(-3, 'hours').tz('America/Sao_Paulo').toDate(); // Ajusta para o fuso horário de São Paulo e adiciona um dia
};

const deleteFormsSubcollections = async () => {
  try {
    console.log('Starting to delete forms subcollections...');
    
    const clientsSnapshot = await db.collection('clients').get();
    
    if (clientsSnapshot.empty) {
      console.log('No clients found.');
      return;
    }
    
    for (const clientDoc of clientsSnapshot.docs) {
      const clientId = clientDoc.id;
      const formsSnapshot = await clientDoc.ref.collection('forms').get();
      
      if (!formsSnapshot.empty) {
        const batch = db.batch();
        formsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        console.log(`Deleted forms subcollection for client: ${clientId}`);
      } else {
        console.log(`No forms subcollection found for client: ${clientId}`);
      }
    }
    
    console.log('Deletion of forms subcollections completed.');
  } catch (error) {
    console.error('Error deleting forms subcollections:', error);
  }
};

const checkEmailsInSheet = async (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    const emailsNotFound = [];

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet);

      for (const row of rows) {
        const email = row["Endereço de e-mail"];

        const clientSnapshot = await db.collection('clients').where('email', '==', email).get();
        if (clientSnapshot.empty) {
          emailsNotFound.push(email);
        }
      }
    }

    return emailsNotFound;
  } catch (error) {
    console.error('Error checking emails in sheet:', error);
    throw error;
  }
};

// checkEmailsInSheet('functions/Autoanálise do comportamento alimentar (respostas) (1).xlsx')
//   .then(emailsNotFound => {
//     if (emailsNotFound.length > 0) {
//       console.log('Emails not found:', emailsNotFound);
//     } else {
//       console.log('All emails were found.');
//     }
//   })
//   .catch(error => {
//     console.error('An error occurred:', error);
//   });



//deleteFormsSubcollections();
registerFormsFromSheet('functions/Mobilidade.xlsx', 'Mobilidade');
