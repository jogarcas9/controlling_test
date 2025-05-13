# Instrucciones para desplegar Controling en Vercel

Este documento contiene instrucciones paso a paso para desplegar correctamente la aplicación Controling en Vercel, resolviendo los problemas más comunes.

## Preparación antes del despliegue

1. **Ejecuta el script de verificación**:
   ```
   node verify-deploy.js
   ```
   Este script comprobará que todos los archivos necesarios estén presentes y correctamente configurados.

2. **Comprueba la estructura de archivos**:
   - `server.js` debe estar en la raíz del proyecto
   - `vercel.json` debe estar en la raíz y correctamente configurado
   - Las carpetas `config`, `middleware`, `models` y `routes` deben existir con los archivos necesarios

3. **Verifica el archivo vercel.json**:
   El archivo vercel.json debe contener:
   ```json
   {
     "version": 2,
     "buildCommand": "npm install",
     "outputDirectory": ".",
     "builds": [
       {
         "src": "server.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "handle": "filesystem"
       },
       {
         "src": "/api/(.*)",
         "dest": "server.js"
       },
       {
         "src": "/socket.io/(.*)",
         "dest": "server.js"
       },
       {
         "src": "/(.*)",
         "dest": "server.js",
         "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
       }
     ],
     "env": {
       "MONGODB_URI": "tu-url-de-mongodb",
       "NODE_ENV": "production",
       "JWT_SECRET": "tu-secreto-jwt",
       "VERCEL": "1"
     }
   }
   ```

4. **Asegúrate de que package.json esté configurado correctamente**:
   ```json
   {
     "name": "controling_v3",
     "version": "1.0.0",
     "description": "Aplicación de finanzas personales",
     "main": "server.js",
     "engines": {
       "node": "18.x"
     },
     "scripts": {
       "start": "node server.js",
       "server": "nodemon server.js",
       ...
     },
     ...
   }
   ```

## Proceso de despliegue

### 1. Backend

1. **Inicia sesión en Vercel**:
   - Ve a [vercel.com](https://vercel.com) e inicia sesión

2. **Crea un nuevo proyecto para el backend**:
   - Haz clic en "Add New" → "Project"
   - Importa el repositorio desde GitHub

3. **Configura el proyecto**:
   - **Framework Preset**: Other
   - **Build Command**: El indicado en buildCommand de vercel.json (normalmente `npm install`)
   - **Output Directory**: .
   - **Install Command**: `npm install`

4. **Variables de entorno** (si no las has definido en vercel.json):
   - `MONGODB_URI`: URL de conexión a MongoDB
   - `JWT_SECRET`: Clave para firmar tokens JWT
   - `NODE_ENV`: `production`
   - `VERCEL`: `1`

5. **Despliega**:
   - Haz clic en "Deploy"

### 2. Frontend (si está separado)

Si tienes el frontend en una carpeta separada, debes desplegarlo por separado.

## Solución de problemas comunes

### Error 404 NOT_FOUND

1. **Causa**: Vercel no encuentra el punto de entrada del servidor.
   **Solución**: Asegúrate de que server.js exporte correctamente la app:
   ```javascript
   if (isVercel) {
     // Para Vercel Serverless Functions
     module.exports = app;
     module.exports.app = app;
     module.exports.server = server;
   }
   ```

2. **Causa**: Configuración incorrecta en vercel.json.
   **Solución**: Verifica que vercel.json incluya la configuración de builds y routes correcta.

3. **Causa**: Dependencias faltantes.
   **Solución**: Asegúrate de que todas las dependencias estén correctamente listadas en package.json.

### Errores en endpoints de API

1. **Causa**: Rutas mal configuradas en vercel.json.
   **Solución**: Verifica que la sección "routes" de vercel.json maneje correctamente tanto /api/ como otras rutas.

2. **Causa**: Problema con el middleware o rutas en server.js.
   **Solución**: Añade logs detallados en el servidor y manejo adecuado de errores.

### Error de conexión a MongoDB

1. **Causa**: URL de conexión incorrecta o problemas de red.
   **Solución**: Verifica que la URL de MongoDB sea correcta y que la IP de Vercel esté en la lista de direcciones permitidas en MongoDB Atlas.

## Verificación del despliegue

Una vez completado el despliegue, verifica que:

1. **La ruta raíz responde correctamente**:
   ```
   curl https://tu-dominio.vercel.app/
   ```

2. **El endpoint de health responde**:
   ```
   curl https://tu-dominio.vercel.app/api/health
   ```

## Mantenimiento

Para futuras actualizaciones:

1. Haz los cambios en tu código local
2. Prueba localmente con `npm run dev`
3. Ejecuta `node verify-deploy.js` para asegurarte de que todo está correcto
4. Haz commit y push a GitHub
5. Vercel desplegará automáticamente los cambios 