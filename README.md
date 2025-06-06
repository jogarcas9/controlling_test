# Controling - Aplicación de Finanzas Personales

Controling es una aplicación web para gestionar finanzas personales, permitiendo a los usuarios registrar y analizar sus gastos e ingresos.

## Características

- Registro de gastos personales
- Seguimiento de ingresos
- Generación de reportes y gráficos
- Panel de control con estadísticas
- Sistema de autenticación y autorización
- Sesiones compartidas
- Notificaciones
- Soporte multilenguaje (i18n)
- Modo oscuro/claro

## Estructura del Proyecto

El proyecto está dividido en dos partes principales:

- **Client**: Frontend desarrollado con React y Material UI
- **Server**: Backend desarrollado con Node.js, Express y MongoDB

## Requisitos Previos

- Node.js (v22.x)
- npm (v10.x)
- MongoDB Atlas (o MongoDB local)

## Instalación

1. Clona el repositorio:
   ```
   git clone https://github.com/tu-usuario/controling.git
   cd controling
   ```

2. Instala todas las dependencias:
   ```
   npm run install-all
   ```

3. Configura las variables de entorno:
   - Copia el archivo `.env.example` a `.env` en la carpeta `server`
   - Actualiza las variables con tus credenciales

4. Inicia la aplicación en modo desarrollo:
   ```
   npm run dev
   ```

## Scripts Disponibles

- `npm run install-all`: Instala todas las dependencias (cliente y servidor)
- `npm run dev`: Inicia cliente y servidor en modo desarrollo
- `npm run build`: Construye el cliente para producción
- `npm run start`: Inicia el servidor en modo producción

## Despliegue

La aplicación está configurada para ser desplegada en:
- Frontend: Vercel
- Backend: Cualquier servicio que soporte Node.js (Heroku, Vercel, AWS, etc.)
- Base de datos: MongoDB Atlas

## Tecnologías Principales

### Frontend
- React
- Material UI
- Redux Toolkit
- React Router
- i18next (internacionalización)
- Chart.js / Recharts

### Backend
- Node.js
- Express
- MongoDB (Mongoose)
- JWT (Autenticación)
- Express-validator
- Bcrypt.js
- Winston (Logging)

## Contribuir

1. Haz fork del repositorio
2. Crea una rama con tu funcionalidad: `git checkout -b mi-nueva-funcionalidad`
3. Haz commit de tus cambios: `git commit -m 'Agrega nueva funcionalidad'`
4. Haz push a la rama: `git push origin mi-nueva-funcionalidad`
5. Envía un pull request

## Licencia

Este proyecto está licenciado bajo la Licencia ISC - ver el archivo LICENSE para más detalles.

## Mejoras de Responsividad

La aplicación ahora cuenta con un diseño completamente responsive que se adapta a diferentes dispositivos y tamaños de pantalla:

### Características responsive implementadas:

1. **Media Queries**: Se agregaron media queries en CSS para adaptar los estilos según los diferentes breakpoints:
   - Mobile (xs): hasta 599px
   - Tablet (sm): 600px a 959px
   - Desktop pequeño (md): 960px a 1279px
   - Desktop grande (lg): 1280px en adelante

2. **Navegación Adaptativa**:
   - En dispositivos móviles: barra de navegación inferior
   - En tablets: sidebar reducido o menú hamburguesa según el espacio
   - En desktop: sidebar completo con opción de minimizar

3. **Layout Flexible**:
   - Contenedores y tarjetas que se adaptan al ancho de la pantalla
   - Grids que cambian de 4 columnas en desktop a 2 en tablet y 1 en móvil
   - Espaciado y márgenes adaptables según el tamaño de pantalla

4. **Tipografía Responsive**:
   - Tamaños de fuente que aumentan progresivamente según el dispositivo
   - Base de 14px en móvil, 15px en tablet y 16px en desktop

5. **Componentes adaptados**:
   - Formularios que cambian de disposición horizontal a vertical en dispositivos pequeños
   - Diálogos que utilizan pantalla completa en móvil
   - Elementos de UI con tamaños escalables

### Uso de clases responsive:

- `.hide-xs`, `.hide-sm`, `.hide-md`, `.hide-lg` para ocultar elementos según el tamaño
- `.flex-col-xs`, `.flex-row-sm` para cambiar la dirección del flex
- `.p-responsive` para espaciado adaptativo
- `.text-center-xs`, `.text-left-sm` para alineación de texto adaptativa

La aplicación ahora ofrece una experiencia de usuario óptima en todos los dispositivos, desde smartphones hasta pantallas de escritorio grandes.

 