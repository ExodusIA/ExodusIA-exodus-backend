// main.js

const { listActiveClientsWithPrograms } = require('./services/clientService');
const { getTasksForToday } = require('./services/programService');
const { createPersonalizedMessage } = require('./services/chatgptService');
const { db } = require('./firebaseConfig');
const { CloudTasksClient } = require('@google-cloud/tasks');
const dotenv = require('dotenv');
const { resolve } = require('path');
const { format } = require('date-fns');

dotenv.config({ path: resolve(__dirname, '../.env') });

const project = process.env.FIRE_PROJECT_ID; // Substitua pelo ID do seu projeto
const location = 'us-central1'; // Substitua pela sua região
const tasksClient = new CloudTasksClient();

let globalOffset = 0; // Variável global para garantir intervalo entre clientes

const main = async () => {
  try {
    const clients = await listActiveClientsWithPrograms();
    let messageCount = 0;
    for (const client of clients) {
      const { name, phone, programs, nickname } = client;
      if (!programs || programs.length === 0) {
        console.log(`No active programs found for client ${name}`);
        continue;
      }

      let tasksByTime = {};

      for (const program of programs) {
        const milliseconds = program.startDate._seconds * 1000 + Math.floor(program.startDate._nanoseconds / 1000000);
        const date = new Date(milliseconds);
        const tasks = await getTasksForToday([{ program: program.program, startDate: date }]);

        for (const task of tasks) {
          const taskTime = task.time || '06:00';
          if (!taskTime.includes(':')) {
            console.log(`Invalid task time for ${name} (${nickname}): ${taskTime}`);
            continue;
          }
          const normalizedTime = taskTime.trim();

          if (!tasksByTime[normalizedTime]) {
            tasksByTime[normalizedTime] = [];
          }

          tasksByTime[normalizedTime].push({
            task: task,
            instructorId: program.instructor.id,
          });
        }
      }

      for (const time in tasksByTime) {
        const tasksAtTime = tasksByTime[time];

        // Obter estilos dos instrutores envolvidos
        let instructorStyles = {};
        for (const { instructorId } of tasksAtTime) {
          if (!instructorStyles[instructorId]) {
            const instructorDoc = await db.doc(`instructors/${instructorId}`).get();
            const instructorData = instructorDoc.data();
            instructorStyles[instructorId] = instructorData.style || '';
          }
        }

        // Concatenar os estilos (pode ajustar conforme necessário)
        const combinedStyle = Object.values(instructorStyles).join('\n');

        // Extrair as tarefas
        const tasks = tasksAtTime.map(item => item.task);

        // Gerar mensagem única para todas as tarefas no mesmo horário
        const messageParts = await createPersonalizedMessage(name, nickname, tasks, combinedStyle);

        const [hours, minutes] = time.split(':').map(Number);

        let scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);

        let currentTimeInSaoPaulo = new Date();
        currentTimeInSaoPaulo.setHours(currentTimeInSaoPaulo.getHours() - 3); // Ajuste para o fuso horário de São Paulo

        scheduledTime.setSeconds(scheduledTime.getSeconds() + globalOffset);

        if (scheduledTime > currentTimeInSaoPaulo) {
          let cumulativeDelay = 0;

          for (const messagePart of messageParts) {
            const delaySeconds = ((scheduledTime.getTime() - currentTimeInSaoPaulo.getTime()) / 1000) + cumulativeDelay;

            if (delaySeconds > 0) {
              // Usar o número de telefone para o nome da fila, sanitizado para remover caracteres não numéricos
              const sanitizedPhone = phone.replace(/\D/g, '');
              
              const queue = `default-queue`;
              await ensureQueueExists(queue);

              // Usar o instanceId do primeiro instrutor (pode ajustar conforme necessário)
              const instanceId = 'juromantini';

              await createTask('11987997085', messagePart, instanceId, queue, delaySeconds, name, nickname);
              //await createTask(phone, messagePart, instanceId, queue, delaySeconds, name, nickname);
              console.log(`Parte da mensagem agendada para ${name} (${nickname}) às ${time} com atraso de ${cumulativeDelay} segundos`);

              // Ajustar o atraso entre as mensagens conforme necessário (por exemplo, 10 segundos)
              cumulativeDelay += 10;
            } else {
              console.log(`Erro inesperado ao agendar mensagem: delay negativo`);
            }
          }

          messageCount++;
          globalOffset += cumulativeDelay; // Incrementar o offset global para o próximo envio
        } else {
          console.log(`Horário de envio para ${name} (${nickname}) já passou: ${time}`);
        }
      }
    }
  } catch (error) {
    console.error('Error in main function:', error);
  }
};

async function createTask(phone, message, instanceId, queue, delaySeconds, name, nickname) {
  const url = `https://${location}-${project}.cloudfunctions.net/sendMessage`;
  const payload = JSON.stringify({ phone, message, instanceId, name, nickname });

  const [response] = await tasksClient.createTask({
    parent: tasksClient.queuePath(project, location, queue),
    task: {
      httpRequest: {
        httpMethod: 'POST',
        url,
        body: Buffer.from(payload).toString('base64'),
        headers: {
          'Content-Type': 'application/json',
        },
      },
      scheduleTime: {
        seconds: Math.floor(Date.now() / 1000) + delaySeconds,
      },
    },
  });

  console.log(`Tarefa criada para ${name} (${nickname}) na fila ${queue}, envio em ${delaySeconds} segundos.`);
}

async function ensureQueueExists(queue) {
  const parent = tasksClient.locationPath(project, location);
  const queuePath = `${parent}/queues/${queue}`;

  try {
    // Tentar obter a fila
    await tasksClient.getQueue({ name: queuePath });
    // A fila existe, não precisa criar
    // console.log(`Queue ${queue} already exists.`);
  } catch (error) {
    if (error.code === 5) {
      // Code 5 corresponde a NOT_FOUND
      // A fila não existe, então tentamos criá-la
      try {
        const request = {
          parent: parent,
          queue: {
            name: queuePath,
          },
        };
        await tasksClient.createQueue(request);
        // console.log(`Queue ${queue} created.`);
      } catch (createError) {
        if (createError.code === 6) {
          // Code 6 corresponde a ALREADY_EXISTS
          // A fila foi criada por outra instância paralela, podemos ignorar
        } else if (createError.code === 9) {
          // Code 9 corresponde a FAILED_PRECONDITION
          // A fila foi deletada recentemente e não pode ser recriada imediatamente
          console.error(`Não foi possível criar a fila ${queue} porque ela foi deletada recentemente.`);
          // Podemos optar por usar uma fila alternativa ou lançar um erro
          throw createError;
        } else {
          throw createError;
        }
      }
    } else {
      throw error;
    }
  }
}

module.exports = { main };
