const { listActiveClientsWithPrograms } = require('./services/clientService');
const { getTasksForToday } = require('./services/programService');
const { db } = require('./firebaseConfig');
const { CloudTasksClient } = require('@google-cloud/tasks');
const dotenv = require('dotenv');
const { resolve } = require('path');
const { sendMessage } = require('./services/messageService');

dotenv.config({ path: resolve(__dirname, '../.env') });

const project = process.env.FIRE_PROJECT_ID; 
const location = 'us-central1'; 
const tasksClient = new CloudTasksClient();

let globalOffset = 0;

// Helper function to safely convert Firestore timestamp to Date
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
  
  // Try to parse as string or number
  const parsedDate = new Date(timestamp);
  if (isNaN(parsedDate.getTime())) {
    console.warn('⚠️ Invalid timestamp format, using fallback date:', timestamp);
    return fallbackDate;
  }
  
  return parsedDate;
};

// New function to fetch client goals
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

// New function to calculate goal reminder dates
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

// Function to check if a reminder should be sent today
const shouldSendGoalReminderToday = (reminderDates) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return reminderDates.some(date => {
    const reminderDate = new Date(date);
    reminderDate.setHours(0, 0, 0, 0);
    return reminderDate.getTime() === today.getTime();
  });
};

// Function to format goal messages
const formatGoalMessage = (goal, progress) => {
  const deadlineDate = safeTimestampToDate(goal.deadline);
  return `🎯 LEMBRETE DE META 🎯\n\nSua meta: ${goal.goal}\nData limite: ${deadlineDate.toLocaleDateString('pt-BR')}\nProgresso: ${progress}% concluído\n\nContinue focado(a)! Você está no caminho certo. 💪`;
};

const main = async () => {
  try {
    console.log('🔄 Iniciando processo de envio de mensagens...');
    const clients = await listActiveClientsWithPrograms();

    if (!clients || clients.length === 0) {
      console.log('⚠️ Nenhum cliente ativo encontrado.');
      return;
    }

    console.log(`✅ ${clients.length} cliente(s) ativo(s) encontrado(s).`);

    let messageCount = 0;
    for (const client of clients) {
      const { id, name, phone, programs, nickname } = client;

      console.log(`📌 Processando cliente: ${name} (${nickname}) - Telefone: ${phone}`);

      // Process regular tasks
      let tasksByTime = {};

      if (programs && programs.length > 0) {
        for (const program of programs) {
          if (!program.startDate || !program.program) {
            console.log(`⚠️ Dados do programa inválidos para ${nickname}.`);
            continue;
          }

          // Use safe timestamp conversion
          const date = safeTimestampToDate(program.startDate);
          const tasks = await getTasksForToday([{ program: program.program, startDate: date }]);

          console.log(`📌 ${tasks.length} tarefa(s) encontrada(s) para ${nickname}.`);

          for (const task of tasks) {
            const taskTime = task.time || '06:00';
            if (!taskTime.includes(':')) {
              console.log(`⏰ Tempo de tarefa inválido para ${nickname}: ${taskTime}`);
              continue;
            }

            const normalizedTime = taskTime.trim();
            if (!tasksByTime[normalizedTime]) {
              tasksByTime[normalizedTime] = [];
            }

            tasksByTime[normalizedTime].push({
              task: task,
              instructorId: program.instructor?.id || null,
            });
          }
        }
      } else {
        console.log(`⚠️ Cliente ${name} (${nickname}) não possui programas ativos.`);
      }

      // Process goals
      const goals = await getClientGoals(id);
      console.log(`📌 ${goals.length} meta(s) ativa(s) encontrada(s) para ${nickname}.`);

      for (const goal of goals) {
        if (!goal.deadline) {
          console.log(`⚠️ Meta sem data limite para ${nickname}: "${goal.goal}"`);
          continue;
        }

        // Get the creation date (assuming it's stored or we can estimate)
        const creationDate = goal.createdAt ? 
          safeTimestampToDate(goal.createdAt) : 
          new Date(Date.now() - 86400000); // Default to yesterday if not available
        
        const deadlineDate = safeTimestampToDate(goal.deadline);
        
        // Calculate reminder dates (at 1/4, 2/4, and 3/4 of the time period)
        const reminderDates = calculateGoalReminderDates(creationDate, deadlineDate);
        
        // Check if today is a reminder day
        if (shouldSendGoalReminderToday(reminderDates)) {
          console.log(`🎯 Hoje é dia de lembrete de meta para ${nickname}: "${goal.goal}"`);
          
          // Calculate progress percentage based on time elapsed
          const totalDuration = deadlineDate.getTime() - creationDate.getTime();
          const elapsed = Date.now() - creationDate.getTime();
          const progress = Math.min(Math.round((elapsed / totalDuration) * 100), 100);
          
          // Create goal message
          const goalMessage = formatGoalMessage(goal, progress);
          
          // Schedule goal message for 9:00 AM
          const goalTime = '09:00';
          if (!tasksByTime[goalTime]) {
            tasksByTime[goalTime] = [];
          }
          
          // Get the first program's instructor if available, or use a default
          const instructorId = programs && programs.length > 0 && programs[0].instructor ? programs[0].instructor.id : null;
          
          if (instructorId) {
            try {
              const instructorDoc = await db.doc(`instructors/${instructorId}`).get();
              if (!instructorDoc.exists) {
                console.log(`❌ Instrutor não encontrado: ${instructorId}`);
                continue;
              }

              const instructorData = instructorDoc.data();
              const instanceId = instructorData.instanceId;
              
              if (!instanceId) {
                console.log(`❌ instanceId não encontrado para o instrutor: ${instructorId}`);
                continue;
              }
              
              // Schedule the goal message
              const [hours, minutes] = goalTime.split(':').map(Number);
              let scheduledTime = new Date();
              scheduledTime.setHours(scheduledTime.getHours() - 3);
              scheduledTime.setHours(hours, minutes, 0, 0);

              let currentTimeInSaoPaulo = new Date();
              currentTimeInSaoPaulo.setHours(currentTimeInSaoPaulo.getHours() - 3);

              scheduledTime.setSeconds(scheduledTime.getSeconds() + globalOffset);
              const delaySeconds = (scheduledTime.getTime() - currentTimeInSaoPaulo.getTime()) / 1000;

              if (delaySeconds > 0) {
                console.log(`⏳ Agendando mensagem de meta para ${nickname} às ${goalTime}, com delay de ${delaySeconds} segundos...`);
                
                const queue = `queue-${instanceId}`;
                await ensureQueueExists(queue);

                await createTask(phone, goalMessage, instanceId, queue, delaySeconds, name, nickname);
                console.log(`✅ Mensagem de meta agendada para ${nickname} às ${goalTime}`);

                await sendMessage('393932699714', `📢 Mensagem de meta agendada para ${nickname} às ${goalTime}`, 'nl3v0tdckb7zvsdixcryj');

                globalOffset += 45;
                messageCount++;
              } else {
                console.log(`❌ Horário de envio de meta já passou para ${nickname} (${goalTime})`);
                await sendMessage('393932699714', `⚠️ Horário de envio de meta já passou para ${nickname} (${goalTime})`, 'nl3v0tdckb7zvsdixcryj');
              }
            } catch (error) {
              console.error(`❌ Erro ao processar instrutor ${instructorId}:`, error);
            }
          } else {
            console.log(`❌ Não foi possível agendar mensagem de meta para ${nickname}: nenhum instrutor disponível`);
          }
        }
      }

      // Process regular tasks
      for (const time in tasksByTime) {
        const tasksAtTime = tasksByTime[time];
        
        // Skip empty time slots (could happen if we only added goal placeholders)
        if (!tasksAtTime.length || !tasksAtTime[0].task) continue;

        let instructorStyles = {};
        let instructorInstanceIds = {};
        
        for (const { instructorId } of tasksAtTime) {
          if (instructorId && !instructorStyles[instructorId]) {
            try {
              const instructorDoc = await db.doc(`instructors/${instructorId}`).get();
              if (instructorDoc.exists) {
                const instructorData = instructorDoc.data();
                instructorStyles[instructorId] = instructorData.style || '';
                instructorInstanceIds[instructorId] = instructorData.instanceId;
              }
            } catch (error) {
              console.error(`❌ Erro ao buscar dados do instrutor ${instructorId}:`, error);
            }
          }
        }

        const tasks = tasksAtTime.map(item => item.task);
        const firstInstructorId = tasksAtTime.find(item => item.instructorId)?.instructorId;
        const instanceId = firstInstructorId ? instructorInstanceIds[firstInstructorId] : null;

        if (!instanceId) {
          console.log(`❌ Não foi possível encontrar instanceId para ${nickname} às ${time}`);
          continue;
        }

        // Geração da mensagem sem o ChatGPT
        const taskDetails = tasks.map(task => task.taskDescription).join('\n');

        console.log(`✅ Mensagem gerada para ${nickname} às ${time}: "${taskDetails}"`);

        const [hours, minutes] = time.split(':').map(Number);
        let scheduledTime = new Date();
        scheduledTime.setHours(scheduledTime.getHours() - 3);
        scheduledTime.setHours(hours, minutes, 0, 0);

        let currentTimeInSaoPaulo = new Date();
        currentTimeInSaoPaulo.setHours(currentTimeInSaoPaulo.getHours() - 3);

        scheduledTime.setSeconds(scheduledTime.getSeconds() + globalOffset);
        const delaySeconds = (scheduledTime.getTime() - currentTimeInSaoPaulo.getTime()) / 1000;

        if (delaySeconds > 0) {
          console.log(`⏳ Agendando mensagem para ${nickname} às ${time}, com delay de ${delaySeconds} segundos...`);
          
          const queue = `queue-${instanceId}`;
          await ensureQueueExists(queue);

          await createTask(phone, taskDetails, instanceId, queue, delaySeconds, name, nickname);
          console.log(`✅ Mensagem agendada para ${nickname} às ${time}`);

          await sendMessage('393932699714', `📢 Mensagem agendada para ${nickname} às ${time}`, 'nl3v0tdckb7zvsdixcryj');

          globalOffset += 45;
        } else {
          console.log(`❌ Horário de envio já passou para ${nickname} (${time})`);
          await sendMessage('393932699714', `⚠️ Horário de envio já passou para ${nickname} (${time})`, 'nl3v0tdckb7zvsdixcryj');
        }
        messageCount++;
      }
    }

    console.log(`🚀 Processo concluído. Total de mensagens agendadas: ${messageCount}`);
  } catch (error) {
    console.error('❌ Erro na função main:', error);
  }
};

async function createTask(phone, message, instanceId, queue, delaySeconds, name, nickname) {
  try {
    const url = `https://${location}-${project}.cloudfunctions.net/sendMessage`;
    const payload = { phone, message, instanceId, name, nickname };

    console.log(`📤 Criando tarefa no Cloud Tasks para ${nickname}...`);
    const [response] = await tasksClient.createTask({
      parent: tasksClient.queuePath(project, location, queue),
      task: {
        httpRequest: {
          httpMethod: 'POST',
          url,
          body: Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64'),
          headers: { 'Content-Type': 'application/json' },
        },
        scheduleTime: { seconds: Math.floor(Date.now() / 1000) + delaySeconds },
      },
    });

    console.log(`✅ Tarefa criada para ${nickname} na fila ${queue}, envio em ${delaySeconds} segundos.`);
  } catch (error) {
    console.error(`❌ Erro ao criar tarefa para ${nickname}:`, error);
  }
}

async function ensureQueueExists(queue) {
  const parent = tasksClient.locationPath(project, location);
  const queuePath = `${parent}/queues/${queue}`;

  try {
    await tasksClient.getQueue({ name: queuePath });
  } catch (error) {
    if (error.code === 5) {
      try {
        const request = { parent: parent, queue: { name: queuePath } };
        await tasksClient.createQueue(request);
      } catch (createError) {
        console.error(`❌ Erro ao criar fila ${queue}:`, createError);
      }
    } else {
      console.error(`❌ Erro ao verificar fila ${queue}:`, error);
    }
  }
}

module.exports = { main };