import Context from './context'
import {useState, useEffect} from 'react'

function GlobalState(props){

    const [selectedDate, setSelectedDate]=useState(new Date())

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