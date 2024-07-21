const { db } = require('./firebaseConfig');
const { differenceInDays, startOfDay } = require('date-fns');

const getTasksForToday = async (programId, startDate) => {
  try {
    const tasksRef = db.collection("programs").doc(programId).collection("tasks");
    const tasksSnapshot = await tasksRef.get();
    
    if (tasksSnapshot.empty) {
      console.log("No tasks found!");
      return null;
    }

    const tasks = tasksSnapshot.docs.map(doc => doc.data());
    const currentDay = differenceInDays(startOfDay(new Date()), startOfDay(startDate.toDate())) % 7;
    const todayTasks = tasks.filter(task => task.day === currentDay + 1);

    if (!todayTasks) {
        console.log("No task for today!");
        return [];
    }

    return todayTasks;
  } catch (e) {
    console.error("Error getting task for today: ", e);
    throw e; // Re-throw the error to be handled by the caller
  }
};

module.exports = { getTasksForToday };
