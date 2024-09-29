const { db, admin } = require('../firebaseConfig'); // Importa a configuração do Firebase Admin

const updateClientProgramsStartDatesToMidnight = async () => {
    try {
      // Referência à coleção de clientes ativos
      const clientsRef = db.collection('clients').where('active', '==', true);
      const clientsSnapshot = await clientsRef.get();
  
      if (clientsSnapshot.empty) {
        console.log('Nenhum cliente ativo encontrado.');
        return;
      }
  
      // Iterar sobre todos os clientes ativos
      for (const clientDoc of clientsSnapshot.docs) {
        const clientId = clientDoc.id;
  
        // Referência à subcoleção 'programs' de cada cliente
        const programsCollection = db.collection(`clients/${clientId}/programs`);
        const programsSnapshot = await programsCollection.get();
  
        if (programsSnapshot.empty) {
          console.log(`Nenhum programa encontrado para o cliente ${clientId}.`);
          continue;
        }
  
        // Iterar sobre todos os programas do cliente
        for (const programDoc of programsSnapshot.docs) {
          const programData = programDoc.data();
  
          // Verificar se o campo 'startDate' existe
          if (programData.startDate) {
            try {
              const startDateTimestamp = programData.startDate;
  
              // Converter para objeto Date
              const milliseconds = startDateTimestamp._seconds * 1000 + Math.floor(startDateTimestamp._nanoseconds / 1000000);
              const startDate = new Date(milliseconds);
  
              startDate.setHours(startDate.getHours() + 3);

  
              // Atualizar o campo 'startDate' no programa
              const programRef = programsCollection.doc(programDoc.id);
              await programRef.update({
                startDate: admin.firestore.Timestamp.fromDate(startDate) // Atualiza o 'startDate' com a nova hora ajustada
              });
  
              console.log(`Programa ${programDoc.id} do cliente ${clientId} atualizado para ${startDate.toISOString()}`);
            } catch (error) {
              console.error(`Erro ao processar o programa ${programDoc.id} do cliente ${clientId}: ${error.message}`);
            }
          } else {
            console.log(`Programa ${programDoc.id} do cliente ${clientId} não possui o campo 'startDate'.`);
          }
        }
      }
  
      console.log('Atualização dos startDate concluída com sucesso.');
    } catch (error) {
      console.error('Erro ao atualizar startDate dos programas dos clientes:', error);
    }
  };
  
  // Executa a função
  updateClientProgramsStartDatesToMidnight();
  
  
  