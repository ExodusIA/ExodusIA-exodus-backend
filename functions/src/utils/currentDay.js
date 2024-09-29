const { startOfDay, differenceInDays } = require('date-fns');

const getCurrentDay = (startDate) => {
    // Cria uma data atual e ajusta para o fuso horário local (3 horas a menos)
    const now = new Date();
    const adjustedNow = new Date(now.getTime() - 3 * 60 * 60 * 1000); // Ajuste de 3 horas

    // Obtém o início do dia ajustado para o fuso horário local
    const today = startOfDay(adjustedNow);
    // Certifica-se de que startDate é um objeto Date válido
    const start = startOfDay(startDate);    
    // Calcula a diferença em dias entre hoje e a data de início
    const daysDifference = differenceInDays(today, start);
    // Retorna o número de dias desde o início, começando de 1
    return daysDifference + 1;
};


module.exports = { getCurrentDay };