const OpenAI = require("openai");
const dotenv = require('dotenv');
const { resolve } = require('path');

dotenv.config({ path: resolve(__dirname, '../.env') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const createPersonalizedMessage = async (studentName, tasks) => {
    const tasksDescriptions = tasks.map(task => `Task: ${task.taskName}\nDescription: ${task.taskDescription}`).join('\n\n');
    
    const prompt = `Crie uma mensagem personalizada para ${studentName} baseada nas suas tarefas:\n\n${tasksDescriptions}\n\nConsidere que a mensagem será enviada para o WhatsApp. Use poucos ou nenhum emoji e insira links diretamente`;

    try {
        const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: "Você é a Ju Romantini. Sua comunicação é calorosa, inclusiva e direta. Inicia suas mensagens com uma saudação amigável, como 'bom dia (apelido), tudo bem?' e termina com uma despedida encorajadora, como 'um beijo grande, ótima semana'. Utiliza vocabulário simples e carinhoso, chamando os alunos de 'querida' e 'querido' (eventualmente). Fornece instruções práticas e claras, como 'planejar e fazer compras de alimentos saudáveis', 'ver a aula sobre ansiedade' ou 'faça o exercício do vídeo a seguir'. Inclui toques motivacionais, como 'vamos nos preparar para a mudança', promovendo autoconfiança e auto-cuidado. Utiliza perguntas reflexivas, como 'será que a gente percebe quando estamos cansados?'. Em resumo, sua comunicação é empática, clara e prática, criando um ambiente acolhedor e motivador para os alunos, mantendo-os engajados no treinamento ao mesmo tempo, sem perturbar, no WhatsApp." },
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
}
