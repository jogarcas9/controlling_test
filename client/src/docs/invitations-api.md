# API de Gestión de Invitaciones

## Introducción

Esta documentación describe los endpoints de API relacionados con la gestión de invitaciones para sesiones compartidas en la plataforma. El sistema de invitaciones permite a los usuarios:

1. Recibir invitaciones para unirse a sesiones compartidas
2. Ver invitaciones pendientes
3. Aceptar o rechazar invitaciones
4. Gestionar el estado de las sesiones según la respuesta de los participantes

## Autenticación

Todos los endpoints requieren autenticación mediante token JWT. El token debe enviarse en el header de la solicitud:

```
Authorization: Bearer [token]
```

## Endpoints

### Obtener Invitaciones Pendientes

```
GET /api/shared-sessions/invitations/pending
```

Obtiene todas las invitaciones pendientes para el usuario autenticado.

#### Respuesta

```json
[
  {
    "_id": "604f75a123b49c87654321fe",
    "sessionId": "604f75a123b49c87654321fe",
    "sessionName": "Viaje a Barcelona",
    "description": "Gastos compartidos para el viaje a Barcelona",
    "invitedBy": "Juan Pérez",
    "invitationDate": "2023-09-15T14:30:00.000Z",
    "participantsCount": 5,
    "participants": [
      {
        "name": "Juan Pérez",
        "email": "juan@ejemplo.com",
        "status": "accepted"
      },
      {
        "name": "Ana García",
        "email": "ana@ejemplo.com",
        "status": "pending"
      }
    ],
    "color": "#3f51b5"
  }
]
```

#### Errores

| Código | Descripción |
|--------|-------------|
| 401 | No autorizado - Token inválido o expirado |
| 500 | Error interno del servidor |

### Responder a una Invitación

```
POST /api/shared-sessions/:id/respond
```

Permite al usuario actual aceptar o rechazar una invitación a una sesión compartida.

#### Parámetros de URL

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| id | string | ID de la sesión compartida |

#### Cuerpo de la solicitud

```json
{
  "response": "accept" // o "reject"
}
```

#### Respuesta

```json
{
  "message": "Has aceptado la invitación a la sesión compartida",
  "status": "accepted",
  "sessionId": "604f75a123b49c87654321fe"
}
```

#### Errores

| Código | Descripción |
|--------|-------------|
| 400 | Solicitud inválida - Respuesta no válida o ya respondida |
| 401 | No autorizado - Token inválido o expirado |
| 403 | Prohibido - El usuario no es un participante de la sesión |
| 404 | No encontrado - Sesión no encontrada |
| 500 | Error interno del servidor |

## Modelo de Datos

### Invitación Pendiente (Objeto de Respuesta)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| _id | string | ID de la sesión (igual que sessionId) |
| sessionId | string | ID de la sesión compartida |
| sessionName | string | Nombre de la sesión compartida |
| description | string | Descripción de la sesión |
| invitedBy | string | Nombre del usuario que envió la invitación |
| invitationDate | date | Fecha en que se envió la invitación |
| participantsCount | number | Número total de participantes |
| participants | array | Lista de participantes con sus datos |
| color | string | Color asignado a la sesión (para UI) |

### Participante (en el contexto de invitaciones)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| name | string | Nombre del participante |
| email | string | Email del participante |
| status | string | Estado: "pending", "accepted", "rejected" |

## Estados de Sesión

Cuando se responde a las invitaciones, el estado de la sesión puede cambiar:

- **En espera (isLocked: true)**: La sesión está bloqueada mientras hay participantes con invitaciones pendientes.
- **Desbloqueada (isLocked: false)**: Todos los participantes han aceptado sus invitaciones y la sesión está activa.

El sistema verifica automáticamente si todos los participantes han aceptado sus invitaciones cuando alguien responde. Si todos han aceptado, la sesión se desbloquea.

## Ejemplos de Uso

### Obtener invitaciones pendientes

```javascript
// Cliente
const getInvitations = async () => {
  try {
    const response = await axios.get('/api/shared-sessions/invitations/pending', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener invitaciones:', error);
    throw error;
  }
};
```

### Aceptar una invitación

```javascript
// Cliente
const acceptInvitation = async (sessionId) => {
  try {
    const response = await axios.post(`/api/shared-sessions/${sessionId}/respond`, 
      { response: 'accept' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error al aceptar invitación:', error);
    throw error;
  }
};
```

### Rechazar una invitación

```javascript
// Cliente
const rejectInvitation = async (sessionId) => {
  try {
    const response = await axios.post(`/api/shared-sessions/${sessionId}/respond`, 
      { response: 'reject' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error al rechazar invitación:', error);
    throw error;
  }
};
``` 