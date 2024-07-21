const { db } = require('./firebaseConfig');

const listActiveClients = async () => {
  try {
    const clientsRef = db.collection("clients");
    const clientsSnapshot = await clientsRef.get();
    const activeClients = [];

    for (const clientDoc of clientsSnapshot.docs) {
      const programsRef = db.collection(`clients/${clientDoc.id}/programs`);
      const programsSnapshot = await programsRef.get();

      if (!programsSnapshot.empty) {
        programsSnapshot.forEach((programDoc) => {
          const programData = programDoc.data();
          activeClients.push({
            clientId: clientDoc.id,
            ...clientDoc.data(),
            program: programData,
          });
        });
      }
    }
    return activeClients;
  } catch (e) {
    console.error("Error listing active clients: ", e);
    throw e; // Re-throw the error to be handled by the caller
  }
};

module.exports = { listActiveClients };
