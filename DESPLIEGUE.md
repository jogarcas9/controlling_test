# Despliegue en Vercel

Este documento explica cómo desplegar la aplicación Controling en Vercel.

## Prerrequisitos

1. Tener una cuenta en [Vercel](https://vercel.com)
2. Tener Git instalado en tu computadora
3. Tener Node.js versión 18.x instalado

## Pasos para el despliegue

### 1. Preparar el repositorio

Asegúrate de que todos los cambios estén confirmados y subidos a tu repositorio de GitHub:

```bash
git add .
git commit -m "Preparación para despliegue en Vercel"
git push
```

### 2. Importar el proyecto en Vercel

1. Inicia sesión en [Vercel](https://vercel.com)
2. Haz clic en "Add New..." y selecciona "Project"
3. Importa tu repositorio de GitHub
4. Configura el proyecto:
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: npm run vercel-build
   - Output Directory: client/build
   - Install Command: npm run install-all

### 3. Configurar variables de entorno

En la sección "Environment Variables" de la configuración de Vercel, añade las siguientes variables:

- `MONGODB_URI`: URL de conexión a tu base de datos MongoDB
- `JWT_SECRET`: Clave secreta para los tokens JWT (usa una clave segura)
- `NODE_ENV`: production
- `VERCEL`: 1

### 4. Desplegar

Haz clic en "Deploy" y espera a que finalice el proceso de construcción y despliegue.

## Verificar el despliegue

Una vez completado el despliegue, Vercel proporcionará una URL para acceder a la aplicación (por ejemplo, https://controling.vercel.app). Puedes verificar que todo funciona correctamente:

1. Visita la URL proporcionada
2. Inicia sesión con tus credenciales
3. Comprueba que las funcionalidades principales funcionan:
   - Visualización de gastos
   - Creación de gastos
   - Actualización en tiempo real

## Solución de problemas

### La conexión en tiempo real no funciona

Si encuentras problemas con la actualización en tiempo real:

1. Verifica en la consola del navegador si hay errores de conexión a Socket.IO
2. Asegúrate de que la ruta `/socket.io` está correctamente configurada en el archivo vercel.json
3. Comprueba que el cliente está intentando conectarse a la URL correcta

### Errores en la conexión a MongoDB

Si la aplicación no puede conectarse a MongoDB:

1. Verifica que la variable de entorno `MONGODB_URI` está correctamente configurada
2. Asegúrate de que la dirección IP desde donde se ejecuta Vercel está permitida en la configuración de red de MongoDB Atlas

### Otros problemas

Para cualquier otro problema, puedes consultar los logs de despliegue en la interfaz de Vercel, que suelen proporcionar información detallada sobre los errores que pudieron ocurrir durante el proceso de construcción o despliegue. 