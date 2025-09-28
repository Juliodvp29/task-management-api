export const TASK_PRIORITIES = [
  { value: TaskPriority.LOW, label: 'Baja', color: '#10B981', icon: '🟢' },
  { value: TaskPriority.MEDIUM, label: 'Media', color: '#3B82F6', icon: '🟡' },
  { value: TaskPriority.HIGH, label: 'Alta', color: '#F59E0B', icon: '🟠' },
  { value: TaskPriority.URGENT, label: 'Urgente', color: '#EF4444', icon: '🔴' }
] as const;

export const TASK_STATUSES = [
  { value: TaskStatus.PENDING, label: 'Pendiente', color: '#6B7280' },
  { value: TaskStatus.IN_PROGRESS, label: 'En Progreso', color: '#3B82F6' },
  { value: TaskStatus.COMPLETED, label: 'Completada', color: '#10B981' },
  { value: TaskStatus.CANCELLED, label: 'Cancelada', color: '#EF4444' }
] as const;
