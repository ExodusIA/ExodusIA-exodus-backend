const OpenAI = require("openai");
const dotenv = require('dotenv');
const { resolve } = require('path');

dotenv.config({ path: resolve(__dirname, '../.env') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const createPersonalizedMessage = async (name, nickname, tasks, style) => {
    const tasksDescriptions = tasks.map(task => `Task: ${task.taskName}\nDescription: ${task.taskDescription}`).join('\n\n');

    let prompt;
    if (name.startsWith("Grupo:")) {
        prompt = `Crie uma mensagem personalizada para o grupo ${name.replace("Grupo:", "").trim()}, chame-os pelo apelido "${nickname}", baseado em suas tarefas de hoje:\n\n${tasksDescriptions}\n\n
        Considere que a mensagem será enviada para o WhatsApp. Use poucos ou nenhum emoji e insira links diretamente e somente os que eu lhe fornecer, 
        utilize asteriscos para deixar somente os títulos em negrito, assim: *Exemplo de título*. Note que "${nickname}" é um apelido para todas as pessoas do grupo "${name.replace("Grupo:", "").trim()}".
        `;
    } else {
        prompt = `Crie uma mensagem personalizada para ${name}, chame-o pelo seu apelido que é ${nickname}, baseado em suas tarefas de hoje:\n\n${tasksDescriptions}\n\n
        Considere que a mensagem será enviada para o WhatsApp. Use poucos ou nenhum emoji e insira links diretamente e somente os que eu lhe fornecer, 
        utilize asteriscos para deixar somente os títulos em negrito, assim: *Exemplo de título*.
        `;
    }
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: style },
                { role: "user", content: prompt }
            ],
        });

        return completion.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error creating personalized message:", error);
        throw error;
    }
};

module.exports = {
    createPersonalizedMessage
};
