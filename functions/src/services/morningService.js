// morningService.js
// Serviço para enviar lembretes de treino às 07:00h
const { listActiveClientsWithPrograms } = require('./clientService');
const { getTasksForToday } = require('./programService');
const { db } = require('../firebaseConfig');
const { sendMessage } = require('./messageService');
const admin = require('firebase-admin');

// Helper function para converter timestamp do Firestore para Date
const safeTimestampToDate = (timestamp, fallbackDate = new Date()) => {
  if (!timestamp) {
    console.warn('⚠️ Timestamp is null or undefined, using fallback date');
    return fallbackDate;
  }
  
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  if (timestamp._seconds !== undefined) {
    const milliseconds = timestamp._seconds * 1000 + Math.floor((timestamp._nanoseconds || 0) / 1000000);
    return new Date(milliseconds);
  }
  
  const parsedDate = new Date(timestamp);
  if (isNaN(parsedDate.getTime())) {
    console.warn('⚠️ Invalid timestamp format, using fallback date:', timestamp);
    return fallbackDate;
  }
  
  return parsedDate;
};

// Função para buscar metas do cliente
const getClientGoals = async (clientId) => {
  try {
    const goalsSnapshot = await db.collection(`clients/${clientId}/goals`)
      .where('completed', '==', false)
      .get();
    
    if (goalsSnapshot.empty) {
      return [];
    }
    
    return goalsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`❌ Erro ao buscar metas do cliente ${clientId}:`, error);
    return [];
  }
};

// Função para calcular datas de lembrete de metas
const calculateGoalReminderDates = (startDate, deadline) => {
  const startTimestamp = safeTimestampToDate(startDate).getTime();
  const deadlineTimestamp = safeTimestampToDate(deadline).getTime();
  
  const totalDuration = deadlineTimestamp - startTimestamp;
  const quarterDuration = totalDuration / 4;
  
  const reminderDates = [];
  for (let i = 1; i <= 3; i++) {
    reminderDates.push(new Date(startTimestamp + (quarterDuration * i)));
  }
  
  return reminderDates;
};

// Função para verificar se deve enviar lembrete de meta hoje
const shouldSendGoalReminderToday = (reminderDates) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return reminderDates.some(date => {
    const reminderDate = new Date(date);
    reminderDate.setHours(0, 0, 0, 0);
    return reminderDate.getTime() === today.getTime();
  });
};

// Função para formatar mensagem de meta
const formatGoalMessage = (goal, progress) => {
  const deadlineDate = safeTimestampToDate(goal.deadline);
  return `🎯 LEMBRETE DE META 🎯\n\nSua meta: ${goal.goal}\nData limite: ${deadlineDate.toLocaleDateString('pt-BR')}\nProgresso: ${progress}% concluído\n\nContinue focado(a)! Você está no caminho certo. 💪`;
};

/**
 * Envia lembretes de treino às 07:00h
 */
const sendScheduledReminders = async () => {
  console.log('🌅 Enviando lembretes de treino às 07:00h...');
  
  try {
    const clients = await listActiveClientsWithPrograms();

    if (!clients || clients.length === 0) {
      console.log('⚠️ Nenhum cliente ativo encontrado.');
      return;
    }

    console.log(`✅ ${clients.length} cliente(s) ativo(s) encontrado(s).`);

    let messageCount = 0;
    const currentHour = new Date().getHours();
    
    // Verificar se está na hora certa (7h)
    if (currentHour !== 7) {
      console.log(`⏰ Não é hora de enviar lembretes. Hora atual: ${currentHour}h`);
      return;
    }

    for (const client of clients) {
      const { id, name, phone, programs, nickname } = client;

      console.log(`📌 Processando cliente: ${name} (${nickname}) - Telefone: ${phone}`);

      // Processar tarefas regulares para às 07:00h
      let tasksFor7AM = [];

      if (programs && programs.length > 0) {
        for (const program of programs) {
          if (!program.startDate || !program.program) {
            console.log(`⚠️ Dados do programa inválidos para ${nickname}.`);
            continue;
          }

          const date = safeTimestampToDate(program.startDate);
          const tasks = await getTasksForToday([{ program: program.program, startDate: date }]);

          // Filtrar apenas tarefas para 07:00h
          const morningTasks = tasks.filter(task => {
            const taskTime = task.time || '07:00';
            return taskTime.trim() === '07:00';
          });

          for (const task of morningTasks) {
            tasksFor7AM.push({
              task: task,
              instructorId: program.instructor?.id || null,
            });
          }
        }
      }

      // Processar metas (lembretes às 09:00h - mas só se for hora certa)
      if (currentHour === 9) {
        const goals = await getClientGoals(id);
        console.log(`📌 ${goals.length} meta(s) ativa(s) encontrada(s) para ${nickname}.`);

        for (const goal of goals) {
          if (!goal.deadline) {
            console.log(`⚠️ Meta sem data limite para ${nickname}: "${goal.goal}"`);
            continue;
          }

          const creationDate = goal.createdAt ? 
            safeTimestampToDate(goal.createdAt) : 
            new Date(Date.now() - 86400000);
          
          const deadlineDate = safeTimestampToDate(goal.deadline);
          const reminderDates = calculateGoalReminderDates(creationDate, deadlineDate);
          
          if (shouldSendGoalReminderToday(reminderDates)) {
            console.log(`🎯 Enviando lembrete de meta para ${nickname}: "${goal.goal}"`);
            
            const totalDuration = deadlineDate.getTime() - creationDate.getTime();
            const elapsed = Date.now() - creationDate.getTime();
            const progress = Math.min(Math.round((elapsed / totalDuration) * 100), 100);
            
            const goalMessage = formatGoalMessage(goal, progress);
            
            // Buscar instanceId do primeiro programa
            const instructorId = programs && programs.length > 0 && programs[0].instructor ? programs[0].instructor.id : null;
            
            if (instructorId) {
              try {
                const instructorDoc = await db.doc(`instructors/${instructorId}`).get();
                if (instructorDoc.exists) {
                  const instructorData = instructorDoc.data();
                  const instanceId = instructorData.instanceId;
                  
                  if (instanceId) {
                    await sendMessage(phone, goalMessage, instanceId);
                    console.log(`✅ Lembrete de meta enviado para ${nickname}`);
                    
                    // Notificar admin
                    await sendMessage('393932699714', `📢 Lembrete de meta enviado para ${nickname}`, 'knei6w7c6lyrv9z5liiqk');
                    messageCount++;
                  }
                }
              } catch (error) {
                console.error(`❌ Erro ao enviar lembrete de meta para ${nickname}:`, error);
              }
            }
          }
        }
      }

      // Enviar tarefas matinais (07:00h)
      if (tasksFor7AM.length > 0 && currentHour === 7) {
        // Buscar dados do instrutor
        const firstInstructorId = tasksFor7AM.find(item => item.instructorId)?.instructorId;
        let instanceId = null;

        if (firstInstructorId) {
          try {
            const instructorDoc = await db.doc(`instructors/${firstInstructorId}`).get();
            if (instructorDoc.exists) {
              const instructorData = instructorDoc.data();
              instanceId = instructorData.instanceId;
            }
          } catch (error) {
            console.error(`❌ Erro ao buscar dados do instrutor ${firstInstructorId}:`, error);
          }
        }

        if (!instanceId) {
          console.log(`❌ Não foi possível encontrar instanceId para ${nickname}`);
          continue;
        }

        // Gerar mensagem com as tarefas
        const tasks = tasksFor7AM.map(item => item.task);
        const taskDetails = tasks.map(task => task.taskDescription).join('\n');

        try {
          await sendMessage(phone, taskDetails, instanceId);
          console.log(`✅ Lembrete matinal enviado para ${nickname}`);
          
          // Notificar admin
          await sendMessage('393932699714', `📢 Lembrete matinal enviado para ${nickname}`, 'knei6w7c6lyrv9z5liiqk');
          messageCount++;
        } catch (error) {
          console.error(`❌ Erro ao enviar lembrete matinal para ${nickname}:`, error);
        }
      }
    }

    console.log(`🚀 Processo de lembretes concluído. Total de mensagens enviadas: ${messageCount}`);
  } catch (error) {
    console.error('❌ Erro ao enviar lembretes agendados:', error);
  }
};

/**
 * Função alternativa que busca todas as tarefas do dia e envia no horário especificado
 */
/*const sendTasksAtSpecificTime = async (targetHour = 7) => {
  console.log(`🕰️ Verificando tarefas para envio às ${targetHour}:00h...`);
  
  try {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    
    // Só executar na hora especificada
    if (currentHour !== targetHour) {
      console.log(`⏰ Não é ${targetHour}:00h. Hora atual: ${currentHour}:00h`);
      return;
    }

    const clients = await listActiveClientsWithPrograms();

    if (!clients || clients.length === 0) {
      console.log('⚠️ Nenhum cliente ativo encontrado.');
      return;
    }

    let messageCount = 0;

    for (const client of clients) {
      const { id, name, phone, programs, nickname } = client;

      if (!programs || programs.length === 0) {
        console.log(`⚠️ Cliente ${nickname} não possui programas ativos.`);
        continue;
      }

      // Buscar tarefas para o horário específico
      let tasksAtTime = [];

      for (const program of programs) {
        if (!program.startDate || !program.program) {
          continue;
        }

        const date = safeTimestampToDate(program.startDate);
        const tasks = await getTasksForToday([{ program: program.program, startDate: date }]);

        const tasksForHour = tasks.filter(task => {
          const taskTime = task.time || '07:00';
          const [taskHour] = taskTime.split(':').map(Number);
          return taskHour === targetHour;
        });

        for (const task of tasksForHour) {
          tasksAtTime.push({
            task: task,
            instructorId: program.instructor?.id || null,
          });
        }
      }

      if (tasksAtTime.length === 0) {
        console.log(`📌 Nenhuma tarefa encontrada para ${nickname} às ${targetHour}:00h`);
        continue;
      }

      // Buscar instanceId do instrutor
      const firstInstructorId = tasksAtTime.find(item => item.instructorId)?.instructorId;
      let instanceId = null;

      if (firstInstructorId) {
        try {
          const instructorDoc = await db.doc(`instructors/${firstInstructorId}`).get();
          if (instructorDoc.exists) {
            instanceId = instructorDoc.data().instanceId;
          }
        } catch (error) {
          console.error(`❌ Erro ao buscar instrutor ${firstInstructorId}:`, error);
        }
      }

      if (!instanceId) {
        console.log(`❌ InstanceId não encontrado para ${nickname}`);
        continue;
      }

      // Gerar e enviar mensagem
      const tasks = tasksAtTime.map(item => item.task);
      const message = tasks.map(task => task.taskDescription).join('\n');

      try {
        await sendMessage(phone, message, instanceId);
        console.log(`✅ Mensagem enviada para ${nickname} às ${targetHour}:00h`);
        
        // Notificar admin
        await sendMessage('393932699714', `📢 Mensagem enviada para ${nickname} às ${targetHour}:00h`, 'knei6w7c6lyrv9z5liiqk');
        messageCount++;
      } catch (error) {
        console.error(`❌ Erro ao enviar mensagem para ${nickname}:`, error);
      }
    }

    console.log(`🚀 ${messageCount} mensagens enviadas às ${targetHour}:00h`);
  } catch (error) {
    console.error(`❌ Erro ao enviar tarefas às ${targetHour}:00h:`, error);
  }
};

/**
 * Limpa lembretes antigos do banco de dados (se ainda usar scheduledReminders) 
 */


const cleanupOldReminders = async () => {
  console.log('🧹 Limpando lembretes antigos...');
  
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const week = admin.firestore.Timestamp.fromDate(weekAgo)
    const oldRemindersSnapshot = await db.collection('scheduledReminders').where('scheduledFor', '<', week).get();
    const oldReminders = oldRemindersSnapshot.docs;
    if (oldReminders.length === 0) {
      console.log('✅ Nenhum lembrete antigo para limpar');
      return;
    }

    const batch = db.batch();
    oldReminders.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✅ ${oldReminders.length} lembretes antigos removidos`);
  } catch (error) {
    console.error('❌ Erro ao limpar lembretes antigos:', error);
  }
};
cleanupOldReminders();

module.exports = { 
  sendScheduledReminders, 
  //sendTasksAtSpecificTime,
  cleanupOldReminders 
};