-- =========================================
-- TASK MANAGEMENT API - DATABASE SCHEMA
-- =========================================

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS task_management_api 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE task_management_api;

-- =========================================
-- TABLA DE ROLES
-- =========================================
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_roles_name (name),
    INDEX idx_roles_active (is_active)
);

-- =========================================
-- TABLA DE USUARIOS
-- =========================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    profile_picture VARCHAR(500) NULL,
    role_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP NULL,
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    email_verification_token VARCHAR(255) NULL,
    password_reset_token VARCHAR(255) NULL,
    password_reset_expires TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role_id),
    INDEX idx_users_active (is_active),
    INDEX idx_users_verification_token (email_verification_token),
    INDEX idx_users_reset_token (password_reset_token)
);

-- =========================================
-- TABLA DE SESIONES DE USUARIO
-- =========================================
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) NOT NULL UNIQUE,
    device_info VARCHAR(500),
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_token (session_token),
    INDEX idx_sessions_refresh (refresh_token),
    INDEX idx_sessions_active (is_active),
    INDEX idx_sessions_expires (expires_at)
);

-- =========================================
-- TABLA DE CONFIGURACIONES DE USUARIO
-- =========================================
CREATE TABLE user_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'es',
    timezone VARCHAR(50) DEFAULT 'America/Bogota',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    time_format VARCHAR(10) DEFAULT '24h',
    -- Se elimina DEFAULT '{}'
    notifications JSON NOT NULL,
    -- Se elimina DEFAULT '{}'
    dashboard_layout JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_settings_user (user_id)
);

-- =========================================
-- TABLA DE LISTAS DE TAREAS
-- =========================================
CREATE TABLE task_lists (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(50),
    position INT NOT NULL DEFAULT 0,
    user_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_lists_user (user_id),
    INDEX idx_lists_position (position),
    INDEX idx_lists_active (is_active)
);

-- =========================================
-- TABLA DE TAREAS
-- =========================================
CREATE TABLE tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    position INT NOT NULL DEFAULT 0,
    list_id INT NOT NULL,
    assigned_to INT NULL,
    created_by INT NOT NULL,
    due_date TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    estimated_hours DECIMAL(5,2) NULL,
    actual_hours DECIMAL(5,2) NULL,
    tags JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (list_id) REFERENCES task_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tasks_list (list_id),
    INDEX idx_tasks_assigned (assigned_to),
    INDEX idx_tasks_created_by (created_by),
    INDEX idx_tasks_priority (priority),
    INDEX idx_tasks_status (status),
    INDEX idx_tasks_due_date (due_date),
    INDEX idx_tasks_position (position)
);

-- =========================================
-- TABLA DE COMENTARIOS EN TAREAS
-- =========================================
CREATE TABLE task_comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_comments_task (task_id),
    INDEX idx_comments_user (user_id),
    INDEX idx_comments_created (created_at)
);

-- =========================================
-- TABLA DE DÍAS FESTIVOS/ESPECIALES
-- =========================================
CREATE TABLE calendar_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_type ENUM('holiday', 'special', 'personal') NOT NULL DEFAULT 'holiday',
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule JSON NULL,
    color VARCHAR(50) DEFAULT 'primary',
    is_global BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_events_date (event_date),
    INDEX idx_events_type (event_type),
    INDEX idx_events_global (is_global),
    INDEX idx_events_created_by (created_by),
    INDEX idx_events_active (is_active)
);

-- =========================================
-- TABLA DE HISTORIAL DE ACTIVIDADES
-- =========================================
CREATE TABLE activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_entity (entity_type, entity_id),
    INDEX idx_activity_action (action),
    INDEX idx_activity_created (created_at)
);

-- =========================================
-- TABLA DE ARCHIVOS ADJUNTOS
-- =========================================
CREATE TABLE attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_attachments_entity (entity_type, entity_id),
    INDEX idx_attachments_user (uploaded_by),
    INDEX idx_attachments_created (created_at)
);

-- =========================================
-- TABLA DE NOTIFICACIONES
-- =========================================
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NULL,
    entity_id INT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_read (is_read),
    INDEX idx_notifications_type (type),
    INDEX idx_notifications_entity (entity_type, entity_id),
    INDEX idx_notifications_created (created_at)
);

-- =========================================
-- DATOS INICIALES
-- =========================================

-- Insertar roles por defecto
INSERT INTO roles (name, display_name, description, permissions) VALUES
('super_admin', 'Super Administrador', 'Acceso completo al sistema', JSON_ARRAY('*')),
('admin', 'Administrador', 'Administrador del sistema', JSON_ARRAY('users.manage', 'roles.manage', 'system.config', 'reports.view')),
('manager', 'Manager', 'Gestión de equipos y proyectos', JSON_ARRAY('tasks.manage', 'users.view', 'reports.view', 'calendar.manage')),
('user', 'Usuario', 'Usuario estándar', JSON_ARRAY('tasks.create', 'tasks.edit.own', 'calendar.view', 'profile.edit'));

-- Insertar usuario administrador por defecto
-- Contraseña: admin123 (se debe cambiar en producción)
INSERT INTO users (email, password_hash, first_name, last_name, role_id, is_active, is_email_verified) VALUES
('admin@taskmanagement.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNi2I6qjk7YsG', 'Admin', 'System', 1, TRUE, TRUE);

-- Insertar configuraciones por defecto para el admin
INSERT INTO user_settings (user_id, notifications, dashboard_layout) VALUES (1, '{}', '{}');

-- =========================================
-- TRIGGERS PARA ACTIVIDAD AUTOMATICA
-- =========================================

DELIMITER //

-- Trigger para loggear cambios en usuarios
CREATE TRIGGER tr_users_update 
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, old_values, new_values, description)
    VALUES (
        NEW.id, 
        'UPDATE', 
        'user', 
        NEW.id,
        JSON_OBJECT('email', OLD.email, 'first_name', OLD.first_name, 'last_name', OLD.last_name, 'role_id', OLD.role_id, 'is_active', OLD.is_active),
        JSON_OBJECT('email', NEW.email, 'first_name', NEW.first_name, 'last_name', NEW.last_name, 'role_id', NEW.role_id, 'is_active', NEW.is_active),
        CONCAT('Usuario ', NEW.first_name, ' ', NEW.last_name, ' fue actualizado')
    );
END//

-- Trigger para loggear cambios en tareas
CREATE TRIGGER tr_tasks_update 
AFTER UPDATE ON tasks
FOR EACH ROW
BEGIN
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, old_values, new_values, description)
    VALUES (
        NEW.assigned_to, 
        'UPDATE', 
        'task', 
        NEW.id,
        JSON_OBJECT('title', OLD.title, 'status', OLD.status, 'priority', OLD.priority, 'list_id', OLD.list_id),
        JSON_OBJECT('title', NEW.title, 'status', NEW.status, 'priority', NEW.priority, 'list_id', NEW.list_id),
        CONCAT('Tarea "', NEW.title, '" fue actualizada')
    );
END//

-- Trigger para completar tareas
CREATE TRIGGER tr_tasks_complete
BEFORE UPDATE ON tasks
FOR EACH ROW
BEGIN
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
        SET NEW.completed_at = CURRENT_TIMESTAMP;
    ELSEIF OLD.status = 'completed' AND NEW.status != 'completed' THEN
        SET NEW.completed_at = NULL;
    END IF;
END//

DELIMITER ;

-- =========================================
-- VISTAS ÚTILES
-- =========================================

-- Vista de usuarios con información de rol
CREATE VIEW v_users_with_roles AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.profile_picture,
    u.is_active,
    u.is_email_verified,
    u.last_login,
    u.created_at,
    r.name as role_name,
    r.display_name as role_display_name,
    r.permissions as role_permissions
FROM users u
JOIN roles r ON u.role_id = r.id;

-- Vista de tareas con información completa
CREATE VIEW v_tasks_complete AS
SELECT 
    t.id,
    t.title,
    t.description,
    t.priority,
    t.status,
    t.position,
    t.due_date,
    t.completed_at,
    t.estimated_hours,
    t.actual_hours,
    t.tags,
    t.created_at,
    t.updated_at,
    tl.name as list_name,
    tl.color as list_color,
    creator.first_name as created_by_name,
    creator.email as created_by_email,
    assignee.first_name as assigned_to_name,
    assignee.email as assigned_to_email
FROM tasks t
JOIN task_lists tl ON t.list_id = tl.id
JOIN users creator ON t.created_by = creator.id
LEFT JOIN users assignee ON t.assigned_to = assignee.id;

-- Vista de estadísticas por usuario
CREATE VIEW v_user_stats AS
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.email,
    COUNT(DISTINCT tl.id) as total_lists,
    COUNT(DISTINCT CASE WHEN t.status != 'completed' THEN t.id END) as active_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
    COUNT(DISTINCT CASE WHEN t.priority = 'urgent' AND t.status != 'completed' THEN t.id END) as urgent_tasks,
    COUNT(DISTINCT CASE WHEN t.due_date < NOW() AND t.status != 'completed' THEN t.id END) as overdue_tasks
FROM users u
LEFT JOIN task_lists tl ON u.id = tl.user_id AND tl.is_active = TRUE
LEFT JOIN tasks t ON tl.id = t.list_id
WHERE u.is_active = TRUE
GROUP BY u.id, u.first_name, u.last_name, u.email;


-- Agregar nuevas columnas a la tabla users
ALTER TABLE users
ADD COLUMN password_change_code VARCHAR(6) NULL AFTER password_reset_expires,
ADD COLUMN password_change_code_expires TIMESTAMP NULL AFTER password_change_code,
ADD INDEX idx_users_password_change_code (password_change_code);

-- Nota: Estos campos se usarán para almacenar temporalmente el código de verificación
-- cuando un administrador quiera cambiar la contraseña de un usuario