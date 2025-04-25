import Context from './context'
import {useState, useEffect} from 'react'

function GlobalState(props){

    const [selectedDate, setSelectedDate]=useState(new Date())

    const [entries, setEntries] = useState(() => {
        const saved = localStorage.getItem('timeEntries');
        return saved ? JSON.parse(saved) : [];
        });
    
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