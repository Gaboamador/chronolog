import Context from './context'
import {useState, useEffect} from 'react'
import { getDay, subDays } from 'date-fns';


function GlobalState(props){

    // const [selectedDate, setSelectedDate]=useState(new Date())
    const getInitialDate = () => {
        const today = new Date();
        const dayOfWeek = getDay(today); // Sunday = 0, Saturday = 6
      
        if (dayOfWeek === 0) {
          // Sunday → go back 2 days to Friday
          return subDays(today, 2);
        } else if (dayOfWeek === 6) {
          // Saturday → go back 1 day to Friday
          return subDays(today, 1);
        }
      
        return today; // Weekday → use as-is
      };
      
      const [selectedDate, setSelectedDate] = useState(getInitialDate());
      

    const [entries, setEntriesInternal] = useState(() => {
        const saved = localStorage.getItem('timeEntries');
        return saved ? JSON.parse(saved) : [];
        });

        const setEntries = (newEntriesOrUpdater) => {
            setEntriesInternal(prevEntries => {
              const newEntries = typeof newEntriesOrUpdater === 'function'
                ? newEntriesOrUpdater(prevEntries)
                : newEntriesOrUpdater;
        
              return [...newEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
            });
          };

    
    useEffect(() => {
        localStorage.setItem('timeEntries', JSON.stringify(entries));
    }, [entries]);

    return(
        <Context.Provider value={{
            selectedDate:selectedDate,
            setSelectedDate:setSelectedDate,
            entries:entries,
            setEntries:setEntries
        }}>
            {props.children}
        </Context.Provider>
    )
}

export default GlobalState;