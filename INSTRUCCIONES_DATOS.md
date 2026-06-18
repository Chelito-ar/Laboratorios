# Buscador de Laboratorios INTA — Guía de Carga de Datos Reales

## Archivos del proyecto

```
📁 Laboratorios CONSOLIDADO_AntiG/
├── index.html     ← Página principal (no modificar)
├── styles.css     ← Estilos institucionales (no modificar)
├── app.js         ← Lógica de búsqueda y filtros (no modificar)
└── data.js        ← ⭐ ÚNICO ARCHIVO A REEMPLAZAR con datos reales
```

---

## Cómo cargar los datos reales

### Opción A — Exportar desde Excel a JSON (recomendada)

1. Abrir la planilla Excel con los ~500 registros.
2. Seleccionar **Archivo → Guardar como → CSV UTF-8**.
3. Abrir el CSV resultante y convertirlo a formato JSON con la
   herramienta online **https://csvjson.com/csv2json** (o similar).
4. Reemplazar el contenido del array `LAB_DATA` en `data.js`
   asegurándose de que cada objeto tenga exactamente estas claves:

```javascript
const LAB_DATA = [
  {
    centro:       "CR Buenos Aires Norte",   // Columna A
    unidad:       "EEA Pergamino",           // Columna B
    laboratorio:  "Laboratorio de Suelos",   // Columna C
    responsable:  "Dra. María González",     // Columna D
    correo:       "mgonzalez@inta.gob.ar",  // Columna Correo
    matriz:       "Suelo, Agua",            // Columna Matriz
    analisis:     "pH, Nitrógeno, Fósforo", // Columna Análisis/Servicios
    redlabSenasa: "autorizado",             // Columna REDLAB SENASA ("autorizado" o "")
    acreditado:   "acreditado",             // Columna Acreditado ante OAA ("acreditado" o "")
    terceros:     "SI"                      // Columna Prestan servicio a terceros ("SI" o "NO")
  },
  // ... resto de registros
];
```

### Opción B — Usar un script Python para convertir

Si la planilla está en Excel (.xlsx), ejecutar en la misma carpeta:

```bash
pip install openpyxl
python convertir_excel.py
```

El script `convertir_excel.py` (a crear) puede tener esta forma:

```python
import openpyxl, json

wb = openpyxl.load_workbook("mi_planilla.xlsx")
ws = wb.active

headers = [c.value for c in ws[1]]  # Fila 1 = encabezados
keys = ['centro','unidad','laboratorio','responsable','correo',
        'matriz','analisis','redlab','acreditado','terceros']

data = []
for row in ws.iter_rows(min_row=2, values_only=True):
    obj = {keys[i]: str(row[i] or '') for i in range(min(len(keys),len(row)))}
    data.append(obj)

with open("data.js", "w", encoding="utf-8") as f:
    f.write("const LAB_DATA = ")
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write(";\n")

print(f"✅ {len(data)} registros exportados a data.js")
```

---

## Notas importantes

| Columna | Clave en data.js | Valores esperados |
|---------|-----------------|-------------------|
| A – Centro Regional | `centro` | Texto libre |
| B – Nombre Unidad | `unidad` | Texto libre |
| C – Nombre del Laboratorio | `laboratorio` | Texto libre |
| D – Responsable | `responsable` | Texto libre |
| Correo | `correo` | Dirección de email |
| Matriz | `matriz` | Texto libre |
| Análisis/Servicios | `analisis` | Texto libre |
| REDLAB (SENASA) | `redlabSenasa` | `"autorizado"` / `""` vacío |
| Acreditado ante OAA | `acreditado` | `"acreditado"` / `""` vacío |
| Prestan servicio a terceros | `terceros` | `"SI"` / `"NO"` |

- **La búsqueda de texto** rastrea coincidencias en `laboratorio`, `responsable` y `analisis`.
- **El filtro de Unidad** se actualiza condicionalmente según el Centro Regional seleccionado.
- **El badge verde** ("Presta a terceros") aparece cuando `terceros === "SI"`.
- **El badge OAA** aparece cuando `acreditado === "acreditado"`.
- **El badge REDLAB (SENASA)** aparece cuando `redlabSenasa === "autorizado"`.
- **La paginación** muestra 20 registros por página, configurable cambiando `PAGE_SIZE` en `app.js`.


## Abrir la aplicación

Basta con abrir `index.html` directamente en el navegador. No requiere servidor web ni instalación de dependencias. Funciona 100% offline.
