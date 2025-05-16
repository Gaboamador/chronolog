import React, { useContext, useMemo, useState } from 'react';
import '../estilos/ResumenSemana.scss';
import Context from '../context';
import { format, startOfWeek, addDays, isSameDay, differenceInMinutes, parse, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale'
import { MdEdit } from "react-icons/md";
import ModalEditar from './ModalEditar';
import ImportarExportar from './ImportarExportar';
import { MdDeleteForever } from "react-icons/md";

const WEEK_DAYS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes'
];

const WORKDAY_MINUTES = 8 * 60; // 8 hours

function getEntryForDate(entries, date) {
  const dateStr = format(date, 'yyyy-MM-dd');
  return entries.find(e => e.date === dateStr);
}

function formatDuration(minutes) {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h ${m}m`;
}

const ResumenSemana = () => {
  const context = useContext(Context);

   // Modal state
   const [modalOpen, setModalOpen] = useState(false);

   const monthStart = startOfMonth(context.selectedDate);
   const monthEnd = endOfMonth(context.selectedDate);
   // Prepare monthly diff
const entriesThisMonth = context.entries.filter(entry => {
  const entryDate = parseISO(entry.date);
  return isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
});

// Now calculate total monthly diff
let totalMonthlyDiff = 0;

entriesThisMonth.forEach(entry => {
  if (entry.start && entry.end) {
    const startDate = parse(entry.start, 'HH:mm', parseISO(entry.date));
    const endDate = parse(entry.end, 'HH:mm', parseISO(entry.date));
    const duration = differenceInMinutes(endDate, startDate);
    const diff = duration - WORKDAY_MINUTES;
    totalMonthlyDiff += diff;
  }
});
const selectedMonthName = format(context.selectedDate, 'MMMM', { locale: es });

  // State to track which date is being edited (string 'yyyy-MM-dd' or null)
  const [editDate, setEditDate] = useState(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  // Calculate the week days (Monday to Friday)
  const weekDays = useMemo(() => {
    if (!context.selectedDate) return [];
    const baseDate = new Date(context.selectedDate);
    const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
    return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  }, [context.selectedDate]);

  // Prepare rows with data and date string
  const tableRows = weekDays.map((date, idx) => {
    const entry = getEntryForDate(context.entries, date);
    let duration = 0;
    let start = '';
    let end = '';

    if (entry && entry.start && entry.end) {
      const startDate = parse(entry.start, 'HH:mm', date);
      const endDate = parse(entry.end, 'HH:mm', date);
      duration = differenceInMinutes(endDate, startDate);
      start = entry.start;
      end = entry.end;
    }

    return {
      day: WEEK_DAYS[idx],
      start,
      end,
      duration,
      diff: duration - WORKDAY_MINUTES,
      date,
      dateStr: format(date, 'yyyy-MM-dd')
    };
  });

  // Calculate totals only for days with data
  const totalDiff = tableRows.reduce((sum, row) => sum + (row.duration > 0 ? row.diff : 0), 0);

  // Start editing a row by date
  const handleEditClick = (dateStr, start, end) => {
    setEditDate(dateStr);
    setEditStart(start);
    setEditEnd(end);
    setModalOpen(true);
  };

  // Save edited entry
  const handleSaveEdit = () => {
    if (!editDate) return;

    // Validate times (optional)
    // For example: start and end should be non-empty and start < end

    // Remove old entry for this date if exists
    const filteredEntries = context.entries.filter(e => e.date !== editDate);

    // Add updated entry only if both start and end are set (optional: you can allow empty to delete)
    if (editStart && editEnd) {
      filteredEntries.push({ date: editDate, start: editStart, end: editEnd });
    }

    context.setEntries(filteredEntries);
    // localStorage.setItem('timeEntries', JSON.stringify(filteredEntries));
    setModalOpen(false);
    setEditDate(null);
    setEditStart('');
    setEditEnd('');
  };

    // Delete edited entry
  const handleDeleteEdit = () => {
    if (!editDate) return;
  
    if (window.confirm('¿Estás seguro de que quieres borrar esta entrada?')) {
      const filteredEntries = context.entries.filter(e => e.date !== editDate);
  
      context.setEntries(filteredEntries);
      // localStorage.setItem('timeEntries', JSON.stringify(filteredEntries));
  
      setModalOpen(false);
      setEditDate(null);
      setEditStart('');
      setEditEnd('');
    }
  };  

  // Cancel editing
  const handleCancelEdit = () => {
    setModalOpen(false);
    setEditDate(null);
    setEditStart('');
    setEditEnd('');
  };

  const handleClearEntries = () => {
    if (window.confirm('¿Estás seguro que quieres borrar todas las entradas? Esta acción no se puede deshacer.')) {
      context.setEntries([]);
      localStorage.removeItem('timeEntries'); // Optional, since context.setEntries([]) will sync localStorage if you do it in context provider
    }
  };
  

  return (
  <div className="container-main">
    <div className="table-responsive">
      <table className="tabla-resumen-semana">
        <thead>
          <tr>
            <th>Día</th>
            <th>Ingreso</th>
            <th>Salida</th>
            {/* <th>Duración</th> */}
            <th>Diferencia</th>
            <th>Editar</th>
          </tr>
        </thead>
        <tbody>
        {tableRows.map((row) => {
           if (!row.date) return null; // Skip empty rows
            const hasData = row.start && row.end;
            const isSelected = isSameDay(row.date, context.selectedDate);
            return (
              <tr
              key={row.dateStr}
              className={isSelected ? 'selected' : ''}
              onClick={() => context.setSelectedDate(row.date)}
              style={{ cursor: 'pointer' }}      
              >
                <td>{row.day} {row.date.getDate()}</td>
                <td>{hasData ? row.start : null}</td>
                <td>{hasData ? row.end : null}</td>
                {/* <td>{hasData ? (row.duration > 0 ? formatDuration(row.duration) : '+0m') : null}</td> */}
                <td>{hasData ? formatDuration(row.diff) : null}</td>
                <td>
                  {hasData && (
                    <div className="editar-entrada" onClick={() => handleEditClick(row.dateStr, row.start, row.end)}>
                      <MdEdit/>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
              <tr className="tabla-resumen-subfooter">
                  <td colSpan={3}>Diferencia Semanal</td>
                  {/* <td>{formatDuration(totalMinutes)}</td> */}
                  <td colSpan={2}>{formatDuration(totalDiff)}</td>
              </tr>
              <tr>
                <td colSpan={3}>
                Diferencia Mensual ({selectedMonthName})
                </td>
                <td colSpan={2}>
                {formatDuration(totalMonthlyDiff)}
                </td>
              </tr>
            </tbody>
          </table>

      <ModalEditar isOpen={modalOpen} onClose={handleCancelEdit}>
        <div className="entrada-salida-container modal">
          <div className="modal-title">EDITAR HORARIO</div>
          <div className="entrada-salida-inputs">
            <div className="entrada-salida-input-children">
              <label>ENTRADA</label>
              <input
                type="time"
                value={editStart}
                onChange={e => setEditStart(e.target.value)}
              />
            </div>

            <div className="entrada-salida-input-children">
              <label>SALIDA</label>
              <input
                type="time"
                value={editEnd}
                onChange={e => setEditEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="botones-modal-container">
            <div className="botones-modal-eliminar-cancelar">
              <button onClick={handleDeleteEdit}>ELIMINAR</button>
              <button onClick={handleCancelEdit}>CANCELAR</button>
            </div>
              <button className="botones-modal-guardar" onClick={handleSaveEdit}>GUARDAR</button>
            </div>
          </div>
      </ModalEditar>
      </div>

      <div className="buttons-container">
          <ImportarExportar/>
          <div className="clear-entries-container">
            <button className="button-clear-entries" onClick={handleClearEntries}>
            <MdDeleteForever/>
            </button>
          </div>
      </div>

    </div>
);
};

export default ResumenSemana;
