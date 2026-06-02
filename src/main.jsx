import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import Upload from './ui/Upload'   // 👈 IMPORTANTE

// En desarrollo: proxeado a localhost:3000 por Vite
// En producción: mismo origen (servidor Express)
const API = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : ''

function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API}/api/test`)
      .then(res => res.json())
      .then(res => setData(res))
      .catch(err => setError(err.message))
  }, [])

  return (
    <div style={{ fontFamily: 'Arial', padding: 20 }}>
      <h1>Facturas IA 🚀</h1>

      <h3>Respuesta del backend:</h3>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {data ? (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <p>Cargando datos...</p>
      )}

      {/* 👇 ESTO ES LO QUE TE FALTA */}
      <Upload />
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
