export const getDefaultWorkTime = () => {
    const stored = JSON.parse(localStorage.getItem('defaultPersonalWorkTime'));
    return stored || {
      defaultPersonalStartTime: '09:00',
      defaultPersonalEndTime: '17:00',
    };
  };
  
  export const setDefaultWorkTime = (start, end) => {
    const newDefaults = {
      defaultPersonalStartTime: start,
      defaultPersonalEndTime: end,
    };
    localStorage.setItem('defaultPersonalWorkTime', JSON.stringify(newDefaults));
  };
  