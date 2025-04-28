import React, { useState, useEffect, useContext } from 'react';
import Context from '../context';
import '../estilos/FormularioHora.css';
import { format } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import { MdAutoAwesome } from "react-icons/md";

const FormularioHora = () => {
  const context = useContext(Context)
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  // const [entries, setEntries] = useState(() => {
  //   const saved = localStorage.getItem('timeEntries');
  //   return saved ? JSON.parse(saved) : [];
  // });
  const [entryExists, setEntryExists] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('timeEntries');
    if (saved) context.setEntries(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('timeEntries', JSON.stringify(context.entries));
  }, [context.entries]);

  // Check if an entry already exists for selectedDate
  useEffect(() => {
    if (context.entries.length > 0 && context.selectedDate) {
      const exists = context.entries.some(entry => entry.date === context.selectedDate.toISOString().split('T')[0]);
      setEntryExists(exists);
    }
  }, [context.entries, context.selectedDate]);

  const handleSave = () => {
    const newEntry = {
      date: format(context.selectedDate, 'yyyy-MM-dd'),
      start: startTime,
      end: endTime
    };
    context.setEntries(prev => [...prev.filter(e => e.date !== newEntry.date), newEntry]);
    setStartTime('');
    setEndTime('');
  };

  const handleAutoFillDefault = () => {
    setStartTime('09:00');
    setEndTime('17:00');
  };
  

  return (
    <div className="container-main calendar">
      {/* <h2>Agregar entrada de tiempo</h2> */}

      <DayPicker
        locale={es}
        animate
        mode="single"
        selected={context.selectedDate}
        onSelect={context.setSelectedDate}
        weekStartsOn={1}
        showOutsideDays
        required
        disabled={[
          { dayOfWeek: [0, 6] }  // Sunday = 0, Saturday = 6
        ]}
      />

{!entryExists &&
    <div className="entrada-salida-container">
      <div className="entrada-salida-inputs">

        <div className="entrada-salida-input-children">
          <label>ENTRADA</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
        </div>

        <div className="entrada-salida-input-children">
          <label>SALIDA</label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
        </div>

        <button
        onClick={handleAutoFillDefault}
        className="auto-complete-button">
          <MdAutoAwesome/>
        </button>

      </div>
      <button onClick={handleSave}>Guardar</button>
    </div>
    }


    </div>
  );
};

export default FormularioHora;
