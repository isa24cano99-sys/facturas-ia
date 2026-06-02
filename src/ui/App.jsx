import Upload from "./Upload";

export default function App() {
  return (
  <div style={{ fontFamily: 'Arial', padding: 20 }}>
    <h1>Facturas IA 🚀</h1>

    <h3>Respuesta del backend:</h3>

    {error && <p style={{ color: 'red' }}>Error: {error}</p>}

    {data ? (
      <pre>{JSON.stringify(data, null, 2)}</pre>
    ) : (
      <p>Cargando datos...</p>
    )}

    <hr />

    <Upload />
  </div>
)
