# 📋 Task Management API

API RESTful para gestión de tareas construida con Node.js, TypeScript y MySQL. Sistema completo con autenticación JWT, gestión de roles y permisos, organización de tareas en listas, calendario de eventos y sistema de comentarios.

## 🚀 Características

- **Autenticación JWT**: Tokens de acceso y refresh con manejo de sesiones
- **Sistema de Roles y Permisos**: Control granular de acceso basado en roles
- **Gestión de Tareas**: CRUD completo con prioridades, estados y asignaciones
- **Listas de Tareas**: Organización y reordenamiento de tareas
- **Calendario de Eventos**: Eventos personales y globales con recurrencia
- **Comentarios**: Sistema de comentarios en tareas
- **Seguridad**: Rate limiting, validaciones, bloqueo de cuentas
- **Configuraciones de Usuario**: Temas, idiomas, notificaciones personalizables

## 📦 Instalación

```bash
# Clonar repositorio
git clone <https://github.com/Juliodvp29/task-management-api.git>
cd task-management-api

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Ejecutar migraciones de base de datos
npm run migrate

# Iniciar servidor
npm run dev
```

## 🔧 Variables de Entorno

```env
# Servidor
PORT=3000
NODE_ENV=development
API_VERSION=1.0.0

# Base de Datos
DB_HOST=localhost
DB_PORT=3306
DB_NAME=task_management_api
DB_USER=root
DB_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=task-management-api
JWT_AUDIENCE=task-management-app

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM_NAME=Task Management API
EMAIL_FROM_ADDRESS=noreply@taskmanagement.com

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## 📚 Endpoints

### 🏠 General

#### GET `/`
Información general de la API
```json
{
  "success": true,
  "message": "Task Management API está funcionando correctamente",
  "data": {
    "service": "Task Management API",
    "version": "1.0.0",
    "environment": "development",
    "timestamp": "2025-10-07T...",
    "uptime": 3600,
    "status": "healthy"
  }
}
```

#### GET `/health`
Estado de salud del servidor
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-07T...",
    "uptime": 3600,
    "memory": {
      "used": 45,
      "total": 128
    },
    "environment": "development"
  }
}
```

---

### 🔐 Autenticación (`/api/auth`)

#### POST `/api/auth/register`
Registrar un nuevo usuario

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "Password123!",
  "first_name": "Juan",
  "last_name": "Pérez",
  "role_id": 4
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "user": {
      "id": 1,
      "email": "usuario@ejemplo.com",
      "first_name": "Juan",
      "last_name": "Pérez",
      "role": {...}
    }
  }
}
```

#### POST `/api/auth/login`
Iniciar sesión

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "Password123!",
  "device_info": "Chrome on Windows"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "data": {
    "user": {...},
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 900
  }
}
```

#### POST `/api/auth/refresh`
Renovar token de acceso

**Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST `/api/auth/logout`
Cerrar sesión (requiere autenticación)

**Headers:**
```
Authorization: Bearer <access_token>
```

#### GET `/api/auth/me`
Obtener información del usuario autenticado

**Headers:**
```
Authorization: Bearer <access_token>
```

#### POST `/api/auth/verify-token`
Verificar validez del token

**Headers:**
```
Authorization: Bearer <access_token>
```

---

### 👥 Usuarios (`/api/users`)

**Todos los endpoints requieren autenticación**

#### GET `/api/users`
Listar todos los usuarios (requiere permiso `users.view`)

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Elementos por página (default: 10, max: 100)
- `sort_by` (opcional): Campo de ordenamiento (id, email, first_name, etc.)
- `sort_order` (opcional): ASC o DESC
- `role_id` (opcional): Filtrar por rol
- `is_active` (opcional): Filtrar por estado (true/false)
- `search` (opcional): Buscar por nombre o email

**Ejemplo:**
```
GET /api/users?page=1&limit=20&role_id=4&is_active=true&search=juan
```

#### GET `/api/users/:id`
Obtener un usuario por ID (requiere permiso `users.view`)

#### POST `/api/users`
Crear un nuevo usuario (requiere permiso `users.create`)

**Body:**
```json
{
  "email": "nuevo@ejemplo.com",
  "password": "Password123!",
  "first_name": "María",
  "last_name": "García",
  "role_id": 4,
  "profile_picture": "https://..."
}
```

#### PUT `/api/users/:id`
Actualizar un usuario (requiere permiso `users.edit`)

**Body:**
```json
{
  "first_name": "María José",
  "last_name": "García López",
  "role_id": 3,
  "is_active": true
}
```

#### PATCH `/api/users/:id/status`
Activar/desactivar usuario (requiere permiso `users.edit`)

#### DELETE `/api/users/:id`
Desactivar usuario (soft delete) (requiere permiso `users.delete`)

#### DELETE `/api/users/:id/permanent`
Eliminar usuario permanentemente (requiere permiso `users.delete`)

#### POST `/api/users/:id/password/request-code`
Solicitar código de verificación para cambio de contraseña (requiere permiso `users.edit`)

#### PUT `/api/users/:id/password`
Cambiar contraseña con código de verificación (requiere permiso `users.edit`)

**Body:**
```json
{
  "verification_code": "123456",
  "new_password": "NewPassword123!"
}
```

#### GET `/api/users/:id/settings`
Obtener configuraciones del usuario (requiere ser el propio usuario o tener permiso `users.view`)

#### PUT `/api/users/:id/settings`
Actualizar configuraciones del usuario (requiere ser el propio usuario o tener permiso `users.edit`)

**Body:**
```json
{
  "theme": "dark",
  "language": "es",
  "timezone": "America/Bogota",
  "date_format": "DD/MM/YYYY",
  "time_format": "24h",
  "notifications": {
    "email": true,
    "push": false
  },
  "dashboard_layout": {
    "widgets": ["tasks", "calendar"]
  }
}
```

---

### 🎭 Roles (`/api/roles`)

**Todos los endpoints requieren autenticación**

#### GET `/api/roles`
Listar todos los roles (requiere permiso `roles.view`)

**Query Parameters:**
- `include_inactive`: Incluir roles inactivos (default: false)

#### GET `/api/roles/permissions`
Obtener lista de permisos disponibles (requiere permiso `roles.view`)

#### GET `/api/roles/:id`
Obtener un rol por ID (requiere permiso `roles.view`)

#### GET `/api/roles/:id/users`
Obtener usuarios con un rol específico (requiere permiso `roles.view`)

#### POST `/api/roles`
Crear un nuevo rol (requiere permiso `roles.create`)

**Body:**
```json
{
  "name": "custom_role",
  "display_name": "Rol Personalizado",
  "description": "Descripción del rol",
  "permissions": [
    "tasks.view",
    "tasks.create",
    "lists.view"
  ]
}
```

#### PUT `/api/roles/:id`
Actualizar un rol (requiere permiso `roles.edit`)

**Body:**
```json
{
  "display_name": "Nuevo Nombre",
  "description": "Nueva descripción",
  "permissions": ["tasks.view", "tasks.edit"],
  "is_active": true
}
```

#### PATCH `/api/roles/:id/status`
Activar/desactivar rol (requiere permiso `roles.edit`)

#### DELETE `/api/roles/:id`
Eliminar rol (requiere permiso `roles.delete`)

---

### 📝 Tareas (`/api/tasks`)

**Todos los endpoints requieren autenticación**

#### GET `/api/tasks`
Listar todas las tareas (requiere permiso `tasks.view`)

**Query Parameters:**
- `page`, `limit`, `sort_by`, `sort_order`: Paginación y ordenamiento
- `list_id`: Filtrar por lista
- `status`: Filtrar por estado (pending, in_progress, completed, cancelled)
- `priority`: Filtrar por prioridad (low, medium, high, urgent)
- `assigned_to`: Filtrar por usuario asignado
- `created_by`: Filtrar por creador
- `due_date_from`, `due_date_to`: Rango de fechas de vencimiento
- `search`: Buscar en título y descripción
- `overdue`: Solo tareas vencidas (true/false)

**Ejemplo:**
```
GET /api/tasks?status=in_progress&priority=high&assigned_to=5
```

#### GET `/api/tasks/:id`
Obtener una tarea por ID (requiere permiso `tasks.view`)

#### POST `/api/tasks`
Crear una nueva tarea (requiere permiso `tasks.create`)

**Body:**
```json
{
  "title": "Implementar autenticación",
  "description": "Agregar JWT y refresh tokens",
  "priority": "high",
  "list_id": 1,
  "assigned_to": 5,
  "due_date": "2025-10-15T10:00:00Z",
  "estimated_hours": 8,
  "tags": ["backend", "security"]
}
```

#### PUT `/api/tasks/:id`
Actualizar una tarea (requiere permiso `tasks.edit`)

**Body:**
```json
{
  "title": "Nuevo título",
  "status": "in_progress",
  "priority": "urgent",
  "actual_hours": 6
}
```

#### PATCH `/api/tasks/:id/status`
Cambiar estado de una tarea (requiere permiso `tasks.edit`)

**Body:**
```json
{
  "status": "completed"
}
```

#### PATCH `/api/tasks/:id/complete`
Marcar tarea como completada (requiere permiso `tasks.edit`)

#### PATCH `/api/tasks/:id/assign`
Asignar/desasignar tarea a un usuario (requiere permiso `tasks.assign`)

**Body:**
```json
{
  "assigned_to": 5
}
```

Para desasignar:
```json
{
  "assigned_to": null
}
```

#### POST `/api/tasks/:id/move`
Mover tarea a otra lista (requiere permiso `tasks.edit`)

**Body:**
```json
{
  "source_list_id": 1,
  "target_list_id": 2,
  "position": 0
}
```

#### DELETE `/api/tasks/:id`
Eliminar una tarea (requiere permiso `tasks.delete`)

---

### 💬 Comentarios de Tareas

#### GET `/api/tasks/:id/comments`
Obtener comentarios de una tarea (requiere permiso `comments.view`)

#### POST `/api/tasks/:id/comments`
Agregar un comentario (requiere permiso `comments.create`)

**Body:**
```json
{
  "content": "Este es un comentario sobre la tarea"
}
```

#### PUT `/api/tasks/:taskId/comments/:commentId`
Editar un comentario (requiere permiso `comments.edit` y ser el autor)

**Body:**
```json
{
  "content": "Comentario editado"
}
```

#### DELETE `/api/tasks/:taskId/comments/:commentId`
Eliminar un comentario (requiere permiso `comments.delete` y ser el autor)

---

### 📁 Listas de Tareas (`/api/lists`)

**Todos los endpoints requieren autenticación**

#### GET `/api/lists`
Listar todas las listas del usuario (requiere permiso `lists.view`)

**Query Parameters:**
- `include_inactive`: Incluir listas inactivas (default: false)
- `include_tasks`: Incluir tareas en cada lista (default: false)

#### GET `/api/lists/:id`
Obtener una lista por ID (requiere permiso `lists.view`)

#### GET `/api/lists/:id/tasks`
Obtener una lista con todas sus tareas (requiere permiso `lists.view`)

#### POST `/api/lists`
Crear una nueva lista (requiere permiso `lists.create`)

**Body:**
```json
{
  "name": "Desarrollo Backend",
  "description": "Tareas de desarrollo del servidor",
  "color": "#3b82f6",
  "position": 0
}
```

#### PUT `/api/lists/:id`
Actualizar una lista (requiere permiso `lists.edit`)

**Body:**
```json
{
  "name": "Nuevo nombre",
  "description": "Nueva descripción",
  "color": "#ef4444"
}
```

#### PATCH `/api/lists/:id/status`
Activar/desactivar lista (requiere permiso `lists.edit`)

#### POST `/api/lists/reorder`
Reordenar listas (requiere permiso `lists.edit`)

**Body:**
```json
{
  "lists": [
    { "id": 1, "position": 0 },
    { "id": 3, "position": 1 },
    { "id": 2, "position": 2 }
  ]
}
```

#### DELETE `/api/lists/:id`
Eliminar una lista (requiere permiso `lists.delete`)

---

### 📅 Calendario (`/api/calendar`)

**Todos los endpoints requieren autenticación**

#### GET `/api/calendar/events`
Listar eventos del calendario (requiere permiso `calendar.view`)

**Query Parameters:**
- `page`, `limit`, `sort_by`, `sort_order`: Paginación
- `event_type`: Filtrar por tipo (meeting, deadline, holiday, reminder, other)
- `is_global`: Filtrar por eventos globales (true/false)
- `date_from`, `date_to`: Rango de fechas
- `search`: Buscar en título y descripción

#### GET `/api/calendar/events/range`
Obtener eventos en un rango de fechas (requiere permiso `calendar.view`)

**Query Parameters:**
- `start_date`: Fecha inicial (requerido)
- `end_date`: Fecha final (requerido)

**Ejemplo:**
```
GET /api/calendar/events/range?start_date=2025-10-01&end_date=2025-10-31
```

#### GET `/api/calendar/events/upcoming`
Obtener próximos eventos (requiere permiso `calendar.view`)

**Query Parameters:**
- `days`: Número de días a futuro (default: 30, max: 365)

#### GET `/api/calendar/holidays`
Obtener días festivos de un año (requiere permiso `calendar.view`)

**Query Parameters:**
- `year`: Año (default: año actual)

#### GET `/api/calendar/events/:id`
Obtener un evento por ID (requiere permiso `calendar.view`)

#### POST `/api/calendar/events`
Crear un nuevo evento (requiere permiso `calendar.create`)

**Body:**
```json
{
  "title": "Reunión de equipo",
  "description": "Revisión semanal del proyecto",
  "event_date": "2025-10-15T14:00:00Z",
  "event_type": "meeting",
  "is_recurring": false,
  "color": "blue",
  "is_global": false
}
```

Para eventos recurrentes:
```json
{
  "title": "Stand-up diario",
  "event_date": "2025-10-08T09:00:00Z",
  "event_type": "meeting",
  "is_recurring": true,
  "recurrence_rule": {
    "frequency": "daily",
    "interval": 1,
    "end_date": "2025-12-31"
  },
  "is_global": true
}
```

#### PUT `/api/calendar/events/:id`
Actualizar un evento (requiere permiso `calendar.edit` y ser el creador)

#### PATCH `/api/calendar/events/:id/status`
Activar/desactivar evento (requiere permiso `calendar.edit` y ser el creador)

#### DELETE `/api/calendar/events/:id`
Eliminar un evento (requiere permiso `calendar.delete` y ser el creador)

---

## 🔑 Sistema de Permisos

### Permisos Disponibles

**Usuarios:**
- `users.view` - Ver usuarios
- `users.create` - Crear usuarios
- `users.edit` - Editar usuarios
- `users.delete` - Eliminar usuarios

**Roles:**
- `roles.view` - Ver roles
- `roles.create` - Crear roles
- `roles.edit` - Editar roles
- `roles.delete` - Eliminar roles

**Tareas:**
- `tasks.view` - Ver tareas
- `tasks.create` - Crear tareas
- `tasks.edit` - Editar tareas
- `tasks.delete` - Eliminar tareas
- `tasks.assign` - Asignar tareas

**Listas:**
- `lists.view` - Ver listas
- `lists.create` - Crear listas
- `lists.edit` - Editar listas
- `lists.delete` - Eliminar listas

**Calendario:**
- `calendar.view` - Ver eventos
- `calendar.create` - Crear eventos
- `calendar.edit` - Editar eventos
- `calendar.delete` - Eliminar eventos
- `calendar.global` - Gestionar eventos globales

**Comentarios:**
- `comments.view` - Ver comentarios
- `comments.create` - Crear comentarios
- `comments.edit` - Editar comentarios
- `comments.delete` - Eliminar comentarios

**Super Admin:**
- `*` - Todos los permisos

### Roles Predefinidos

1. **Super Admin** (`super_admin`): Todos los permisos
2. **Admin** (`admin`): Gestión completa excepto roles de sistema
3. **Manager** (`manager`): Gestión de tareas, listas y calendario
4. **User** (`user`): Operaciones básicas sobre sus propios recursos

---

## 🔒 Seguridad

### Rate Limiting

- **Autenticación** (`/api/auth`): 10 solicitudes por 15 minutos
- **API General**: 100 solicitudes por 15 minutos
- **Global**: 1000 solicitudes por 15 minutos

### Bloqueo de Cuenta

Después de 5 intentos fallidos de inicio de sesión, la cuenta se bloquea durante 15 minutos.

### Validación de Contraseñas

Las contraseñas deben cumplir:
- Mínimo 8 caracteres
- Máximo 128 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número
- Al menos un carácter especial

---

## 📊 Respuestas de la API

### Formato de Respuesta Exitosa

```json
{
  "success": true,
  "message": "Operación exitosa",
  "data": {...},
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```

### Formato de Respuesta de Error

```json
{
  "success": false,
  "message": "Descripción del error",
  "errors": ["Detalle 1", "Detalle 2"]
}
```

### Códigos de Estado HTTP

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `423` - Locked
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests con cobertura
npm run test:coverage
```

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.

---

## 👨‍💻 Autor

Desarrollado por [Julio Otero]

## 🤝 Contribuciones

