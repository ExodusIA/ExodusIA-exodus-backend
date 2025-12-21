const axios = require('axios');

const API_URL = "https://api.zapsterapi.com/v1/wa/messages";
const API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3MjgxNjA1ODMsImlzcyI6InphcHN0ZXJhcGkiLCJzdWIiOiJmNTM3MzIxYS05NDg4LTRjZWItOTcwOC1jZmE2ODkwN2I3NmYiLCJqdGkiOiI2MGUwM2MyMy04YTgwLTRjNTAtOTU1NC02ZWU5ODJjZWRmZjAifQ.LGb9vPKOxN3W9Ke8DxTweEaGFfApKhll5666c62L9RU";

const sendMessage = async (phoneNumber, message, instanceId, buttons = null) => {
  try {
    const headers = {
      Authorization: `Bearer ${API_TOKEN}`,
      'X-Instance-ID': instanceId,
      'Content-Type': 'application/json'
    };

    const body = {
      recipient: phoneNumber,
      text: message,
    };

    // se houver botões, adiciona no corpo da requisição
    if (buttons && buttons.length > 0) {
      body.buttons = buttons;
      body.buttons_mode = "interactive"; // obrigatório para botões
    }

    const response = await axios.post(API_URL, body, { headers });

    console.log('✅ Mensagem enviada com sucesso:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('❌ Erro na API:', error.response.data);
    } else {
      console.error('❌ Erro ao enviar mensagem:', error.message);
    }
  }
};

// 🟢 Exemplo 1: Envio de texto simples
sendMessage('5511975809048', 'Olá, tudo bem?', 'xhnhbs8cy4wxrkkf0h1jc');

// 🟢 Exemplo 2: Envio com botões interativos
sendMessage(
  '5511975809048',
  'Você gosta de pizza?',
  'xhnhbs8cy4wxrkkf0h1jc',
  [
    { label: 'Sim, quero!', type: 'reply' },
    { label: 'Não, obrigado', type: 'reply' }
  ]
);

module.exports = { sendMessage };
