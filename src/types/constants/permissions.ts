export const PERMISSIONS = {
  // Usuarios
  'users.view': 'Ver usuarios',
  'users.create': 'Crear usuarios',
  'users.edit': 'Editar usuarios',
  'users.delete': 'Eliminar usuarios',
  'users.manage': 'Gestionar usuarios',

  // Roles
  'roles.view': 'Ver roles',
  'roles.create': 'Crear roles',
  'roles.edit': 'Editar roles',
  'roles.delete': 'Eliminar roles',
  'roles.manage': 'Gestionar roles',

  // Tareas
  'tasks.view': 'Ver tareas',
  'tasks.create': 'Crear tareas',
  'tasks.edit': 'Editar tareas',
  'tasks.edit.own': 'Editar tareas propias',
  'tasks.delete': 'Eliminar tareas',
  'tasks.delete.own': 'Eliminar tareas propias',
  'tasks.assign': 'Asignar tareas',
  'tasks.manage': 'Gestionar tareas',

  // Listas
  'lists.view': 'Ver listas',
  'lists.create': 'Crear listas',
  'lists.edit': 'Editar listas',
  'lists.edit.own': 'Editar listas propias',
  'lists.delete': 'Eliminar listas',
  'lists.delete.own': 'Eliminar listas propias',
  'lists.share': 'Compartir listas',

  // Calendario
  'calendar.view': 'Ver calendario',
  'calendar.create': 'Crear eventos',
  'calendar.edit': 'Editar eventos',
  'calendar.delete': 'Eliminar eventos',
  'calendar.manage': 'Gestionar calendario',
  'calendar.global': 'Gestionar eventos globales',

  // Comentarios
  'comments.view': 'Ver comentarios',
  'comments.create': 'Crear comentarios',
  'comments.edit': 'Editar comentarios',
  'comments.edit.own': 'Editar comentarios propios',
  'comments.delete': 'Eliminar comentarios',
  'comments.delete.own': 'Eliminar comentarios propios',

  // Sistema
  'system.config': 'Configurar sistema',
  'system.logs': 'Ver logs del sistema',
  'system.backup': 'Realizar backups',
  'system.maintenance': 'Modo mantenimiento',

  // Reportes
  'reports.view': 'Ver reportes',
  'reports.create': 'Crear reportes',
  'reports.export': 'Exportar reportes',

  // Archivos
  'files.upload': 'Subir archivos',
  'files.delete': 'Eliminar archivos',

  // Perfil
  'profile.edit': 'Editar perfil propio',
  'profile.view': 'Ver perfil propio',

  // Comodín
  '*': 'Todos los permisos'
} as const;

export type Permission = keyof typeof PERMISSIONS;