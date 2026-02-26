# 🎉 Despliegue Exitoso en Firebase

Tu backend ha sido desplegado exitosamente en Firebase Cloud Functions!

## 📍 URL de tu API

**Base URL:**
```
https://us-central1-vision-artificial-back.cloudfunctions.net/api
```

## 🛣️ Endpoints Disponibles

### Health Check
```
GET https://us-central1-vision-artificial-back.cloudfunctions.net/api/api/health
```

**Respuesta esperada:**
```json
{
  "status": "ok"
}
```

**Nota:** Observa que `/api` aparece dos veces en la URL:
- Primera `/api` = nombre de la Cloud Function
- Segunda `/api` = tus rutas de Express (ej. `/api/health`)

## 🧪 Probar tu API

### Desde el navegador:
Abre esta URL en tu navegador:
```
https://us-central1-vision-artificial-back.cloudfunctions.net/api/api/health
```

### Desde terminal (PowerShell):
```powershell
Invoke-WebRequest -Uri "https://us-central1-vision-artificial-back.cloudfunctions.net/api/api/health" | Select-Object -ExpandProperty Content
```

### Desde Postman:
```
GET https://us-central1-vision-artificial-back.cloudfunctions.net/api/api/health
```

## 📊 Información del Despliegue

- **Proyecto Firebase:** 554097969221 (vision-artificial-back)
- **Región:** us-central1
- **Runtime:** Node.js 20
- **Memoria:** 256 MB
- **Versión:** v2 (2nd Gen)

## 🔧 Configuración para tu Frontend Nuxt

En tu aplicación Nuxt, configura la base URL de tu API:

```javascript
// nuxt.config.ts o .env
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      apiBase: 'https://us-central1-vision-artificial-back.cloudfunctions.net/api'
    }
  }
})
```

O en tu `.env` de Nuxt:
```env
NUXT_PUBLIC_API_BASE=https://us-central1-vision-artificial-back.cloudfunctions.net/api
```

## 🔄 Comandos Útiles

### Ver logs en tiempo real:
```bash
npm run logs
```

### Redesplegar después de cambios:
```bash
git add .
git commit -m "tus cambios"
git push
npm run deploy
```

### Ver funciones desplegadas:
```bash
firebase functions:list
```

### Eliminar una función:
```bash
firebase functions:delete api
```

## 📱 Configurar CORS para tu Frontend

Cuando tengas la URL de tu frontend Nuxt, actualiza [src/app.js](src/app.js):

```javascript
const cors = require('cors')

const corsOptions = {
  origin: 'https://tu-dominio-nuxt.com', // Reemplaza con tu URL de Nuxt
  optionsSuccessStatus: 200
}
app.use(cors(corsOptions))
```

## 💰 Costos

Firebase Cloud Functions tiene un nivel gratuito generoso:
- ✅ 2 millones de invocaciones/mes
- ✅ 400,000 GB-segundos de tiempo de cómputo
- ✅ 200,000 GHz-segundos de tiempo de CPU
- ✅ 5 GB de tráfico de red saliente

Para la mayoría de proyectos en desarrollo/MVP, esto es suficiente y **gratis**.

## ⚠️ Importante

1. **CORS:** Recuerda configurar CORS cuando tengas tu dominio frontend
2. **Variables de Entorno:** Usar `firebase functions:config:set` en lugar de `.env`
3. **Base de Datos:** Cuando agregues una BD, actualiza las variables de entorno
4. **Monitoreo:** Revisa los logs regularmente con `npm run logs`

## 🎊 ¡Todo listo!

Tu backend está desplegado y funcionando. El desarrollador de Nuxt puede empezar a consumir tu API usando la URL proporcionada.

---

**Última actualización:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
