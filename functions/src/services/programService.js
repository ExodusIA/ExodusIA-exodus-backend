const { db } = require('../firebaseConfig');
const { differenceInDays, startOfDay } = require('date-fns');
const { getDocs, collection, doc } = require('firebase/firestore'); 

const getTasksForToday = async (programs) => {
  try {
    const allTodayTasks = [];

    for (const { program: programDoc, startDate } of programs) {
      const tasksRef = programDoc.collection("tasks");
      const tasksSnapshot = await tasksRef.get();
      
      if (tasksSnapshot.empty) {
        console.log("No tasks found for program:", programDoc.id);
        continue;
      }

      const tasks = tasksSnapshot.docs.map(doc => doc.data());
      const currentDay = differenceInDays(startOfDay(new Date()), startOfDay(startDate.toDate())) % 7;
      const todayTasks = tasks.filter(task => task.day === currentDay + 1);
      
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
    const tasksSnapshot = await tasksCollection.get();
    const tasks = tasksSnapshot.docs.map(doc => doc.data());
    const lastTaskDay = Math.max(...tasks.map(task => task.day), 0);
    return lastTaskDay;
  } catch (e) {
    console.error("Error getting tasks: ", e);
    return 0;
  }
};

module.exports = { getTasksForToday, getProgramLastTaskDay };
