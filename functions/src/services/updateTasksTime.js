// Importa a configuração do Firebase Admin
const { db } = require('../firebaseConfig');

// Função para adicionar o campo "time" a todas as tarefas de todos os programas
const addTimeFieldToAllTasks = async () => {
  try {
    // Referência à coleção de programas
    console.log('Iniciando a atualização de todas as tarefas...');
    const programsCollectionRef = db.collection('programs'); // Usando Admin SDK aqui
    const programsSnapshot = await programsCollectionRef.get();

    if (programsSnapshot.empty) {
      console.log("Nenhum programa encontrado.");
      return;
    }

    // Itera sobre todos os programas
    for (const programDoc of programsSnapshot.docs) {
      const programId = programDoc.id;
      
      // Referência à subcoleção 'tasks' dentro de cada programa
      const tasksCollectionRef = db.collection(`programs/${programId}/tasks`);
      const tasksSnapshot = await tasksCollectionRef.get();

      if (tasksSnapshot.empty) {
        console.log(`Nenhuma tarefa encontrada no programa ${programId}`);
        continue;
      }

      // Itera sobre todas as tarefas do programa
      for (const taskDoc of tasksSnapshot.docs) {
        const taskData = taskDoc.data();

        // Verifica se o campo 'time' já existe
        if (!taskData.time) {
          const taskRef = tasksCollectionRef.doc(taskDoc.id);

          // Atualiza a tarefa com o campo 'time' definido para '06:00'
          await taskRef.update({
            time: '06:00',
          });

          console.log(`Tarefa ${taskDoc.id} do programa ${programId} atualizada com o campo 'time' para 06:00`);
        } else {
          console.log(`Tarefa ${taskDoc.id} do programa ${programId} já possui o campo 'time'.`);
        }
      }
    }

    console.log("Todas as tarefas foram atualizadas com sucesso.");
  } catch (error) {
    console.error("Erro ao atualizar o campo 'time' nas tarefas: ", error);
  }
};

// Executa a função
addTimeFieldToAllTasks();
