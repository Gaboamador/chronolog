import { useState } from "react";
import { getDay, subDays } from "date-fns";

function getInitialDate() {
  const today = new Date();
  const dayOfWeek = getDay(today);

  if (dayOfWeek === 0) {
    return subDays(today, 2);
  }

  if (dayOfWeek === 6) {
    return subDays(today, 1);
  }

  return today;
}

export function useSelectedDate() {
  const [selectedDate, setSelectedDate] = useState(getInitialDate);

  return {
    selectedDate,
    setSelectedDate,
  };
}