// eveningService.js
// Serviço para verificar e notificar treinos não completados às 22h

const admin = require('firebase-admin');
const { sendMessage } = require('./messageService');

/**
 * Verifica treinos não completados e envia lembretes para os clientes
 */
const checkIncompleteWorkouts = async () => {
  console.log('Checking incomplete workouts at 22:00...');
     
  try {
    // Buscar apenas clientes ativos
    const clientsSnapshot = await admin.firestore()
      .collection('clients')
      .where('active', '==', true)
      .get();
         
    for (const clientDoc of clientsSnapshot.docs) {
      const clientId = clientDoc.id;
      const clientData = clientDoc.data();
             
      // Verificar se o cliente tem telefone e outras informações necessárias
      if (!clientData.phone) {
        console.log(`Cliente ${clientId} não tem telefone cadastrado`);
        continue;
      }
             
      // Buscar o status do treino de hoje
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const workoutStatusRef = admin.firestore()
        .collection('clients')
        .doc(clientId)
        .collection('workoutStatus')
        .doc(today);
             
      const workoutStatusDoc = await workoutStatusRef.get();
             
      if (workoutStatusDoc.exists) {
        const workoutData = workoutStatusDoc.data();
                 
        // Verificar se o treino não foi completado
        if (!workoutData.completed) {
          console.log(`Cliente ${clientData.name} (${clientId}) não completou o treino hoje`);
                     
          // Enviar mensagem de aviso às 22h
          const eveningMessage = `Oi ${clientData.name}!Não treinou hoje`;
                     
          await sendMessage(
            '393932699714',
            eveningMessage, 
            process.env.WHATSAPP_INSTANCE_ID || 'nl3v0tdckb7zvsdixcryj'
          );
                     
          // Agendar mensagem para o próximo dia
          await scheduleWorkoutReminder();
        }
      } else {
        console.log(`Status de treino não encontrado para cliente ${clientId}, criando...`);
        // Criar documento de status do treino
        await workoutStatusRef.set({
          completed: false,
          date: today,
          createdAt: admin.firestore.Timestamp.now(),
          reminderSent: true
        });
                 
        // Agendar lembrete para o próximo dia
        await scheduleWorkoutReminder();
      }
    }
         
    console.log('Incomplete workout check completed');
  } catch (error) {
    console.error('Erro ao verificar treinos incompletos:', error);
  }
};

/**
 * Agenda um lembrete de treino para o próximo dia
 * @param {string} clientId - ID do cliente
 * @param {object} clientData - Dados do cliente
 */
const scheduleWorkoutReminder = async () => {
  try {
    // Definir cliente específico dentro da função
    const targetClient = {
      id: 'ldAGPRJpESdlK9OVzQ7o', // Substitua pelo ID real
      name: 'mulheres que correm ',
      nickname: 'sd',
      //phone: '393932699714' // Substitua pelo telefone real
    };
    
    // Criar documento na coleção de lembretes agendados
    const reminderRef = admin.firestore().collection('scheduledReminders').doc();
        //setar somente para alunos com a tag ativo == true
        //setar somente para o outro dias as 07h
    await reminderRef.set({
      clientId: targetClient.id,
      clientName: targetClient.name,
      clientPhone: targetClient.phone,
      type: 'workout_reminder',
      scheduledFor: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 8 * 60 * 60 * 1000) // Próximo dia
      ),
      message: `Bom dia, ${targetClient.nickname}! ☀️\n\nHoje é um novo dia para investir em você! 💪\n\nSeu treino está te esperando. Vamos nessa? 🚀\n\nLembre-se: cada dia é uma nova oportunidade de se superar! 🎯`,
      sent: false,
      createdAt: admin.firestore.Timestamp.now()
    });
        
    console.log(`Lembrete agendado para cliente ${targetClient.name} (${targetClient.id})`);
  } catch (error) {
    console.error(`Erro ao agendar lembrete para cliente ${targetClient.id}:`, error);
  }
};
module.exports = { checkIncompleteWorkouts };