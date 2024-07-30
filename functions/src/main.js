const { listActiveClientsWithPrograms } = require('./services/clientService');
const { getTasksForToday } = require('./services/programService');
const { sendMessage } = require('./services/messageService');
const { createPersonalizedMessage } = require('./services/chatgptService');
const { pause } = require('./utils/pause');
const { db } = require('./firebaseConfig');
const { CloudTasksClient } = require('@google-cloud/tasks');
const dotenv = require('dotenv');
const { resolve } = require('path');

dotenv.config({ path: resolve(__dirname, '../.env') });

const project = process.env.FIRE_PROJECT_ID; // Substitua pelo ID do seu projeto
const location = 'us-central1'; // Substitua pela sua região
const tasksClient = new CloudTasksClient();

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

      let tasksByInstructor = {};

      for (const program of programs) {
        const tasks = await getTasksForToday([{ program: program.program, startDate: program.startDate }]);

        for (const task of tasks) {
          const instructorId = program.instructor.id;
          if (!tasksByInstructor[instructorId]) {
            tasksByInstructor[instructorId] = [];
          }
          tasksByInstructor[instructorId].push(task);
        }
      }

      for (const instructorId in tasksByInstructor) {
        const tasks = tasksByInstructor[instructorId];
        const instructorDoc = await db.doc(`instructors/${instructorId}`).get();
        const instructorData = instructorDoc.data();

        const personalizedMessage = await createPersonalizedMessage(name, nickname, tasks, instructorData.style);

        const queue = `queue-${instructorId}`; // Nome da fila específica do professor
        await ensureQueueExists(queue); // Verifica e cria a fila se necessário
        const delaySeconds = 45 * messageCount; // 45 segundos de atraso entre cada mensagem
        await createTask(phone, personalizedMessage, instructorData.instanceId, queue, delaySeconds, name, nickname);
      
        messageCount++; // Incrementa o contador de mensagens
      }
    }
  } catch (error) {
    console.error('Error in main function:', error);
  }
};

async function ensureQueueExists(queue) {
  const parent = tasksClient.locationPath(project, location);
  const request = {
    parent: parent,
    queue: {
      name: `${parent}/queues/${queue}`
    }
  };

  try {
    await tasksClient.createQueue(request);
    console.log(`Queue ${queue} created.`);
  } catch (error) {
    if (error.code === 6) {
      // Queue already exists
      console.log(`Queue ${queue} already exists.`);
    } else {
      throw error;
    }
  }
}

async function createTask(phone, message, instanceId, queue, delaySeconds, name, nickname) {
  const url = `https://${location}-${project}.cloudfunctions.net/sendMessage`; // URL da função HTTP
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
        seconds: delaySeconds + Date.now() / 1000,
      },
    },
  });

  console.log(`Created task ${response.name} in queue ${queue} for ${name} (${nickname}) at ${phone}`);
}

module.exports = { main };