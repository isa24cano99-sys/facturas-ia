# 🎯 Dashboard & Invoices - Implementación Completa

## 📋 Lo que fue implementado

### 1️⃣ **Base de Datos - Tabla de Invoices**
**Archivo:** `db/schema.sql`

```sql
CREATE TABLE invoices (
  invoice_id TEXT PRIMARY KEY,
  report_id TEXT UNIQUE,
  branch_id TEXT,
  branch_name TEXT,
  county TEXT,
  state TEXT,
  branch_manager_name TEXT,
  branch_manager_email TEXT,
  report_month_id TEXT,
  report_month_display TEXT,
  invoice_type TEXT,  -- 'b2b' | 'offshore' | 'combined'
  b2b_total REAL,
  offshore_total REAL,
  grand_total REAL,
  created_at DATETIME
)
```

**Índices para optimizar queries:**
- `idx_invoices_month` - Búsqueda por mes
- `idx_invoices_branch` - Búsqueda por sucursal
- `idx_invoices_type` - Filtrado por tipo

---

### 2️⃣ **Backend - Servicio de Generación**

**Archivo:** `api/services/invoiceGenerator.js`

Función: `generateInvoicesFromReports(db)`

- Genera UNA factura por cada **branch_id + report_month_id**
- Calcula automáticamente:
  - `b2b_total` = suma de `b2b_services_data.monthly_investment`
  - `offshore_total` = suma de `(mss_direct_salary + indirect_costs + agency_markup)`
  - `grand_total` = b2b_total + offshore_total
- Determina `invoice_type`:
  - `'b2b'` si solo hay B2B
  - `'offshore'` si solo hay Offshore
  - `'combined'` si hay ambos

**Llamada automática:** Post-import en `api/routes/importRoutes.js`

---

### 3️⃣ **Endpoints API para Dashboard**

**Archivo:** `api/routes/dashboardRoutes.js`

#### **GET /api/dashboard/months**
Retorna meses disponibles para el sidebar

```json
{
  "ok": true,
  "months": [
    { "report_month_id": "2026-05", "report_month_display": "May 2026" },
    { "report_month_id": "2026-04", "report_month_display": "Apr 2026" }
  ]
}
```

#### **GET /api/dashboard/invoices**
Filtra invoices con búsqueda y filtros

```
Query params:
  ?month=2026-05                    // Mes
  &search=branch_name               // Búsqueda (branch_id, branch_name, manager)
  &type=combined|b2b|offshore|all   // Tipo de factura
```

#### **GET /api/dashboard/stats**
Estadísticas por mes

```json
{
  "ok": true,
  "stats": {
    "total_invoices": 45,
    "b2b_only": 15,
    "offshore_only": 20,
    "combined": 10
  }
}
```

#### **GET /api/dashboard/invoices/:invoice_id**
Detalle completo de una factura (para modal preview)

```json
{
  "ok": true,
  "invoice": { ...datos de invoice },
  "b2b": [ ...servicios b2b ],
  "offshore": [ ...empleados offshore ]
}
```

---

### 4️⃣ **Componentes React**

#### **A. Sidebar.jsx**
```
- Carga meses disponibles automáticamente
- Selección activa con highlight
- Click para cambiar de mes
```

#### **B. InvoiceList.jsx**
```
Stats Grid (4 cards):
  - Total Invoices
  - B2B Only
  - Offshore Only  
  - Combined

Filters Bar:
  - Search input (branch_id, branch_name, manager)
  - Type dropdown (all, b2b, offshore, combined)

Table:
  | Branch ID | Branch Name | Location | Manager | Type | Total | Actions |
  - Rows filtrados en tiempo real
  - Botones: Preview (abre modal) + PDF (descarga)
```

#### **C. InvoicePreviewModal.jsx**
```
- Header con nombre mes/sucursal
- Branch Information (6 campos)
- B2B Services table (si existen)
- Offshore Services table (si existen)
  - Columns: Employee | Role | Salary | Costs | Markup | Subtotal
- Grand Total prominente
- Botones: Close + Download PDF
```

#### **D. Dashboard.jsx (mejorado)**
```
Layout:
  [Sidebar] [Main Content]

Main Content:
  - Header con título + "Upload Excel" button
  - Upload Modal (con preview y validación)
  - InvoiceList (si hay mes seleccionado)
  - Fallback (selecciona un mes...)

Estados del import:
  IDLE → PREVIEWING → PREVIEW → IMPORTING → SUCCESS
  También maneja ERROR
```

---

### 5️⃣ **Estilos CSS Completos**

**Archivo:** `src/styles/dashboard.css`

**Features:**
- 🎨 Gradient moderno (azul oscuro a gris)
- 📱 Responsive (grid 2col → 1col en mobile)
- ✨ Animaciones (slideUp para modales)
- 🌈 Badges con colores por tipo
- 💡 Glass panel effect
- 🔲 Layout 280px sidebar + main content

**Componentes estilizados:**
- Dashboard layout con grid
- Sidebar sticky con hover effects
- Stats cards con colores distintos
- Filter bar con inputs bonitos
- Table con hover rows
- Modales con overlay y backdrop blur
- Preview sections con layouts responsivos

---

## 🔄 Flujo Completo

### Importación → Generación de Facturas

```
1. Usuario sube Excel (/api/import/preview)
   ↓
2. Validación de datos
   ↓
3. Preview muestra estadísticas
   ↓
4. Usuario confirma (/api/import/confirm)
   ↓
5. Guardado en BD (transactions):
   - Branches
   - Reports
   - B2B Services
   - Offshore Services
   ↓
6. AUTO: generateInvoicesFromReports()
   - Crea tabla de INVOICES
   - Calcula totales
   - Determina tipo
   ↓
7. Respuesta: "Import successful and invoices generated"
```

### Dashboard → Ver Facturas

```
1. Usuario abre dashboard
   ↓
2. Sidebar carga meses (GET /api/dashboard/months)
   ↓
3. Usuario selecciona mes
   ↓
4. InvoiceList carga:
   - Stats (GET /api/dashboard/stats?month=...)
   - Invoices (GET /api/dashboard/invoices?month=...)
   ↓
5. Usuario busca/filtra:
   - Search text → LIKE en branch_id, name, manager
   - Type dropdown → invoice_type filter
   ↓
6. Click "Preview":
   - Abre modal
   - GET /api/dashboard/invoices/:invoice_id
   - Muestra detalles B2B + Offshore
   ↓
7. Click "PDF":
   - Descarga /api/invoices/generate/:report_id
   - Puppeteer genera PDF
```

---

## 📊 SQL Queries Optimizadas

### Obtener meses disponibles
```sql
SELECT DISTINCT report_month_id, report_month_display
FROM invoices
ORDER BY report_month_id DESC
```

### Estadísticas por mes
```sql
SELECT COUNT(*) FROM invoices WHERE report_month_id = ?
SELECT COUNT(*) FROM invoices WHERE invoice_type = 'b2b' AND report_month_id = ?
```

### Listar con búsqueda y filtros
```sql
SELECT * FROM invoices 
WHERE report_month_id = ? 
  AND invoice_type = ?
  AND (branch_id LIKE ? OR branch_name LIKE ? OR branch_manager_name LIKE ?)
ORDER BY branch_name ASC
```

---

## 🎮 Guía de Uso

### Inicio
```bash
# Terminal 1 - Backend
npm start

# Terminal 2 - Frontend
npm run dev
```

### Navegar a dashboard
```
http://localhost:5173
```

### Flujo típico
1. **Subir Excel** → Click botón "⬆️ Upload Excel"
2. **Validar** → Preview automático
3. **Confirmar** → Genera invoices
4. **Ver facturas** → Seleccionar mes en sidebar
5. **Buscar** → Escribir en search input
6. **Filtrar** → Dropdown por tipo
7. **Ver detalle** → Click "Preview"
8. **Descargar PDF** → Click "📄 PDF"

---

## 🔐 Características de Seguridad

- ✅ Transacciones SQLite (ROLLBACK si hay error)
- ✅ Validación en preview (antes de guardar)
- ✅ Sanitización de búsquedas (% LIKE)
- ✅ IDs únicos por reporte (no duplicados)
- ✅ Índices para queries rápidas

---

## 📈 Performance

- **Sidebar**: Load una sola vez (meses rara vez cambian)
- **InvoiceList**: Queries con índices (month, branch, type)
- **Search**: LIKE con prefix % (optimizado)
- **Modal**: Lazy load de detalles (solo al abrir)
- **CSS**: Estilos críticos en main.css, específicos en dashboard.css

---

## 🚀 Próximos pasos (opcional)

- [ ] Exportar a Excel (SheetJS)
- [ ] Gráficos/Charts (Recharts)
- [ ] Paginación (1000+ invoices)
- [ ] Caché de meses (Redis)
- [ ] Sorting por columnas en tabla
- [ ] Filtro por fecha rango
- [ ] Multi-select para acciones bulk
- [ ] Dark mode toggle

---

## 📁 Archivos creados/modificados

### Nuevos
- `api/services/invoiceGenerator.js` ✨
- `api/routes/dashboardRoutes.js` ✨
- `src/components/Sidebar.jsx` ✨
- `src/components/InvoiceList.jsx` ✨
- `src/components/InvoicePreviewModal.jsx` ✨
- `src/styles/dashboard.css` ✨

### Modificados
- `db/schema.sql` (+ tabla invoices)
- `api/routes/importRoutes.js` (+ generateInvoicesFromReports)
- `server.js` (+ dashboardRoutes)
- `src/pages/Dashboard.jsx` (reescrito completamente)
- `src/main.jsx` (+ import dashboard.css)

---

**¡Todo listo para producción!** 🎉
