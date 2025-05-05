# Diagrama de Flujo del Sistema de Invitaciones

## Flujo Principal

```
┌─────────────────┐             ┌────────────────────────┐
│  Usuario Crea   │             │  Sistema Genera        │
│  Nueva Sesión   ├────────────>│  Invitaciones para     │
│  Compartida     │             │  Participantes         │
└─────────────────┘             └───────────┬────────────┘
                                           │
                                           ▼
┌─────────────────┐             ┌────────────────────────┐
│  Usuario        │             │  Invitaciones          │
│  Invitado Recibe │<────────────┤  Aparecen en Panel    │
│  Notificación   │             │  "Invitaciones         │
└───────┬─────────┘             │  Pendientes"           │
        │                       └────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  Usuario Invitado Decide                            │
└──────────────┬─────────────────────┬────────────────┘
               │                     │
               ▼                     ▼
┌─────────────────────┐      ┌─────────────────────┐
│ Usuario Acepta      │      │ Usuario Rechaza     │
│ Invitación          │      │ Invitación          │
└──────────┬──────────┘      └─────────┬───────────┘
           │                           │
           ▼                           ▼
┌─────────────────────┐      ┌─────────────────────┐
│ Se Añade a la       │      │ Se Elimina de la    │
│ Sesión Compartida   │      │ Lista de            │
└──────────┬──────────┘      │ Invitaciones        │
           │                 └─────────────────────┘
           │
           ▼
┌────────────────────────────────────────────┐
│ Sistema Verifica Estado de Invitaciones    │
└───────────────────┬────────────────────────┘
                   │
                   ▼
┌─────────────────────────────┐     ┌─────────────────────────────┐
│ Todos Han Aceptado:         │     │ Aún Hay Pendientes:         │
│ Sesión "Desbloqueada"       │     │ Sesión "En Espera"          │
└─────────────────────────────┘     └─────────────────────────────┘
```

## Estados de la Sesión Compartida

1. **Creación**: Cuando un usuario crea una nueva sesión compartida, esta comienza en estado "bloqueado" (isLocked: true).

2. **Espera de Confirmaciones**: La sesión permanece bloqueada mientras se espera que los participantes invitados acepten sus invitaciones.

3. **Desbloqueada**: Cuando todos los participantes han aceptado sus invitaciones, la sesión cambia a estado "desbloqueada" (isLocked: false).

4. **Activa**: Una sesión desbloqueada está activa y todos los participantes pueden interactuar con ella.

## Flujo de datos de la invitación

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Cliente      │     │   Servidor    │     │ Base de Datos │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                     │                     │
        │ Crear Sesión        │                     │
        │ con Participantes   │                     │
        │──────────────────────>                    │
        │                     │                     │
        │                     │ Guardar Sesión      │
        │                     │ con Participantes   │
        │                     │ en estado 'pending' │
        │                     │────────────────────>│
        │                     │                     │
        │                     │ Confirmar Creación  │
        │                     │<────────────────────│
        │                     │                     │
        │ Respuesta con       │                     │
        │ detalles de sesión  │                     │
        │<──────────────────────                    │
        │                     │                     │
        │                     │                     │
        │ Solicitar           │                     │
        │ Invitaciones        │                     │
        │ Pendientes          │                     │
        │──────────────────────>                    │
        │                     │                     │
        │                     │ Consultar           │
        │                     │ Invitaciones        │
        │                     │ Pendientes          │
        │                     │────────────────────>│
        │                     │                     │
        │                     │ Devolver Lista      │
        │                     │<────────────────────│
        │                     │                     │
        │ Lista de            │                     │
        │ Invitaciones        │                     │
        │<──────────────────────                    │
        │                     │                     │
        │                     │                     │
        │ Responder a         │                     │
        │ Invitación          │                     │
        │──────────────────────>                    │
        │                     │                     │
        │                     │ Actualizar Estado   │
        │                     │ de Participante     │
        │                     │────────────────────>│
        │                     │                     │
        │                     │ Verificar si        │
        │                     │ Todos Aceptaron     │
        │                     │<────────────────────│
        │                     │                     │
        │                     │ Si todos aceptaron, │
        │                     │ Desbloquear Sesión  │
        │                     │────────────────────>│
        │                     │                     │
        │ Confirmación de     │                     │
        │ Respuesta           │                     │
        │<──────────────────────                    │
        │                     │                     │
```

## API Endpoints para Invitaciones

1. **GET /api/shared-sessions/invitations/pending**
   - Obtiene todas las invitaciones pendientes para el usuario actual
   - Respuesta: Lista de invitaciones con detalles como nombre de sesión, creador, etc.

2. **POST /api/shared-sessions/:id/respond**
   - Responde a una invitación (aceptar o rechazar)
   - Parámetros:
     - `response`: 'accept' o 'reject'
   - Respuesta: Confirmación de acción

## Modelos de Datos

### Participante (objeto en SharedSession)
```javascript
{
  userId: ObjectId,      // Referencia al usuario (puede ser null si no está registrado)
  name: String,          // Nombre del participante
  email: String,         // Email del participante (obligatorio)
  role: String,          // 'admin' o 'member'
  status: String,        // 'pending', 'accepted', 'rejected'
  invitationDate: Date,  // Fecha de invitación
  responseDate: Date,    // Fecha de respuesta
  canEdit: Boolean,      // Permisos para editar
  canDelete: Boolean     // Permisos para eliminar
}
```

### SharedSession
```javascript
{
  name: String,                // Nombre de la sesión
  description: String,         // Descripción
  userId: ObjectId,            // Usuario creador
  participants: [Participant], // Lista de participantes
  isLocked: Boolean            // Estado de la sesión (bloqueada/desbloqueada)
  // ... otros campos
}
``` 