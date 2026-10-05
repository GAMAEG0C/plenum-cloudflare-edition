INSERT INTO users (id, password_hash, role, email) 
VALUES ('admin-123', '$2b$10$0bBUJ/SLJfX/Z/iqy8hhuu/4EznUfKRapFaLIxBS.FR5dOQk92PKq', 'admin', 'admin@plenum.app')
ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash;

INSERT INTO employees (id, employee_number, first_name, last_name, status)
VALUES ('admin-123', 'ADMIN-01', 'Admin', 'Plenum', 'active')
ON CONFLICT(id) DO NOTHING;
