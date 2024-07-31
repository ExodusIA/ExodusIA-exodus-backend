const { db, admin } = require('../firebaseConfig');
const { getProgramLastTaskDay } = require('./programService');
const { getCurrentDay } = require('../utils/currentDay');

const listActiveClientsWithPrograms = async () => {
  try {
    const clientsRef = db.collection("clients").where("active", "==", true);
    const clientsSnapshot = await clientsRef.get();
    const activeClients = [];

    for (const clientDoc of clientsSnapshot.docs) {
      const clientData = clientDoc.data();

      const programsRef = db.collection(`clients/${clientDoc.id}/programs`);
      const programsSnapshot = await programsRef.get();

      const programs = [];
      for (const programDoc of programsSnapshot.docs) {
        const programData = programDoc.data();

        const programId = programData.program.id; // Use a referência do programa
        
        const lastTaskDay = await getProgramLastTaskDay(programId);

        const currentDay = getCurrentDay(programData.startDate);
       
        if (currentDay <= lastTaskDay) {
          programs.push({
            program: programDoc.ref,
            ...programData,
          });
        }        
      }

      if (programs.length > 0) {
        activeClients.push({
          clientId: clientDoc.id,
          ...clientData,
          programs,
        });
      }
    }

    return activeClients;
  } catch (e) {
    console.error("Error listing active clients with programs: ", e);
    throw e;
  }
};

const registerClient = async (req, res) => {
  try {
    const { name, email, phone, businessId, programId, startDate, instructorId, createdAt, groupId } = req.body;

    console.log('Received data:', { name, email, phone, businessId, programId, startDate, instructorId, createdAt, groupId });

    // Validação básica dos dados
    if (!name || !email || !phone || !businessId || !programId || !startDate || !instructorId) {
      console.log('Missing required fields:', { name, email, phone, businessId, programId, startDate, instructorId });
      return res.status(400).send('Missing required fields: name, email, phone, businessId, programId, startDate, instructorId');
    }

    // Extrair o primeiro nome para o apelido
    const nickname = name.split(' ')[0];

    // Verificar se o cliente já existe
    const existingClient = await db.collection('clients').where('email', '==', email).get();
    if (!existingClient.empty) {
      console.log('Client already registered with this email:', email);
      return res.status(400).send('Client already registered with this email');
    }

    // Referência ao documento do negócio
    const businessRef = db.doc(`businesses/${businessId}`);
    const programRef = db.doc(`programs/${programId}`);
    const instructorRef = db.doc(`instructors/${instructorId}`);

    // Referência ao grupo, se fornecido
    let groups = [];
    if (groupId) {
      const groupRef = db.doc(`groups/${groupId}`);
      groups.push(groupRef);
    }

    // Adicionar cliente ao Firestore
    const clientRef = await db.collection('clients').add({
      name,
      email,
      phone,
      nickname,
      business: businessRef,
      active: true,
      createdAt: createdAt || admin.firestore.FieldValue.serverTimestamp(),
      groups
    });

    // Adicionar programa na subcoleção do cliente
    await clientRef.collection('programs').add({
      program: programRef,
      instructor: instructorRef,
      startDate: admin.firestore.Timestamp.fromDate(new Date(startDate))
    });

    console.log('Client registered successfully:', { name, email, phone, businessId, programId, startDate, instructorId, createdAt, groupId });
    return res.status(201).send('Client registered successfully');
  } catch (error) {
    console.error('Error registering client:', error);
    return res.status(500).send('Internal server error');
  }
};

module.exports = { listActiveClientsWithPrograms, registerClient };