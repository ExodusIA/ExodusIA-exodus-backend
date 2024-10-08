const functions = require('firebase-functions');
const { main } = require('./src/main');
const dotenv = require('dotenv');
const { resolve } = require('path');
const { sendMessage } = require('./src/services/messageService');
const { registerClient } = require('./src/services/clientService');

// Carregar variáveis de ambiente do arquivo .env
dotenv.config({ path: resolve(__dirname, '.env') });

// Agendar a função principal para executar diariamente às 06:00 no fuso horário de São Paulo
exports.dailyMessageScheduler = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 540,
  })
  .pubsub.schedule('every day 05:00')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    const start = Date.now();
    console.log('Scheduled function is running...');
    
    //await main();
    
    const end = Date.now();
    const executionTime = (end - start) / 1000;
    console.log(`Scheduled function ran successfully in ${executionTime} seconds.`);
});


// Função HTTP para processar as mensagens enfileiradas
exports.sendMessage = functions.https.onRequest(async (req, res) => {
  const { phone, message, instanceId, name, nickname } = req.body;
  try {
    await sendMessage(phone.toString(), message, instanceId);
    console.log(`Message sent to ${name} (${nickname}) at ${phone}`);
    res.status(200).send('Mensagem enviada.');
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).send('Erro ao enviar mensagem.');
  }
});

// Função HTTP para registrar novos clientes
exports.registerClient = functions.https.onRequest(registerClient);
