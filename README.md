# Vision Artificial - Backend API

Backend desarrollado con Node.js y Express para el proyecto Vision Artificial. Este servidor proporciona la API REST para la aplicación frontend desarrollada en Nuxt.

## 📋 Requisitos Previos

- Node.js >= 14.0.0
- npm o yarn

## 🚀 Instalación

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd vision-artificial-back
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
```
Edita el archivo `.env` con tus configuraciones específicas.

## 🏃 Ejecución

### Modo desarrollo
```bash
npm run dev
```

### Modo producción
```bash
npm start
```

El servidor se ejecutará en `http://localhost:3000` por defecto (o el puerto definido en `.env`).

## 📁 Estructura del Proyecto

```
vision-artificial-back/
├── src/
│   ├── app.js              # Configuración de Express
│   ├── controllers/        # Controladores de la aplicación
│   ├── middlewares/        # Middlewares personalizados
│   ├── routes/             # Definición de rutas
│   └── services/           # Lógica de negocio
├── server.js               # Punto de entrada del servidor
├── .env                    # Variables de entorno (no incluido en git)
├── .env.example            # Ejemplo de variables de entorno
└── package.json            # Dependencias y scripts
```

## 🛣️ Endpoints API

### Health Check
- **GET** `/api/health` - Verificar estado del servidor
  - Respuesta: `{ "status": "ok" }`

*Más endpoints serán documentados a medida que se desarrollen*

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

- `npm run dev` - Inicia el servidor en modo desarrollo con nodemon
- `npm start` - Inicia el servidor en modo producción

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
