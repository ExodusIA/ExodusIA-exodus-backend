const {startOfDay, differenceInDays} = require('date-fns');

const getCurrentDay = (startDate) => {
    const today = startOfDay(new Date());
    const start = startOfDay(startDate.toDate());
    return differenceInDays(today, start) + 1;
};
  

module.exports = { getCurrentDay }