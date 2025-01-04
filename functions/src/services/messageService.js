const axios = require('axios');

const sendMessage = async (phoneNumber, message, instanceId) => {
  try {    
    const url = process.env.ZAPSTER_URL;

    const options = {
      headers: {
        Authorization: 'Bearer ' + process.env.ZAPSTER_TOKEN,
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

//sendMessage('11987997085', '123', 'nl3v0tdckb7zvsdixcryj')

module.exports = { sendMessage };
