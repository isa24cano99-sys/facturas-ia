import { useState } from "react";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const uploadFile = async () => {
    if (!file) return alert("Selecciona un archivo Excel");

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(
        "https://facturas-ia.onrender.com/api/import",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: err.message });
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Subir Excel 📊</h2>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <br /><br />

      <button onClick={uploadFile} disabled={loading}>
        {loading ? "Subiendo..." : "Enviar a servidor"}
      </button>

      <pre style={{ marginTop: 20 }}>
        {result && JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}
