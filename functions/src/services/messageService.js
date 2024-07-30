const axios = require('axios');

const sendMessage = async (phoneNumber, message, instanceId) => {
  try {    
    const url = `${process.env.EVOLUTION_API_URL}/message/sendText/${instanceId}`;
    const payload = {
      number: phoneNumber,
      textMessage: {
        text: message
      },
      instanceId
    };
    const headers = {      
      "apikey": process.env.EVOLUTION_API_KEY
    };

    const response = await axios.post(url, payload, { headers });
  } catch (error) {
    if (error.response) {
      console.error('Response data:', error.response.data.response.message);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
  }
};

module.exports = { sendMessage };
