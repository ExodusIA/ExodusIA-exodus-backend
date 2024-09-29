// chatgptService.js

const OpenAI = require("openai");
const dotenv = require('dotenv');
const { resolve } = require('path');

dotenv.config({ path: resolve(__dirname, '../.env') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const createPersonalizedMessage = async (name, nickname, tasks) => {
    const taskDescriptions = tasks.map(task => `${task.taskDescription}`).join('\n');

    let prompt;

    if (name.startsWith("Grupo:")) {
        // Extract the group name
        const groupName = name.replace("Grupo:", "").trim();

        prompt = `Crie uma mensagem personalizada para o grupo ${groupName}, chamando-os por um dos apelidos: "${nickname}". Inclua as seguintes tarefas na mensagem:

${taskDescriptions}

A mensagem deve ser amigável, direta e curta, semelhante a este exemplo:

"Bom dia pessoal, tudo bem?

O treino de vocês hoje:
Fazer X Polichinelo

Depois me contem como foi, abraços"

Certifique-se de manter o tom casual e pessoal, e adapte a saudação e despedida para um grupo.`;
    } else {
        // Individual message
        prompt = `Crie uma mensagem personalizada para ${name}, chame-o pelo seu apelido que é ${nickname}. Inclua as seguintes tarefas na mensagem:

${taskDescriptions}

A mensagem deve ser amigável, direta e curta, semelhante a este exemplo:

"Bom dia ${nickname}, tudo bem?

Seu treino de hoje:
${taskDescriptions}

Depois me conta como foi, beijos"

Certifique-se de manter o tom casual e pessoal, e não inclua numeração ou divisões em partes.`;
    }

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "user", content: prompt }
            ],
        });

        const fullMessage = completion.choices[0].message.content.trim();
        return fullMessage;
    } catch (error) {
        console.error("Error creating personalized message:", error);
        throw error;
    }
};


module.exports = {
    createPersonalizedMessage
};
