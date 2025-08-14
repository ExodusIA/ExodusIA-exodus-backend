const axios = require('axios');

const sendMessage = async (phoneNumber, message, instanceId) => {
  try {    
    const url = "https://api.zapsterapi.com/v1/wa/messages";

    const options = {
      headers: {
        Authorization: 'Bearer ' + "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3MjgxNjA1ODMsImlzcyI6InphcHN0ZXJhcGkiLCJzdWIiOiJmNTM3MzIxYS05NDg4LTRjZWItOTcwOC1jZmE2ODkwN2I3NmYiLCJqdGkiOiI2MGUwM2MyMy04YTgwLTRjNTAtOTU1NC02ZWU5ODJjZWRmZjAifQ.LGb9vPKOxN3W9Ke8DxTweEaGFfApKhll5666c62L9RU",
        'X-Instance-ID': instanceId,
        'Content-Type': 'application/json'
      }
    };

    const body = {
      instance_id: instanceId,
      text: message,
      recipient: phoneNumber,
    };

    const response = await axios.post(url, body, options);
    console.log('Mensagem enviada com sucesso:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else {
      console.error('Erro ao enviar a mensagem:', error.message);
    }
  }
};

//sendMessage('393932699714', '123', 'knei6w7c6lyrv9z5liiqk')

module.exports = { sendMessage };