# Instrucciones de Despliegue Actualizado para Controling PWA

Este documento contiene las instrucciones actualizadas para desplegar correctamente la aplicación Controling como una PWA utilizando Vercel.

## Estructura de despliegue

La aplicación está dividida en dos partes que se deben desplegar por separado:

1. **Backend** - API y servidor Socket.IO
2. **Frontend** - Aplicación React PWA

## Despliegue del Backend

### Pasos:

1. **Iniciar sesión en Vercel**:
   - Visita [vercel.com](https://vercel.com) e inicia sesión

2. **Crear un nuevo proyecto para el backend**:
   - Haz clic en "Add New" → "Project"
   - Importa el repositorio desde GitHub
   - Nombra el proyecto: `controling-backend`

3. **Configuración del proyecto backend**:
   - Framework: Node.js
   - Root Directory: ./
   - Build Command: `npm install`
   - Output Directory: ./
   - Install Command: `npm install`

4. **Variables de entorno**:
   - `MONGODB_URI`: `mongodb+srv://jogarcas29:7JAw4tGRRjos9I8d@homeexpenses.acabyfv.mongodb.net/controlling_app`
   - `JWT_SECRET`: `xJ3!k9$mP2#nQ7@vR4*tL8%wY5&zU6`
   - `NODE_ENV`: `production`
   - `VERCEL`: `1`

5. **Dominio personalizado**:
   - Configurar un dominio personalizado: `controling-backend.vercel.app`

## Despliegue del Frontend

### Pasos:

1. **Crear un nuevo proyecto para el frontend**:
   - Haz clic en "Add New" → "Project"
   - Importa el mismo repositorio desde GitHub
   - Nombra el proyecto: `controlling-pwa-frontend`

2. **Configuración del proyecto frontend**:
   - Framework: Create React App
   - Root Directory: `./client`
   - Build Command: `npm install && npm run build`
   - Output Directory: `build`
   - Install Command: `npm install`

3. **Dominio personalizado**:
   - Configurar un dominio personalizado: `controlling-pwa-frontend.vercel.app`

## Verificación del despliegue

Una vez completados ambos despliegues, verifica que:

1. **El frontend puede acceder al backend**:
   - Visita `https://controlling-pwa-frontend.vercel.app`
   - Intenta iniciar sesión o registrarte
   - Comprueba en la consola del navegador que no hay errores CORS o de conexión

2. **La PWA funciona correctamente**:
   - Visita la aplicación en un dispositivo móvil
   - Debería aparecer un banner para instalar la PWA
   - Instala la aplicación y verifica que se ejecuta correctamente como una aplicación independiente
   - Comprueba que funciona en modo offline para las funcionalidades básicas

3. **El Service Worker está registrado**:
   - En las herramientas de desarrollo del navegador, ve a la pestaña "Application"
   - Comprueba que el Service Worker está registrado y activo

## Solución de problemas comunes

### Error 404 NOT_FOUND en el despliegue del servidor

Si obtienes un error 404 al desplegar el backend en Vercel, verifica lo siguiente:

1. **Estructura de archivos correcta**:
   - Asegúrate de que `server.js` esté en la raíz del proyecto
   - Verifica que las carpetas `config`, `routes` y `models` estén también en la raíz

2. **Configuración del vercel.json**:
   - Comprueba que el archivo vercel.json tenga la siguiente estructura:
   ```json
   {
     "version": 2,
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
     ]
   }
   ```

3. **package.json correcto**:
   - El archivo `package.json` debe tener todas las dependencias necesarias
   - El `main` debe apuntar a `server.js` en la raíz

4. **Rutas básicas para pruebas**:
   - Añade rutas básicas para verificar que el servidor está funcionando:
   ```javascript
   app.get('/', (req, res) => {
     res.json({ message: 'Servidor Controling funcionando correctamente' });
   });
   ```

### Error 401 al cargar manifest.json
- Asegúrate de que el archivo `client/public/manifest.json` tenga las rutas correctas con barras iniciales (`/images/logo192.png`)
- Verifica que los archivos de iconos existan en las ubicaciones especificadas en el manifest

### Error 508 (Loop Detected)
- Revisa las redirecciones en el middleware de autenticación
- Comprueba que el `vercel.json` del backend esté configurado para manejar correctamente las rutas de API

### Problemas con los iconos
- Verifica que los iconos estén en la carpeta correcta (`client/public/images/`)
- Comprueba que las rutas en el manifest comienzan con `/`
- Usa las herramientas de desarrollador para ver qué rutas están fallando

## Comandos útiles para depuración

Verificar el estado del servicio backend:
```
curl https://controling-backend.vercel.app/api/health
```

Verificar acceso al manifest.json:
```
curl -I https://controlling-pwa-frontend.vercel.app/manifest.json
```

Verificar que el servidor responde en la raíz:
```
curl https://controling-backend.vercel.app/
```

## Notas adicionales

- Los cambios en el despliegue pueden tardar unos minutos en propagarse
- Si realizas cambios en el código, necesitarás volver a desplegar ambos proyectos
- Para probar la PWA localmente, puedes usar `npm run dev` en la raíz del proyecto 