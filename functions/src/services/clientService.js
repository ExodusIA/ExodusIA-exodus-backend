const { db } = require('../firebaseConfig');
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

module.exports = { listActiveClientsWithPrograms };
