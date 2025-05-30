// morningService.js
// Serviço para enviar lembretes agendados às 07h

const admin = require('firebase-admin');
const { db } = require('../firebaseConfig');
const { sendMessage } = require('./messageService');

/**
 * Envia os lembretes agendados que ainda não foram enviados
 */const sendScheduledReminders = async () => {
  console.log('Sending scheduled workout reminders at 07:00...');
  //setar para enviar somente do dia atual, ignorar os anteriores/dar clear após mandar as mensagens
  
  try {
    // Definir início e fim do dia atual
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const startOfDayTimestamp = admin.firestore.Timestamp.fromDate(startOfDay);
    const endOfDayTimestamp = admin.firestore.Timestamp.fromDate(endOfDay);
    const nowTimestamp = admin.firestore.Timestamp.now();
    
    // Buscar lembretes agendados para hoje que ainda não foram enviados
    const remindersSnapshot = await db.collection('scheduledReminders')
      .where('sent', '==', false)
      .where('scheduledFor', '>=', startOfDayTimestamp)
      .where('scheduledFor', '<=', endOfDayTimestamp)
      .where('scheduledFor', '<=', nowTimestamp)
      .get();
         
    console.log(`Encontrados ${remindersSnapshot.docs.length} lembretes para enviar hoje`);
         
    for (const reminderDoc of remindersSnapshot.docs) {
      const reminderData = reminderDoc.data();
             
      try {
        // Enviar mensagem
        await sendMessage(
          reminderData.clientPhone.toString(),
          reminderData.message,
          process.env.WHATSAPP_INSTANCE_ID || 'nl3v0tdckb7zvsdixcryj'
        );
                 
        // Marcar como enviado
        await reminderDoc.ref.update({
          sent: true,
          sentAt: admin.firestore.Timestamp.now()
        });
                 
        console.log(`Lembrete enviado para ${reminderData.clientName} (${reminderData.clientPhone})`);
      } catch (error) {
        console.error(`Erro ao enviar lembrete para ${reminderData.clientName}:`, error);
      }
    }
    
    // Limpar lembretes antigos (anteriores ao dia atual)
    const oldRemindersSnapshot = await db.collection('scheduledReminders')
      .where('scheduledFor', '<', startOfDayTimestamp)
      .get();
    
    if (!oldRemindersSnapshot.empty) {
      console.log(`Limpando ${oldRemindersSnapshot.docs.length} lembretes antigos...`);
      
      const batch = db.batch();
      oldRemindersSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log('Lembretes antigos removidos com sucesso');
    }
         
    console.log('Scheduled reminders sent successfully');
  } catch (error) {
    console.error('Erro ao enviar lembretes agendados:', error);
  }
};

/**
 * Limpa lembretes antigos do banco de dados
 */
const cleanupOldReminders = async () => {
  console.log('Cleaning up old reminders...');
  
  try {
    // Deletar lembretes mais antigos que 7 dias
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oldRemindersSnapshot = await db.collection('scheduledReminders')
      .where('createdAt', '<', admin.firestore.Timestamp.fromDate(weekAgo))
      .get();
    
    const batch = db.batch();
    
    oldRemindersSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`Deleted ${oldRemindersSnapshot.docs.length} old reminders`);
  } catch (error) {
    console.error('Erro ao limpar lembretes antigos:', error);
  }
};
sendScheduledReminders();
cleanupOldReminders();
module.exports = { sendScheduledReminders, cleanupOldReminders };