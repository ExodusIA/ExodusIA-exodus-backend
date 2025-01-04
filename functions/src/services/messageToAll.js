const { db } = require('../firebaseConfig');
const { sendMessage } = require('./messageService');

const sendMessageToAllActiveClients = async (message, instanceId) => {
    try {
        console.log("Fetching active clients...");
        const clientsSnapshot = await db.collection('clients').get();
        
        console.log(`Found ${clientsSnapshot.size} total clients`);
        
        let count = 0;
        const errors = [];

        for (const clientDoc of clientsSnapshot.docs) {
            const clientData = clientDoc.data();
            console.log("Client data:", clientData);
            
            if (clientData.active) {
                if (clientData.phoneNumber || clientData.phone) {
                    const phone = clientData.phoneNumber || clientData.phone;
                    try {
                        await sendMessage(phone, message, instanceId);
                        count++;
                        console.log(`Message sent to ${phone}`);
                    } catch (err) {
                        console.error(`Error sending to ${phone}:`, err);
                        errors.push({ phoneNumber: phone, error: err.message });
                    }
                } else {
                    console.log(`Client ${clientData.name || 'unknown'} has no phone number`);
                }
            } else {
                console.log(`Client ${clientData.name || 'unknown'} is not active`);
            }
        }
        
        console.log(`Successfully sent message to ${count} active clients`);
        return { success: true, count, errors };
        
    } catch (error) {
        console.error('Error sending messages:', error);
        return { success: false, error: error.message };
    }
};

sendMessageToAllActiveClients(`Boa noite\n\nEstamos no final do último ciclo e é hora de fazer suas últimas autoavaliações do ano.\n\nSeguem os links:\n\nhttps://forms.gle/DSkk4mWwdUhpGoyE8\nhttps://forms.gle/GGnVDDuyRCKB23zD9\n\nSuas respostas serão essenciais para que os professores possam olhar seu histórico e traçar novos passos futuros.`, "nl3v0tdckb7zvsdixcryj");