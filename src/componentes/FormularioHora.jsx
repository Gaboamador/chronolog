import React, { useState, useEffect, useContext } from 'react';
import Context from '../context';
import '../estilos/FormularioHora.css';
import { format } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';

const FormularioHora = () => {
  const context = useContext(Context)
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem('timeEntries');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const saved = localStorage.getItem('timeEntries');
    if (saved) setEntries(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('timeEntries', JSON.stringify(entries));
  }, [entries]);

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

  return (
    <div className="container-main">
      {/* <h2>Agregar entrada de tiempo</h2> */}

      <DayPicker
        locale={es}
        animate
        mode="single"
        selected={context.selectedDate}
        onSelect={context.setSelectedDate}
        weekStartsOn={1}
        showOutsideDays
      />

      <div className="entrada-salida-inputs">
        <div>
        <label>Entrada: </label>
        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
      </div>

      <div>
        <label>Salida: </label>
        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
      </div>
      </div>
      <button onClick={handleSave} style={{ marginTop: '1rem' }}>Guardar</button>
    </div>
  );
};

export default FormularioHora;
