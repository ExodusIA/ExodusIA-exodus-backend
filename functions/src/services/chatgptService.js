// chatgptService.js

const OpenAI = require("openai");
const dotenv = require('dotenv');
const { resolve } = require('path');

dotenv.config({ path: resolve(__dirname, '../.env') });

const openai = new OpenAI({
  apiKey: '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'
});

const createPersonalizedMessage = async (name, nickname, tasks, instructorStyle) => {
    const taskDetails = tasks.map(task => task.taskDescription).join('\n');

     // Obter a saudação apropriada com base na hora atual
     const currentHour = new Date().getHours();
     let greeting;
 
     if (currentHour < 12) {
         greeting = "Bom dia";
     } else if (currentHour < 18) {
         greeting = "Boa tarde";
     } else {
         greeting = "Boa noite";
     }

    // Prompt para adicionar o apelido apenas em algumas ocasiões
    const prompt = `Inclua o apelido "${nickname}" (Caso tenha mais de um nessa listagem, escolha um deles), adicione uma saudação caso não tenha (Oi, Oie, ${greeting}) e corrija o que for necessário na mensagem a seguir: ${taskDetails} (concatene o que for necessário para fazer sentido, mas deixe de maneira mas sutil, sem mudar muito o texto, apenas adicionando alguns emojis e humanização)`;

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