const { db } = require('../firebaseConfig');
const { differenceInDays, startOfDay } = require('date-fns');
const { getCurrentDay } = require('../utils/currentDay');
const { getDocs, collection, doc } = require('firebase/firestore'); 

const getTasksForToday = async (programs) => {
  try {
    const allTodayTasks = [];

    for (const { program: programDoc, startDate } of programs) {
      // Certifique-se de que o programDoc seja uma referência válida
      const tasksRef = db.collection(`programs/${programDoc.id}/tasks`);
      const tasksSnapshot = await tasksRef.get();
      
      if (tasksSnapshot.empty) {
        console.log("No tasks found for program:", programDoc.id);
        continue;
      }

      const tasks = tasksSnapshot.docs.map(doc => doc.data());

      const currentDay = getCurrentDay(startDate);
      const todayTasks = tasks.filter(task => task.day === currentDay);

      if (todayTasks.length > 0) {
        allTodayTasks.push(...todayTasks);
      }
    }


    return allTodayTasks;
  } catch (e) {
    console.error("Error getting tasks for today: ", e);
    throw e; // Re-throw the error to be handled by the caller
  }
};

const getProgramLastTaskDay = async (programId) => {
  try {
    const tasksCollection = db.collection('programs').doc(programId).collection('tasks');
    const lastTaskDoc = await tasksCollection.orderBy('day', 'desc').limit(1).get();
    
    // Verificar se existe um documento de tarefa
    const lastTaskDay = lastTaskDoc.docs.length ? lastTaskDoc.docs[0].data().day : 0;
    
    return lastTaskDay;
  } catch (e) {
    console.error("Error getting tasks: ", e);
    return 0; // Retorna 0 como padrão em caso de erro
  }
};

module.exports = { getTasksForToday, getProgramLastTaskDay };
