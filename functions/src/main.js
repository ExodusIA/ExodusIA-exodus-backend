const { listActiveClients } = require('./clientService');
const { getTasksForToday } = require('./programService');
const { sendMessage } = require('./messageService');
const { createPersonalizedMessage } = require('./chatgptService');

const main = async () => {
  try {
    const clients = await listActiveClients();

    for (const client of clients) {
      const { name, phone, program, nickName } = client;
      const { programId, startDate } = program;

      const tasks = await getTasksForToday(programId, startDate);

      if (tasks.length > 0) {
        const personalizedMessage = await createPersonalizedMessage(nickName, tasks);

        await sendMessage(phone.toString(), personalizedMessage, 'Felippe');
      } else {
        console.log(`No tasks for today for client ${name}`);
      }
    }
  } catch (error) {
    console.error('Error in main function:', error);
  }
};

module.exports =  {main};
