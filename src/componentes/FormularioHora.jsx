import React, { useState, useEffect, useContext } from 'react';
import Context from '../context';
import '../estilos/FormularioHora.scss';
import '../estilos/Botones.scss';
import { format } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import { MdAutoAwesome } from "react-icons/md";

const FormularioHora = () => {
  const context = useContext(Context)
  // const [startTime, setStartTime] = useState('');
  // const [endTime, setEndTime] = useState('');
  const { defaultPersonalStartTime, defaultPersonalEndTime } = context.defaultWorkTime;
  const [startTime, setStartTime] = useState(defaultPersonalStartTime);
  const [endTime, setEndTime] = useState(defaultPersonalEndTime);

  const [entryExists, setEntryExists] = useState(false);

  // Check if an entry already exists for selectedDate
  useEffect(() => {
    if (context.entries.length > 0 && context.selectedDate) {
      const exists = context.entries.some(entry => entry.date === context.selectedDate.toISOString().split('T')[0]);
      setEntryExists(exists);
    }
  }, [context.entries, context.selectedDate]);

  const [showValidation, setShowValidation] = useState(false);

  const handleSave = () => {
    // Case: only endTime is filled (invalid)
    if (!startTime && endTime) {
      setShowValidation(true);
      alert('Debe ingresar una hora válida tanto para ENTRADA como para SALIDA.');
      return;
    }
  
    // Case: both are empty (invalid)
    if (!startTime && !endTime) {
      setShowValidation(true);
      alert('Debe ingresar una hora válida tanto para ENTRADA como para SALIDA.');
      return;
    }
  
    // Case: only startTime is filled (auto-fill endTime)
    if (startTime && !endTime) {
      const [hour, minute] = startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hour, minute, 0, 0);
      startDate.setHours(startDate.getHours() + 8);
  
      const pad = (n) => String(n).padStart(2, '0');
      const autoEnd = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;
  
      setEndTime(autoEnd);
      alert('SALIDA se completó automáticamente (+8h). Pulse GUARDAR nuevamente para confirmar.');
      return;
    }
  
    // Case: both times present, proceed with save
    setShowValidation(false);
  
    const newEntry = {
      date: format(context.selectedDate, 'yyyy-MM-dd'),
      start: startTime,
      end: endTime
    };
  
    context.setEntries(prev => [
      ...prev.filter(e => e.date !== newEntry.date),
      newEntry
    ]);
  
    setStartTime('');
    setEndTime('');
  };
  
  const handleAutoFillDefault = () => {
  const { defaultPersonalStartTime, defaultPersonalEndTime } = context.defaultWorkTime;
  setStartTime(defaultPersonalStartTime);
  setEndTime(defaultPersonalEndTime);
};
  
  const customEs = {
    ...es,
    localize: {
      ...es.localize,
      month: (n, opts) => {
        const original = es.localize.month(n, opts);
        return original.charAt(0).toUpperCase() + original.slice(1);
      }
    }
  };
  

  return (
    <div className="container-main calendar">

      <DayPicker
        locale={customEs}
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
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={showValidation && !startTime ? 'input-error' : ''}/>
        </div>

        <div className="entrada-salida-input-children">
          <label>SALIDA</label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={showValidation && !endTime ? 'input-error' : ''}/>
        </div>

        {/* <button
        onClick={handleAutoFillDefault}
        className="auto-complete-button">
          <MdAutoAwesome/>
        </button> */}

      </div>
      <button className="button" onClick={handleSave}>GUARDAR</button>
    </div>
    }


    </div>
  );
};

export default FormularioHora;
