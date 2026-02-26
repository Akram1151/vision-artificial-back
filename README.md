# Vision Artificial — Backend API

Node.js/Express API that receives images and returns structured JSON by analysing them with **GPT-4o Vision**. Automatically detects whether an image is a **receipt/ticket** (OCR) or a **vehicle/licence plate** (recognition).

Deployed on **Firebase Cloud Functions v2 (Cloud Run)**.

---

## How it works — end-to-end flow

```
Client (Postman / curl / frontend)
        │
        │  POST /api/analyze
        │  Content-Type: multipart/form-data
        │  field: image (1–20 files, max 10 MB each)
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  index.js  (Firebase entry-point)                       │
│  Wraps the Express app as a Cloud Function.             │
│  Injects OPENAI_API_KEY from Cloud Secret Manager.      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  src/app.js  (Express configuration)                    │
│  • CORS                                                 │
│  • JSON body parser                                     │
│  • Mounts Swagger UI on  GET /api-docs                  │
│  • Mounts raw OpenAPI spec on  GET /api-docs/swagger.json│
│  • Routes /api  →  analyzeRoutes                        │
│  • Global error handler (returns JSON, never HTML)      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  src/routes/analyzeRoutes.js                            │
│  uploadImages middleware (Busboy)                       │
│  • Reads req.rawBody (Firebase injects it here)         │
│  • Validates MIME type → only image/*                   │
│  • Enforces 10 MB per file, max 20 files                │
│  • Populates req.files[] with { buffer, mimetype, ... } │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  src/controllers/analyzeController.js                   │
│  • Validates req.files exists                           │
│  • Generates a batch_id (UUID prefix)                   │
│  • Calls visionService.analyzeImage() for EACH file     │
│    concurrently  (Promise.all)                          │
│  • Builds summary: total_tickets, total_spent,          │
│    vehicles_detected, vehicle_types                     │
│  • Returns JSON response                                │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  src/services/visionService.js                          │
│  • Converts image buffer → base64                       │
│  • Sends to GPT-4o with a carefully crafted prompt      │
│    that instructs the model to return ONE of:           │
│      · ticket schema  (merchant, items, totals…)        │
│      · vehicle schema (plate, brand, color…)            │
│      · unknown schema                                   │
│  • Parses the JSON response and returns it              │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
        Client receives structured JSON
```

---

## Project structure

```
vision-artificial-back/
│
├── index.js                    Firebase Cloud Functions v2 entry-point.
│                               Wraps the Express app and binds the
│                               OPENAI_API_KEY secret from Cloud Secret Manager.
│
├── server.js                   Local development entry-point.
│                               Loads .env and starts Express on PORT (default 3000).
│
├── firebase.json               Firebase project config (functions source, runtime).
│
├── package.json                Dependencies and npm scripts.
│
├── swagger.json                Auto-generated OpenAPI 3.0 spec (do not edit by hand).
│                               Regenerate with:  npm run swagger:export
│
├── scripts/
│   └── export-swagger.js       Node script that runs swagger-jsdoc and writes
│                               swagger.json to the project root.
│
└── src/
    │
    ├── app.js                  Express application factory.
    │                           Registers CORS, JSON parser, Swagger UI (/api-docs),
    │                           the /api router, and the global error handler.
    │
    ├── swagger.js              swagger-jsdoc configuration (OpenAPI metadata,
    │                           server URLs, tags). Scans src/routes/*.js and
    │                           src/app.js for @openapi annotations.
    │
    ├── routes/
    │   └── analyzeRoutes.js    Defines  POST /api/analyze.
    │                           Contains the uploadImages middleware that parses
    │                           multipart/form-data via Busboy, validates files,
    │                           and populates req.files[].
    │                           All OpenAPI JSDoc schemas live here.
    │
    ├── controllers/
    │   └── analyzeController.js  Orchestrates a request: validates input,
    │                             fans out to visionService in parallel,
    │                             builds the batch result + summary object,
    │                             and sends the HTTP response.
    │
    ├── services/
    │   └── visionService.js    Single function: analyzeImage(buffer, mimeType).
    │                           Encodes the image as base64, calls GPT-4o with a
    │                           unified prompt, and returns the parsed JSON.
    │                           OpenAI client is lazy-initialised (created on first
    │                           call so the secret is already injected at runtime).
    │
    └── middlewares/            Reserved for future cross-cutting middleware
                                (auth, rate-limiting, logging…).
```

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check — returns `{"status":"ok"}` |
| `POST` | `/analyze` | Analyse 1–20 images (receipts or vehicles) |
| `GET` | `/api-docs` | Interactive Swagger UI |
| `GET` | `/api-docs/swagger.json` | Raw OpenAPI 3.0 JSON spec |

### POST `/api/analyze` — request

- Content-Type: `multipart/form-data`
- Field name: `image` (repeat the field for multiple files)
- Accepted types: any `image/*` (JPEG, PNG, WebP, GIF…)
- Limits: max **10 MB** per file, max **20 files** per request

### POST `/api/analyze` — response shape

```json
{
  "meta": {
    "batch_id": "batch_a1b2c3d4",
    "processed_at": "2025-06-10T14:32:00.000Z",
    "total_images": 2
  },
  "results": [
    {
      "image_id": "img_1",
      "type": "ticket",
      "confidence": 0.97,
      "data": { "merchant": {}, "ticket": {}, "items": [], "totals": {}, "raw_text": "", "warnings": [] }
    },
    {
      "image_id": "img_2",
      "type": "vehicle",
      "confidence": 0.95,
      "data": { "vehicle": {}, "detection": {}, "raw_text": "", "warnings": [] }
    }
  ],
  "summary": {
    "total_tickets": 1,
    "total_spent": 13.38,
    "vehicles_detected": 1,
    "vehicle_types": { "car": 1 }
  }
}
```

`type` is always one of: `ticket` · `vehicle` · `unknown` · `error`

---

## Quick start (local)

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
echo "OPENAI_API_KEY=sk-..." > .env

# 3. Start with hot-reload
npm run dev
# → http://localhost:3000
```

Open the interactive docs: **http://localhost:3000/api-docs**

---

## Live demo

```bash
# Health check
curl https://us-central1-vision-artificial-back.cloudfunctions.net/api/health

# Analyse a receipt
curl -X POST https://us-central1-vision-artificial-back.cloudfunctions.net/api/analyze \
  -F "image=@ticket.jpg" | jq .summary

# Analyse a vehicle / licence plate
curl -X POST https://us-central1-vision-artificial-back.cloudfunctions.net/api/analyze \
  -F "image=@car.jpg" | jq .results[0].data.vehicle

# Batch: receipt + vehicle in one request
curl -X POST https://us-central1-vision-artificial-back.cloudfunctions.net/api/analyze \
  -F "image=@ticket.jpg" \
  -F "image=@car.jpg" | jq .
```

**Postman:** import `swagger.json` via *File › Import › OpenAPI*, then use the generated collection. In `POST /analyze` go to *Body › form-data*, add one or more keys named `image` of type *File*.

---

## Swagger export

The `swagger.json` file is generated from JSDoc `@openapi` annotations in the source files. After editing any annotation, regenerate it with:

```bash
npm run swagger:export
```

---

## Deploy to Firebase

```bash
# First deploy (or after changing secrets)
firebase functions:secrets:set OPENAI_API_KEY

# Deploy functions only
npm run deploy
```

Production URL: `https://us-central1-vision-artificial-back.cloudfunctions.net/api`

See [FIREBASE_DEPLOY.md](FIREBASE_DEPLOY.md) for full instructions.

---

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Local server with nodemon (hot-reload) |
| `npm start` | Production server |
| `npm run swagger:export` | Regenerate `swagger.json` |
| `npm run serve` | Firebase emulator |
| `npm run deploy` | Deploy to Firebase Cloud Functions |
| `npm run logs` | Stream Firebase function logs |

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key (injected by Cloud Secret Manager in production) |
| `PORT` | No | Local server port (default `3000`) |
| `VISION_PROMPT` | No | Override the default GPT-4o prompt |

---

## License

ISC


```
vision-artificial-back/
├── scripts/
│   └── export-swagger.js   # Genera swagger.json desde los comentarios JSDoc
├── src/
│   ├── app.js              # Express + Swagger UI montado en /api-docs
│   ├── controllers/        # Controladores
│   ├── middlewares/        # Middlewares personalizados
│   ├── routes/             # Rutas anotadas con OpenAPI JSDoc
│   ├── services/           # Lógica de negocio (OpenAI Vision)
│   └── swagger.js          # Configuración de swagger-jsdoc
├── swagger.json            # Especificación OpenAPI 3.0 exportada
├── server.js               # Punto de entrada
├── .env                    # Variables de entorno (no incluido en git)
└── package.json            # Dependencias y scripts
```

## 🛣️ Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Liveness check — devuelve `{ status: 'ok' }` |
| POST | `/api/analyze` | Analiza 1–20 imágenes (recibos o matrículas) |
| GET | `/api-docs` | **Swagger UI** interactivo |
| GET | `/api-docs/swagger.json` | Especificación OpenAPI 3.0 (raw JSON) |

---

## 📖 Documentació interactiva (Swagger)

Un cop arrencat el servidor, obre el navegador a:

```
http://localhost:3000/api-docs
```

O en producció (Firebase / Cloud Run):

```
https://us-central1-vision-artificial-back.cloudfunctions.net/api/api-docs
```

Per exportar l'especificació OpenAPI 3.0 a `swagger.json` (útil per importar a Postman o Gamma):

```bash
npm run swagger:export
```

---

## 🎬 Demo en viu

### curl – health check

```bash
curl https://us-central1-vision-artificial-back.cloudfunctions.net/api/health
# → {"status":"ok"}
```

### curl – analitzar un rebut

```bash
curl -X POST https://us-central1-vision-artificial-back.cloudfunctions.net/api/analyze \
  -F "image=@ticket_mercadona.jpg" | jq .
```

**Resposta esperada (resum):**

```json
{
  "meta": {
    "batch_id": "batch_a1b2c3d4",
    "processed_at": "2025-06-10T14:32:00.000Z",
    "total_images": 1
  },
  "results": [
    {
      "image_id": "img_1",
      "type": "ticket",
      "confidence": 0.97,
      "data": {
        "merchant": { "name": "Mercadona S.A.", "vat_number": "A46103834" },
        "totals": { "subtotal": 12.40, "tax": 0.98, "total": 13.38 }
      }
    }
  ],
  "summary": {
    "total_tickets": 1,
    "total_spent": 13.38,
    "vehicles_detected": 0,
    "vehicle_types": {}
  }
}
```

### curl – analitzar una matrícula

```bash
curl -X POST https://us-central1-vision-artificial-back.cloudfunctions.net/api/analyze \
  -F "image=@cotxe.jpg" | jq .results[0].data.vehicle
```

**Resposta esperada:**

```json
{
  "license_plate": "1234ABC",
  "plate_visible": true,
  "plate_unreadable_reason": null,
  "country": "ES",
  "vehicle_type": "car",
  "brand": "SEAT",
  "model": "Ibiza",
  "color": "red"
}
```

### curl – batch (2 imatges alhora)

```bash
curl -X POST https://us-central1-vision-artificial-back.cloudfunctions.net/api/analyze \
  -F "image=@ticket.jpg" \
  -F "image=@cotxe.jpg" | jq .summary
```

### Postman

1. Importa `swagger.json` → **File › Import › OpenAPI**.
2. Selecciona la col·lecció generada i tria l'entorn **Production**.
3. A la petició `POST /analyze`, ves a **Body › form-data**.
4. Afegeix una o més keys de tipus **File** amb nom `image` i selecciona els teus arxius.
5. Prem **Send**.

## 🔧 Configuración

### Variables de Entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| PORT     | Puerto del servidor | 3000 |

## 🌐 CORS

El servidor está configurado para aceptar peticiones desde cualquier origen. En producción, se recomienda configurar CORS para aceptar solo el dominio del frontend.

## 📦 Dependencias Principales

- **express**: Framework web
- **cors**: Gestión de CORS
- **dotenv**: Gestión de variables de entorno

## 🛠️ Desarrollo

### Scripts disponibles

| Script | Descripció |
|--------|------------|
| `npm run dev` | Servidor local amb nodemon (hot-reload) |
| `npm start` | Servidor en mode producció |
| `npm run swagger:export` | Genera / actualitza `swagger.json` |
| `npm run serve` | Emulador de Firebase Functions |
| `npm run deploy` | Desplega a Firebase Cloud Functions |
| `npm run logs` | Logs de Firebase Functions |

## ☁️ Despliegue en Firebase

Este proyecto está configurado para desplegarse en **Firebase Cloud Functions**.

### Pasos rápidos:

1. **Instala Firebase CLI** (si no lo tienes):
```bash
npm install -g firebase-tools
```

2. **Inicia sesión**:
```bash
firebase login
```

3. **Crea un proyecto** en [Firebase Console](https://console.firebase.google.com/)

4. **Configura el proyecto**:
   - Edita `.firebaserc` y reemplaza `tu-proyecto-firebase` con tu ID de proyecto

5. **Despliega**:
```bash
npm run deploy
```

Tu API estará disponible en: `https://us-central1-tu-proyecto.cloudfunctions.net/api`

📚 **Para más detalles**, consulta [FIREBASE_DEPLOY.md](FIREBASE_DEPLOY.md)

## 🤝 Contribución

1. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
2. Commit de tus cambios (`git commit -m 'Add some AmazingFeature'`)
3. Push a la rama (`git push origin feature/AmazingFeature`)
4. Abrir un Pull Request

## 📝 Licencia

ISC

## 👥 Autores

[Tu nombre aquí]

## 📞 Contacto

[Tu información de contacto]
