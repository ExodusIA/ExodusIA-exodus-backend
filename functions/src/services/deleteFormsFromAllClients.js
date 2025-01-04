const { db } = require('./../firebaseConfig');

const deleteSpecificFormsFromAllClients = async () => {
  try {
    const clientsSnapshot = await db.collection('clients').get();

    if (clientsSnapshot.empty) {
      console.log('Nenhum cliente encontrado na coleção "clients".');
      return;
    }

    const deletePromises = [];

    for (const clientDoc of clientsSnapshot.docs) {
      const formsRef = clientDoc.ref.collection('forms');
      const formsSnapshot = await formsRef.get();

      if (formsSnapshot.empty) {
        console.log(`Nenhum formulário encontrado para o cliente: ${clientDoc.id}`);
        continue;
      }

      for (const formDoc of formsSnapshot.docs) {
        const formData = formDoc.data();
        if (formData.title === "Autoanálise do comportamento alimentar") {
          console.log(`Removendo formulário ${formDoc.id} do cliente ${clientDoc.id} com título: ${formData.title}`);
          deletePromises.push(formsRef.doc(formDoc.id).delete());
        } else {
          console.log(`Mantendo formulário ${formDoc.id} do cliente ${clientDoc.id} com título: ${formData.title}`);
        }
      }
    }

    await Promise.all(deletePromises);
    console.log('Os formulários especificados foram removidos com sucesso!');
  } catch (error) {
    console.error('Erro ao remover formulários:', error);
  }
};

// Chame a função
deleteSpecificFormsFromAllClients();
