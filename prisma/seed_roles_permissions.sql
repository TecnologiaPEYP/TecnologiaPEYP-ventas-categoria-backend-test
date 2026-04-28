BEGIN;

-- Insert roles if they don't exist
INSERT INTO `Role` (name, description, createdAt, updatedAt)
SELECT 'admin', 'Administrator', NOW(), NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `Role` WHERE name = 'admin');
INSERT INTO `Role` (name, description, createdAt, updatedAt)
SELECT 'empleado', 'Empleado', NOW(), NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `Role` WHERE name = 'empleado');
INSERT INTO `Role` (name, description, createdAt, updatedAt)
SELECT 'supervisor', 'Supervisor', NOW(), NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `Role` WHERE name = 'supervisor');

-- Insert permissions if they don't exist
INSERT INTO `Permission` (name, description, module, action, createdAt, updatedAt)
SELECT 'dashboard:view','View dashboard','dashboard','view',NOW(),NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `Permission` WHERE name = 'dashboard:view');
INSERT INTO `Permission` (name, description, module, action, createdAt, updatedAt)
SELECT 'users:manage','Manage users','users','manage',NOW(),NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `Permission` WHERE name = 'users:manage');
INSERT INTO `Permission` (name, description, module, action, createdAt, updatedAt)
SELECT 'roles:manage','Manage roles','roles','manage',NOW(),NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `Permission` WHERE name = 'roles:manage');
INSERT INTO `Permission` (name, description, module, action, createdAt, updatedAt)
SELECT 'tickets:manage','Manage tickets','tickets','manage',NOW(),NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `Permission` WHERE name = 'tickets:manage');
INSERT INTO `Permission` (name, description, module, action, createdAt, updatedAt)
SELECT 'tickets:view','View tickets','tickets','view',NOW(),NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `Permission` WHERE name = 'tickets:view');
INSERT INTO `Permission` (name, description, module, action, createdAt, updatedAt)
SELECT 'descargas:view','Descargar listados de contactos (PDF/CSV)','descargas','view',NOW(),NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `Permission` WHERE name = 'descargas:view');
INSERT INTO `Permission` (name, description, module, action, createdAt, updatedAt)
SELECT 'tickets:reply','Reply to tickets','tickets','reply',NOW(),NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `Permission` WHERE name = 'tickets:reply');



-- Assign all permissions to admin (if not already assigned)
INSERT INTO `RolePermission` (roleId, permissionId)
SELECT r.id, p.id
FROM `Role` r
CROSS JOIN `Permission` p
WHERE r.name = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM `RolePermission` rp WHERE rp.roleId = r.id AND rp.permissionId = p.id
  );

-- Assign ticket view and reply to empleado
INSERT INTO `RolePermission` (roleId, permissionId)
SELECT r.id, p.id
FROM `Role` r
JOIN `Permission` p ON p.name IN ('tickets:view','tickets:reply')
WHERE r.name = 'empleado'
  AND NOT EXISTS (
    SELECT 1 FROM `RolePermission` rp WHERE rp.roleId = r.id AND rp.permissionId = p.id
  );

-- Assign dashboard and tickets manage to supervisor
INSERT INTO `RolePermission` (roleId, permissionId)
SELECT r.id, p.id
FROM `Role` r
JOIN `Permission` p ON p.name IN ('dashboard:view','tickets:manage')
WHERE r.name = 'supervisor'
  AND NOT EXISTS (
    SELECT 1 FROM `RolePermission` rp WHERE rp.roleId = r.id AND rp.permissionId = p.id
  );

COMMIT;