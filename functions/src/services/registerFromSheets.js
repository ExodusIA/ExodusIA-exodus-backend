const xlsx = require('xlsx');
const admin = require('firebase-admin');
const path = require('path')
const { db } = require('./../firebaseConfig');

const registerFormsFromSheet = async (filePath, title) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    const emailsNotFound = [];

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet);

      for (const row of rows) {
        const email = row["Endereço de e-mail"];
        if (!email) {
          console.log("Email ausente na linha, pulando...");
          continue;
        }

        const clientRef = await findClientByEmail(email);
        if (!clientRef) {
          console.log(`Cliente não encontrado com este email: ${email}`);
          emailsNotFound.push(email);
          continue;
        }

        const responses = extractResponses(row);
        const parsedTimestamp = parseExcelDate(row["Carimbo de data/hora"]);

        await saveForm(clientRef, title, parsedTimestamp, responses);
        console.log(`Formulário ${sheetName} registrado com sucesso para o email: ${email}`);
      }
    }

    console.log('Emails não encontrados:', emailsNotFound);
  } catch (error) {
    console.error('Erro ao registrar formulários da planilha:', error);
  }
};

const findClientByEmail = async (email) => {
  console.log(`Procurando cliente com email: ${email}`);
  const clientSnapshot = await db.collection('clients').where('email', '==', email).get();
  if (clientSnapshot.empty) {
    console.log("Cliente não encontrado.");
    return null;
  } else {
    console.log("Cliente encontrado.");
    return clientSnapshot.docs[0].ref;
  }
};

const extractResponses = (row) => {
  return Object.keys(row)
    .filter(key => key !== "Carimbo de data/hora" && key !== "Endereço de e-mail")
    .map(key => ({
      question: key,
      answer: row[key] ? row[key].toString() : ""
    }));
};

const parseExcelDate = (excelDate) => {
  const date = new Date((excelDate - (25567 + 1)) * 86400 * 1000);
  console.log("Data convertida:", date);
  return date;
};

const saveForm = async (clientRef, title, timestamp, responses) => {
  const instructorRef = db.doc('instructors/9Sti3H8AZL2wnTQT23ff');
  try {
    await clientRef.collection('forms').add({
      title,
      timestamp: admin.firestore.Timestamp.fromDate(timestamp),
      instructor: instructorRef,
      responses
    });
    console.log("Dados salvos com sucesso no Firestore.");
  } catch (error) {
    console.error("Erro ao salvar dados no Firestore:", error);
  }
};

const filePath = path.resolve(__dirname, '../../alimentar2.xlsx');
console.log("Caminho do arquivo:", filePath);

registerFormsFromSheet(filePath, 'Autoanálise do comportamento alimentar [Antiga]');