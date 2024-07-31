const xlsx = require('xlsx');
const { db } = require('./firebaseConfig');
const admin = require('firebase-admin');
const path = require('path');

// Função para ler a planilha e registrar clientes
const registerFromSheet = async () => {
  try {
    // Carregar a planilha
    const workbook = xlsx.readFile(path.join(__dirname, '..', '..', 'Desafios Mais Músculos (respostas).xlsx'));
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    for (const row of rows) {
      const { name, email, phone, businessId, programId, startDate, instructorId } = row;

      // Validação básica dos dados
      if (!name || !email || !phone || !businessId || !programId || !startDate || !instructorId) {
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

      // Referência ao documento do negócio
      const businessRef = db.doc(`businesses/${businessId}`);
      const programRef = db.doc(`programs/${programId}`);
      const instructorRef = db.doc(`instructors/${instructorId}`);

      // Adicionar cliente ao Firestore
      const clientRef = await db.collection('clients').add({
        name,
        email,
        phone,
        nickname,
        groups: [],
        business: businessRef,
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Adicionar programa na subcoleção do cliente
      await clientRef.collection('programs').add({
        program: programRef,
        instructor: instructorRef,
        startDate: admin.firestore.Timestamp.fromDate(new Date(startDate))
      });

      console.log(`Client registered successfully: ${name} (${email})`);
    }
  } catch (error) {
    console.error('Error registering clients from sheet:', error);
  }
};

registerFromSheet();
