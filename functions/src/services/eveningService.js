// eveningService.js
// Serviço para verificar e notificar treinos não completados às 22h

const admin = require('firebase-admin');
const { sendMessage } = require('./messageService');

// Lista dos 5 alunos específicos que receberão lembretes
const TARGETED_CLIENTS = [
  {
    id: '8V2OMVHBUtbcoWT1X0mX',
    name: 'Daniela Luque de Souza Oliveira',
    nickname: 'Dani',
    //phone: '5511949592887'//era 7
  },
  {
    id: 'gLv34RwQYF0PokQqqbDQ',
    name: 'Veronica Cassavia Diogo', 
    nickname: 'Ve',
    //phone: '5511964732934'//era 4
  },
  {
    id: 'Hma8i0TKQpETdHRTAxx0',
    name: 'Beatriz Cury Romantini',
    nickname: 'bea', 
    //phone: '5511983344333'//era 3
  },
  {
    id: 's1hxlXJqIrl1bT88uBa8',
    name: 'Mauricio Fernandes dos Santos',
    nickname: 'Mau',
    //phone: '5511983352277'//era 7
  },
  {
    id: 'R2osDt8jJTYW4mZkxUsy',
    name: 'Ailton Wang',
    nickname: 'Ailton',
    //phone: '5511983596001'//era 1
  },
  {
    id: 'LTCaEG9TzVCfBUAr0qcC',
    name: 'Luciana Meinerz',
    nickname: 'Lu',
    //phone: '5511986384745'//era 5
  } 
];

/**
 */
const checkIncompleteWorkouts = async () => {
  console.log('Checking incomplete workouts at 22:00 for targeted clients...');
  
  const results = {
    processed: 0,
    remindersSent: 0,
    errors: 0,
    clientsAlreadyCompleted: 0,
    inactiveClients: 0
  };
  
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    console.log(`Data de verificação: ${today}`);
    
    // Iterar apenas pelos clientes específicos
    for (const targetClient of TARGETED_CLIENTS) {
      console.log(`Verificando cliente: ${targetClient.name} (${targetClient.id})`);
      results.processed++;
      
      try {
        // Verificar se o cliente existe e está ativo no Firestore
        const clientDoc = await admin.firestore()
          .collection('clients')
          .doc(targetClient.id)
          .get();
        
        if (!clientDoc.exists) {
          console.log(`⚠️ Cliente ${targetClient.id} não encontrado no banco`);
          results.errors++;
          continue;
        }
        
        const clientData = clientDoc.data();
        
        // Verificar se o cliente está ativo
        if (!clientData.active) {
          console.log(`ℹ️ Cliente ${targetClient.name} está inativo`);
          results.inactiveClients++;
          continue;
        }
        
        // Buscar o status do treino de hoje
        const workoutStatusRef = admin.firestore()
          .collection('clients')
          .doc(targetClient.id)
          .collection('workoutStatus')
          .doc(today);
        
        const workoutStatusDoc = await workoutStatusRef.get();
        
        if (workoutStatusDoc.exists) {
          const workoutData = workoutStatusDoc.data();
          
          // Verificar se o treino não foi completado
          if (!workoutData.completed) {
            console.log(`❌ Cliente ${targetClient.name} não completou o treino hoje`);
            
            // Verificar se já foi enviado um lembrete hoje para evitar duplicatas
            if (workoutData.reminderSent) {
              console.log(`ℹ️ Lembrete já enviado para ${targetClient.name} hoje`);
              continue;
            }
            

            const eveningMessage = `Oi ${targetClient.nickname}! 😊\n\nNotei que você não treinou hoje. Tudo bem? 🤔\n\nLembre-se que a constância faz toda a diferença! 💪\n\nAmanhã é um novo dia para retomar! 🌅`;
            
            const messageResult = await sendMessage(
              targetClient.phone,
              eveningMessage,
              process.env.WHATSAPP_INSTANCE_ID || 'knei6w7c6lyrv9z5liiqk'
            );
            
            if (messageResult.success) {
              // Marcar que o lembrete foi enviado
              await workoutStatusRef.update({
                reminderSent: true,
                reminderSentAt: admin.firestore.Timestamp.now()
              });
              
              console.log(`✅ Mensagem de aviso enviada para ${targetClient.name}`);
              results.remindersSent++;
              
              // Agendar mensagem para o próximo dia
              await scheduleWorkoutReminder(targetClient);
            } else {
              console.log(`❌ Falha ao enviar mensagem para ${targetClient.name}`);
              results.errors++;
            }
          } else {
            console.log(`✅ Cliente ${targetClient.name} já completou o treino hoje`);
            results.clientsAlreadyCompleted++;
          }
        } else {
          console.log(`⚠️ Status de treino não encontrado para cliente ${targetClient.name}, criando...`);
          
          // Criar documento de status do treino
          await workoutStatusRef.set({
            completed: false,
            date: today,
            createdAt: admin.firestore.Timestamp.now(),
            reminderSent: false
          });
          
          // Enviar mensagem mesmo se não há registro de treino
          const eveningMessage = `Oi ${targetClient.nickname}! 😊\n\nNotei que você não treinou hoje. Tudo bem? 🤔\n\nLembre-se que a constância faz toda a diferença! 💪\n\nAmanhã é um novo dia para retomar! 🌅`;
          
          const messageResult = await sendMessage(
            targetClient.phone,
            eveningMessage,
            process.env.WHATSAPP_INSTANCE_ID || 'knei6w7c6lyrv9z5liiqk'
          );
          
          if (messageResult.success) {
            // Marcar que o lembrete foi enviado
            await workoutStatusRef.update({
              reminderSent: true,
              reminderSentAt: admin.firestore.Timestamp.now()
            });
            
            console.log(`✅ Mensagem de aviso enviada para ${targetClient.name} (novo registro)`);
            results.remindersSent++;
            
            // Agendar lembrete para o próximo dia
            await scheduleWorkoutReminder(targetClient);
          } else {
            console.log(`❌ Falha ao enviar mensagem para ${targetClient.name} (novo registro)`);
            results.errors++;
          }
        }
        
      } catch (clientError) {
        console.error(`❌ Erro ao processar cliente ${targetClient.name}:`, clientError);
        results.errors++;
        continue; // Continua com o próximo cliente
      }
    }
    
    // Log do resumo final
    console.log('📊 RESUMO DA EXECUÇÃO:');
    console.log(`   Clientes processados: ${results.processed}`);
    console.log(`   Lembretes enviados: ${results.remindersSent}`);
    console.log(`   Clientes que já treinaram: ${results.clientsAlreadyCompleted}`);
    console.log(`   Clientes inativos: ${results.inactiveClients}`);
    console.log(`   Erros: ${results.errors}`);
    console.log('✅ Incomplete workout check completed for targeted clients');
    
    return results;
  } catch (error) {
    console.error('❌ Erro geral ao verificar treinos incompletos:', error);
    throw error;
  }
};

/**
 * Agenda um lembrete de treino para o próximo dia
 * @param {object} targetClient - Dados do cliente específico
 */
const scheduleWorkoutReminder = async (targetClient) => {
  try {
    // Verificar se já existe um lembrete agendado para amanhã
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = tomorrow.toISOString().split('T')[0];
    
    const existingReminder = await admin.firestore()
      .collection('scheduledReminders')
      .where('clientId', '==', targetClient.id)
      .where('type', '==', 'workout_reminder')
      .where('sent', '==', false)
      .limit(1)
      .get();
    
    if (!existingReminder.empty) {
      console.log(`ℹ️ Lembrete já agendado para cliente ${targetClient.name}`);
      return;
    }
    
    // Criar documento na coleção de lembretes agendados
    const reminderRef = admin.firestore().collection('scheduledReminders').doc();
    
    // Agendar para as 07:00 do próximo dia
    const tomorrow7AM = new Date();
    tomorrow7AM.setDate(tomorrow7AM.getDate() + 1);
    tomorrow7AM.setHours(7, 0, 0, 0);
    
    await reminderRef.set({
      clientId: targetClient.id,
      clientName: targetClient.name,
      clientNickname: targetClient.nickname,
      clientPhone: targetClient.phone,
      type: 'workout_reminder',
      scheduledFor: admin.firestore.Timestamp.fromDate(tomorrow7AM),
      targetDate: tomorrowDateStr,
      message: `Bom dia, ${targetClient.nickname}! ☀️\n\nHoje é um novo dia para investir em você! 💪\n\nSeu treino está te esperando. Vamos nessa? 🚀\n\nLembre-se: cada dia é uma nova oportunidade de se superar! 🎯`,
      sent: false,
      createdAt: admin.firestore.Timestamp.now()
    });
    
    console.log(`📅 Lembrete agendado para cliente ${targetClient.name} às 07:00 de ${tomorrowDateStr}`);
  } catch (error) {
    console.error(`❌ Erro ao agendar lembrete para cliente ${targetClient.name}:`, error);
  }
};

/**
 * Verifica se um cliente específico deve receber lembretes
 * @param {string} clientId - ID do cliente
 * @returns {boolean} - True se o cliente está na lista de alvos
 */
const isTargetedClient = (clientId) => {
  return TARGETED_CLIENTS.some(client => client.id === clientId);
};

/**
 * Função auxiliar para adicionar um novo cliente à lista
 * @param {object} newClient - Novo cliente a ser adicionado
 */
const addTargetedClient = (newClient) => {
  // Validar campos obrigatórios
  if (!newClient.id || !newClient.name || !newClient.nickname || !newClient.phone) {
    console.error('❌ Campos obrigatórios ausentes para adicionar cliente');
    return false;
  }
  
  // Verificar se já existe
  if (TARGETED_CLIENTS.some(client => client.id === newClient.id)) {
    console.log(`ℹ️ Cliente ${newClient.name} já está na lista`);
    return false;
  }
  
  if (TARGETED_CLIENTS.length < 5) {
    TARGETED_CLIENTS.push(newClient);
    console.log(`✅ Cliente ${newClient.name} adicionado à lista de clientes alvo`);
    return true;
  } else {
    console.log('⚠️ Lista de clientes alvo já está cheia (máximo 5)');
    return false;
  }
};

/**
 * Função auxiliar para remover um cliente da lista
 * @param {string} clientId - ID do cliente a ser removido
 */
const removeTargetedClient = (clientId) => {
  const index = TARGETED_CLIENTS.findIndex(client => client.id === clientId);
  if (index !== -1) {
    const removedClient = TARGETED_CLIENTS.splice(index, 1)[0];
    console.log(`✅ Cliente ${removedClient.name} removido da lista de clientes alvo`);
    return true;
  } else {
    console.log(`⚠️ Cliente com ID ${clientId} não encontrado na lista`);
    return false;
  }
};

/**
 * Retorna a lista atual de clientes alvo
 * @returns {Array} - Lista dos clientes alvo
 */
const getTargetedClients = () => {
  return [...TARGETED_CLIENTS]; // Retorna uma cópia para evitar modificações acidentais
};

module.exports = { 
  checkIncompleteWorkouts,
  addTargetedClient,
  removeTargetedClient,
  getTargetedClients,
  isTargetedClient,
  TARGETED_CLIENTS 
};