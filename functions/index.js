// index.js (atualizado)
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { main } = require('./src/main');
const dotenv = require('dotenv');
const { resolve } = require('path');
const { sendMessage } = require('./src/services/messageService');
const { registerClient } = require('./src/services/clientService');
const { checkIncompleteWorkouts } = require('./src/services/eveningService');
const { sendScheduledReminders, cleanupOldReminders } = require('./src/services/morningService');

// Configuração do CORS mais robusta
const cors = require("cors")({
  origin: [
    "https://exodus-c5202.web.app",
    "https://exodus-c5202.firebaseapp.com",
    "http://localhost:5173",
    "http://localhost:3000"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200
});

// Inicializar o Firebase Admin SDK
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
    
    await sendMessage('393932699714', 'juan, os agendamentos dos disparos estão se iniciando agora...', 'knei6w7c6lyrv9z5liiqk');

    await main();

    await sendMessage('393932699714', 'juan, os agendamentos dos disparos foram encerrados...', 'knei6w7c6lyrv9z5liiqk');

    const end = Date.now();
    const executionTime = (end - start) / 1000;
    console.log(`Scheduled function ran successfully in ${executionTime} seconds.`);
  });

// Função HTTP para processar as mensagens enfileiradas - COM CORS APLICADO
exports.sendMessage = functions.https.onRequest(async (req, res) => {
  // Aplicar CORS a todas as requisições
  cors(req, res, async () => {
    try {
      // Verificar método HTTP
      if (req.method === 'OPTIONS') {
        // Responder ao preflight request
        res.status(200).end();
        return;
      }

      if (req.method !== 'POST') {
        res.status(405).json({ 
          success: false, 
          error: 'Method not allowed',
          message: 'Only POST method is allowed'
        });
        return;
      }

      // Validar dados da requisição
      const { phone, message, instanceId, name, nickname } = req.body;
      
      if (!phone || !message) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'Phone and message are required'
        });
        return;
      }

      // Log da tentativa de envio
      console.log('Attempting to send message:', {
        phone: phone.toString(),
        message,
        instanceId,
        name,
        nickname
      });

      // Enviar mensagem
      await sendMessage(phone.toString(), message, instanceId);
      
      // Log de sucesso
      console.log(`Message sent successfully to ${name || 'Unknown'} (${nickname || 'N/A'}) at ${phone}`);
      
      // Resposta de sucesso
      res.status(200).json({
        success: true,
        message: 'Message sent successfully',
        data: {
          phone,
          sent: true,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Resposta de erro
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message || 'Failed to send message'
      });
    }
  });
});

// Função HTTP para enviar respostas de formulário
exports.submitClientFormResponse = functions
  .region('us-central1')
  .https.onRequest(async (req, res) => {
    cors(req, res, async () => {
      console.log("📥 Requisição recebida:", JSON.stringify(req.body, null, 2));

      if (req.method !== "POST") {
        return res.status(405).send("Método não permitido.");
      }

      const { clientId, formId, nameForms, responses } = req.body;

      if (!clientId || !formId || !responses) {
        console.log("⚠️ Parâmetros ausentes:", { clientId, formId, responses });
        return res.status(400).send("⚠️ Parâmetros ausentes: clientId, formId e responses são obrigatórios.");
      }

      try {
        let responseData;
        const clientRef = admin.firestore().collection("clients").doc(clientId);
        const clientDoc = await clientRef.get();

        // Verificar se o cliente existe
        if (!clientDoc.exists) {
          console.log(`❌ Cliente não encontrado: clients/${clientId}`);
          return res.status(404).send("❌ Cliente não encontrado.");
        }

        const clientName = clientDoc.data().name; // Assumindo que o nome do cliente está no campo 'name'

        // Buscar o nome do formulário a partir do formId
        const formRef = admin.firestore().collection("forms").doc(formId); // Supondo que exista uma coleção 'forms'
        const formDoc = await formRef.get();

        // Verificar se o formulário existe
        if (!formDoc.exists) {
          console.log(`❌ Formulário não encontrado: forms/${formId}`);
          return res.status(404).send("❌ Formulário não encontrado.");
        }

        const formName = formDoc.data().name;  // Nome do formulário obtido do banco

        // Salvar as respostas brutas no campo rawResponses
        const rawResponses = responses.map(response => ({
          question: response.text || `Pergunta sem texto`,
          answer: response.answer ?? "Sem resposta",
          createdAt: admin.firestore.Timestamp.now(),
        }));

        // Verificar se o formulário é "Autoavaliação de estilo de vida"
        if (nameForms === "Auto avaliação de estilo de vida") {
          const fieldMapping = {
            "1. Você tem tido contato com a natureza atualmente?": "contato_com_a_natureza",
            "2. Quanto você vive no agora, focado no momento presente?": "viver_no_agora",
            "3. Você tem convivido em sociedade? Como anda sua vida social?": "senso_de_comunidade",
            "4. Tem desenvolvido seu autoconhecimento?": "autoconhecimento",
            "5. Você tem uma vida equilibrada?": "viver_em_equilibrio",
            "6. Você pratica a gentileza com os outros?": "generosidade",
            "8. Você tem se alimentado com qualidade?": "comer_com_qualidade",
            "9. Você sente que tem autonomia sobre seu corpo?": "autonomia_do_corpo"
          };
          responseData = {
            clientId,
            clientName,  // Adicionar o nome do cliente
            formId,
            formName,    // Adicionar o nome do formulário
            type: "roda_filosofia",
            responses: {},
            rawResponses,  // Adicionar as respostas brutas
            timestamp: admin.firestore.Timestamp.now(),  // Usar 'timestamp' em vez de 'updatedAt'
            title: nameForms,  // Adicionar o campo 'title' com o valor de 'nameForms'
          };

          responses.forEach(response => {
            const fieldKey = fieldMapping[response.text];
            if (fieldKey) {
              responseData.responses[fieldKey] = response.answer ?? null;
            }
          });
        } else {
          responseData = {
            clientId,
            clientName,  // Adicionar o nome do cliente
            formId,
            formName,    // Adicionar o nome do formulário
            responses: responses.map((response, index) => ({
              question: response.text || `Pergunta ${index + 1} sem texto`,
              answer: response.answer ?? "Sem resposta",
              createdAt: admin.firestore.Timestamp.now(),
            })),
            rawResponses,  // Adicionar as respostas brutas
            submittedAt: admin.firestore.Timestamp.now(),  // Usar 'submittedAt' para outros formulários
          };
        }

        console.log("📤 Dados formatados para o Firestore:", JSON.stringify(responseData, null, 2));

        // Buscar o formulário no Firestore
        const formRefForUpdate = admin.firestore().collection("clients").doc(clientId).collection("forms").doc(formId);
        const formDocForUpdate = await formRefForUpdate.get();

        // Verificar se o formulário existe
        if (!formDocForUpdate.exists) {
          console.log(`❌ Formulário não encontrado: clients/${clientId}/forms/${formId}`);
          return res.status(404).send("❌ Formulário não encontrado.");
        }

        // Atualizar as respostas e salvar as brutas, removendo o campo 'questions'
        await formRefForUpdate.update({
          responses: responseData.responses,
          rawResponses: responseData.rawResponses,  // Salvar as respostas brutas
          type: responseData.type || null,
          formName: responseData.formName,  // Adicionar o nome do formulário
          // Se for o formulário "Autoavaliação de estilo de vida", usamos 'timestamp' e 'title'
          ...(nameForms === "Auto avaliação de estilo de vida" && {
            timestamp: responseData.timestamp,
            title: responseData.title,
          }),
          // Excluir o campo 'questions'
          questions: admin.firestore.FieldValue.delete(),
        });

        console.log(`✅ Respostas do cliente ${clientId} (${clientName}) para o formulário ${formId} (${formName}) atualizadas com sucesso.`);
        res.status(200).send("Respostas atualizadas com sucesso.");
      } catch (error) {
        console.error("❌ Erro ao atualizar respostas do formulário:", error);
        res.status(500).send("Erro ao atualizar respostas do formulário.");
      }
    });
  });

  
// Função para limpar lembretes antigos (executada semanalmente)
exports.cleanupOldReminders = functions
  .region('us-central1')
  .pubsub.schedule('every sunday 01:00')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    await cleanupOldReminders();
    return null;
  });

// Função para verificar treinos não completados às 22h
exports.checkIncompleteWorkouts = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 540,
  })
  .pubsub.schedule('every day 22:00')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    await checkIncompleteWorkouts();
    return null;
  });

// Função para enviar lembretes agendados (executada às 7h)
exports.sendScheduledReminders = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 540,
  })
  .pubsub.schedule('every day 07:00')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    await sendScheduledReminders();
    return null;
  });

// Função HTTP para registrar novos clientes - COM CORS APLICADO
exports.registerClient = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    registerClient(req, res);
  });
});