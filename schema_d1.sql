-- ESQUEMA INICIAL PARA CLOUDFLARE D1 (SQLite)

-- 1. Tabla de Usuarios (Reemplaza a Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- Generado en la app con crypto.randomUUID()
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'médico', 'auxiliar', 'empleado', 'recepción')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Empleados
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    employee_number TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Pacientes
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    owner_name TEXT NOT NULL,
    pet_name TEXT NOT NULL,
    species TEXT NOT NULL,
    breed TEXT,
    age_years INTEGER DEFAULT 0,
    age_months INTEGER DEFAULT 0,
    weight_kg NUMERIC,
    phone TEXT,
    email TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Inventario (Items)
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    unit TEXT NOT NULL,
    current_stock NUMERIC NOT NULL DEFAULT 0,
    min_stock NUMERIC NOT NULL DEFAULT 0,
    cost_price NUMERIC,
    selling_price NUMERIC,
    requires_prescription INTEGER NOT NULL DEFAULT 0, -- SQLite usa 0 y 1 para booleanos
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- (El resto de las tablas se estructuran de esta misma manera)
