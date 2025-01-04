const { db } = require('../firebaseConfig'); // Importa a configuração do Firebase Admin

const removeProgramReferenceForAllClients = async (programId) => {
  try {
    // Obter a referência correta do programa com base no ID
    const programReference = db.doc(`programs/${programId}`);

    // Referência à coleção de clientes ativos
    const clientsRef = db.collection('clients');
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

        // Verificar se o campo 'program' corresponde à referência do programa desejado
        if (programData.program.isEqual(programReference)) {
          // Deletar o documento do programa que contém a referência ao programa especificado
          await programsCollection.doc(programDoc.id).delete();
          console.log(`Programa com referência ${programId} removido do cliente ${clientId}.`);
        } else {
          console.log(`Programa ${programDoc.id} do cliente ${clientId} não possui a referência ${programId}.`);
        }
      }
    }

    console.log(`Remoção das referências ao programa ${programId} concluída para todos os clientes.`);
  } catch (error) {
    console.error(`Erro ao remover as referências ao programa ${programId} de todos os clientes:`, error);
  }
};

removeProgramReferenceForAllClients('DRicA813UHdvI3kSL2RT');
