// BackupRestore.jsx
import React, { useContext, useRef } from 'react';
import '../estilos/ImportarExportar.css';
import Context from '../context';
import { CiExport, CiImport } from "react-icons/ci";

const ImportarExportar = () => {
  const context = useContext(Context);
  const fileInputRef = useRef(null);


  const handleExport = () => {
    const dataStr = JSON.stringify(context.entries, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'horarios.json';
    a.click();

    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (Array.isArray(importedData)) {
          context.setEntries(importedData);
          localStorage.setItem('timeEntries', JSON.stringify(importedData));
          alert('Importación exitosa.');
        } else {
          alert('El archivo no tiene el formato correcto.');
        }
      } catch (error) {
        console.error('Error importing JSON:', error);
        alert('Error al leer el archivo.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="importar-exportar-container">
      <button onClick={handleExport} className="button-import-export-json">
        <CiExport/>
      </button>

      <button onClick={handleImportClick} className="button-import-export-json">
        <CiImport />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImport}
      />
    </div>
  );
};

export default ImportarExportar;
