import Context from './context'
import {useState, useEffect, useRef} from 'react'
import { getDay, subDays } from 'date-fns';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import {
  guardarEntrada,
  obtenerEntradas,
  guardarHorarioPorDefecto,
  obtenerHorarioPorDefecto
} from './firebaseUtils';



function GlobalState(props){

    const [loading, setLoading] = useState(true);

    const [defaultWorkTime, setDefaultWorkTime] = useState({
      defaultPersonalStartTime: '09:00',
      defaultPersonalEndTime: '17:00',
    });
    const [necesitaConfigurarHorario, setNecesitaConfigurarHorario] = useState(false);
    const [mostrarModalHorario, setMostrarModalHorario] = useState(false);



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

              


     // Ref para guardar el valor previo de entries
  const prevEntriesRef = useRef(entries);


  const [user, setUser] = useState(null);
  

  // Escuchar autenticación
  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      setUser(user);
      const firestoreDefaults = await obtenerHorarioPorDefecto(user.uid);
      // setDefaultWorkTime(firestoreDefaults);
      if (firestoreDefaults) {
        setDefaultWorkTime(firestoreDefaults);
      } else {
        setNecesitaConfigurarHorario(true);
        setMostrarModalHorario(true);
      }

      const localData = localStorage.getItem('timeEntries');
      const localEntries = localData ? JSON.parse(localData) : [];

      if (localEntries.length > 0) {
      // Paso 1: subir a Firestore

      const agrupado = localEntries.reduce((acc, entrada) => {
        const fecha = entrada.date;
        if (!acc[fecha]) acc[fecha] = [];
        acc[fecha].push(entrada);
        return acc;
      }, {});

      for (const fecha in agrupado) {
        await guardarEntrada(user.uid, {
          date: fecha,
          entries: agrupado[fecha],
        });
      }

      // Una vez migradas, podés limpiarlas localmente si querés
      localStorage.removeItem('timeEntries');
    }
      
    // Paso 2: cargar entradas desde servidor (si ya migró, este paso prevalece)
      const firestoreEntries = await obtenerEntradas(user.uid);
      setEntriesInternal(firestoreEntries);
      prevEntriesRef.current = firestoreEntries; // <-- Actualizamos referencia

    } else {
      // Solo en modo offline: cargar lo que haya en localStorage
      setUser(null);
      const local = localStorage.getItem('timeEntries');
      const localEntries = local ? JSON.parse(local) : [];
      setEntriesInternal(localEntries);
      prevEntriesRef.current = localEntries; // <-- También acá
    }
    setLoading(false); // Se terminó el proceso de carga
  });

  return () => unsubscribe();
}, []);


  // Sincronizar con Firebase solo fechas modificadas
  const isFirstSync = useRef(true);

  useEffect(() => {
    if (isFirstSync.current) {
    isFirstSync.current = false;
    return;
  }

    const user = auth.currentUser;
    if (!user) return;

    const prevEntries = prevEntriesRef.current;

    // Agrupar por fecha (o usar lo que corresponda según estructura entries)
    const agruparPorFecha = (lista) =>
      lista.reduce((acc, entrada) => {
        const fecha = entrada.date;
        if (!acc[fecha]) acc[fecha] = [];
        acc[fecha].push(entrada);
        return acc;
      }, {});

    const prevAgrupado = agruparPorFecha(prevEntries);
    const currAgrupado = agruparPorFecha(entries);

    // Detectar fechas modificadas
    const fechasModificadas = Object.keys(currAgrupado).filter(fecha => {
      const prevData = JSON.stringify(prevAgrupado[fecha] || []);
      const currData = JSON.stringify(currAgrupado[fecha]);
      return prevData !== currData;
    });

    // Guardar solo fechas modificadas en Firebase
    fechasModificadas.forEach(fecha => {
      guardarEntrada(user.uid, {
        date: fecha,
        entries: currAgrupado[fecha],
      });
    });

    // Actualizamos referencia al final para la próxima comparación
    prevEntriesRef.current = entries;
  }, [entries]);

const logout = async () => {
    try {
      await signOut(auth);
      // Opcional: limpiar estado local si querés
      setUser(null);
      setEntriesInternal([]);
      prevEntriesRef.current = [];
      localStorage.removeItem('timeEntries'); // esto faltaba
      localStorage.removeItem('defaultPersonalWorkTime');
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }
  };

// useEffect(() => {
//   if (user) return;
//   if (entries.length > 0) {
//     localStorage.setItem('timeEntries', JSON.stringify(entries));
//   } else {
//     localStorage.removeItem('timeEntries');
//   }
// }, [entries, user]);


    return(
        <Context.Provider value={{
            selectedDate,
            setSelectedDate,
            entries,
            setEntries,
            user,
            setUser,
            logout,
            loading,
            defaultWorkTime,
            setDefaultWorkTime,
            necesitaConfigurarHorario,
            setNecesitaConfigurarHorario,
            mostrarModalHorario,
            setMostrarModalHorario,
        }}>
            {props.children}
        </Context.Provider>
    )
}

export default GlobalState;