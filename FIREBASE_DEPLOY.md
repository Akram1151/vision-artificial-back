# Guía de Despliegue en Firebase

## 📋 Requisitos Previos

- Node.js >= 18.0.0
- Una cuenta de Firebase
- Firebase CLI instalado globalmente

## 🚀 Configuración Inicial

### 1. Instalar Firebase CLI (si aún no está instalado)
```bash
npm install -g firebase-tools
```

### 2. Iniciar sesión en Firebase
```bash
firebase login
```

### 3. Crear un proyecto en Firebase Console
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Copia el ID del proyecto

### 4. Configurar el proyecto local
Edita el archivo `.firebaserc` y reemplaza `tu-proyecto-firebase` con el ID de tu proyecto:
```json
{
  "projects": {
    "default": "tu-id-de-proyecto-firebase"
  }
}
```

## 🔧 Configuración de Variables de Entorno

Firebase Cloud Functions no usa archivos `.env` de la misma manera. Para configurar variables de entorno:

```bash
firebase functions:config:set someservice.key="THE API KEY"
```

Ejemplo:
```bash
firebase functions:config:set app.port="3000"
```

Para ver la configuración actual:
```bash
firebase functions:config:get
```

## 🏃 Pruebas Locales

### Emulador de Firebase
```bash
npm run serve
```
Esto iniciará el emulador de Cloud Functions en `http://localhost:5001/tu-proyecto/us-central1/api`

## 🚀 Despliegue a Producción

### Desplegar las funciones
```bash
npm run deploy
```

O directamente:
```bash
firebase deploy --only functions
```

### Primera vez
La primera vez que despliegues, Firebase te pedirá habilitar la facturación (plan Blaze). Cloud Functions requiere este plan, pero tiene un nivel gratuito generoso.

## 📍 URL de tu API

Después del despliegue, tu API estará disponible en:
```
https://us-central1-tu-proyecto.cloudfunctions.net/api
```

### Endpoints
- Health check: `https://us-central1-tu-proyecto.cloudfunctions.net/api/api/health`

**Nota:** Observa que `/api` aparece dos veces - una es el nombre de la función y la otra es tu ruta.

## 🔍 Ver Logs

```bash
npm run logs
```

O:
```bash
firebase functions:log
```

## 🌐 Configurar CORS para Frontend

Actualiza `src/app.js` con el origen de tu frontend Nuxt:

```javascript
const corsOptions = {
  origin: 'https://tu-dominio-nuxt.com',
  optionsSuccessStatus: 200
}
app.use(cors(corsOptions))
```

## 💡 Tips de Optimización

### Cold Starts
Las Cloud Functions pueden tener "cold starts". Para mitigar esto:
- Mantén tus funciones ligeras
- Considera usar Firebase Hosting con Cloud Functions para mejor rendimiento

### Costos
- Revisa el [pricing de Cloud Functions](https://firebase.google.com/pricing)
- El nivel gratuito incluye:
  - 2 millones de invocaciones/mes
  - 400,000 GB-segundos de tiempo de cómputo
  - 200,000 GHz-segundos de tiempo de CPU

## 🔄 Desarrollo Continuo

### Workflow recomendado:
1. Desarrolla localmente con `npm run dev` (usa server.js)
2. Prueba con emuladores: `npm run serve`
3. Despliega a producción: `npm run deploy`

## ⚠️ Notas Importantes

1. **Timeout**: Por defecto, Cloud Functions tienen un timeout de 60 segundos (máximo 540s)
2. **Memoria**: Por defecto 256MB (configurable hasta 8GB)
3. **Región**: Por defecto `us-central1` (configurable en firebase.json)

## 📚 Recursos

- [Documentación Firebase Functions](https://firebase.google.com/docs/functions)
- [Express en Cloud Functions](https://firebase.google.com/docs/hosting/functions)
- [Mejores prácticas](https://firebase.google.com/docs/functions/tips)
