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

        // Verifique se programData.program está definido
        if (!programData.program || !programData.program.id) {
          console.error("Program data or program ID is missing for client:", clientDoc.id);
          continue; // Pula esta iteração se o programId estiver indefinido
        }
      
        const programId = programData.program.id;
        const lastTaskDay = await getProgramLastTaskDay(programId);
        
        const milliseconds = programData.startDate._seconds * 1000 + Math.floor(programData.startDate._nanoseconds / 1000000);
        const date = new Date(milliseconds);

        const currentDay = getCurrentDay(date);
        
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
    const { name, email, phone, businessId, programId, startDate, instructorId, createdAt, groupId, nickname } = req.body;

    console.log('Received data:', { name, email, phone, businessId, programId, startDate, instructorId, createdAt, groupId, nickname });

    // Validação básica dos dados
    if (!name || !email || !phone || !businessId || !programId || !startDate || !instructorId) {
      console.log('Missing required fields:', { name, email, phone, businessId, programId, startDate, instructorId });
      return res.status(400).send('Missing required fields: name, email, phone, businessId, programId, startDate, instructorId');
    }

    // Verificar se o cliente já existe
    const existingClientQuery = await db.collection('clients').where('email', '==', email).get();
    let clientRef;

    if (!existingClientQuery.empty) {
      // Cliente já existe, usar a referência existente
      clientRef = existingClientQuery.docs[0].ref;
      console.log('Client already registered, adding program:', email);
    } else {
      // Cliente não existe, adicionar um novo cliente
      const businessRef = db.doc(`businesses/${businessId}`);
      let groups = [];
      if (groupId) {
        const groupRef = db.doc(`groups/${groupId}`);
        groups.push(groupRef);
      }

      clientRef = await db.collection('clients').add({
        name,
        email,
        phone,
        nickname, // Adicionar o campo 'nickname' ao registro do cliente
        business: businessRef,
        active: true,
        createdAt: createdAt || admin.firestore.FieldValue.serverTimestamp(),
        groups
      });

      console.log('Client registered successfully:', { name, email, phone, businessId });
    }

    // Referências ao programa e instrutor
    const programRef = db.doc(`programs/${programId}`);
    const instructorRef = db.doc(`instructors/${instructorId}`);

    // Adicionar programa na subcoleção do cliente
    await clientRef.collection('programs').add({
      program: programRef,
      instructor: instructorRef,
      startDate: admin.firestore.Timestamp.fromDate(new Date(startDate))
    });

    console.log('Program added successfully for client:', email);
    return res.status(201).send('Client registered and program added successfully');
  } catch (error) {
    console.error('Error registering client or adding program:', error);
    return res.status(500).send('Internal server error');
  }
};

module.exports = { listActiveClientsWithPrograms, registerClient };