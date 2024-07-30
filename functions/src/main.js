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
const queue = 'messages-queue'; // Nome da fila criada no Cloud Tasks
const tasksClient = new CloudTasksClient();

const main = async () => {
  try {
    const clients = await listActiveClientsWithPrograms();

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
          program
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
        
        await sendMessage(phone.toString(), personalizedMessage, instructorData.instanceId);
        
        await pause(10000);
      }
    }
  } catch (error) {
    console.error('Error in main function:', error);
  }
};

module.exports = { main };
