const functions = require('firebase-functions');
const { main } = require('./src/main');
const dotenv = require('dotenv');
const { resolve } = require('path');

// Carregar variáveis de ambiente do arquivo .env
dotenv.config({ path: resolve(__dirname, '.env') });

exports.dailyMessageScheduler = functions.pubsub.schedule('every day 06:00').timeZone('America/Sao_Paulo').onRun(async (context) => {
  console.log('Scheduled function is running...');
  await main();
  console.log('Scheduled function ran successfully.');
});
