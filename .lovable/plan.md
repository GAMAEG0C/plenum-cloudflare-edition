## Problema

El login falla con `400 invalid_credentials` para `EO1303`. Verifiqué la base:
el usuario `EO1303` (Elihu Ochoa, rol admin) **sí existe** en `auth.users`, pero
la contraseña almacenada no coincide con `Solutions115.`. El seed inicial no
dejó la contraseña en el estado esperado.

## Solución

### 1. Re-sembrar la contraseña del admin (vía migración SQL segura)
Crear una migración que use `supabase_auth_admin` para forzar la contraseña
del usuario `EO1303` a `Solutions115.` usando `crypt()` con `gen_salt('bf')`.
Esto garantiza que quede igual a como Supabase la generaría en signup.

```sql
UPDATE auth.users
SET encrypted_password = crypt('Solutions115.', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'eo1303@universumk9.local';
```

Esto deja el admin listo para iniciar sesión inmediatamente con:
- **Usuario:** `EO1303`
- **Contraseña:** `Solutions115.`

### 2. Mejorar mensaje de error en `/login`
Hoy mostramos siempre "Número de empleado o contraseña incorrectos." Está bien,
pero agregaremos un pequeño hint visible solo cuando el formato del número sea
válido (`EO1303`) para que el usuario sepa que el problema es la contraseña, no
el formato.

### 3. Verificación
Después de aplicar la migración, confirmaré con una consulta de lectura que la
fila quedó actualizada (sin exponer el hash) y, si lo deseas, hago una prueba
con el navegador en `/login` para validar que entra al dashboard.

## Archivos afectados

- `supabase/migrations/<timestamp>_reset_admin_password.sql` — nuevo
- `src/routes/login.tsx` — mensaje de error refinado (opcional, ~3 líneas)

## Notas

- No tocamos `scripts/seed-admin.mjs` (ya no se necesita re-ejecutar).
- No cambiamos el flujo de auth ni RLS — solo restablecemos credenciales.
- La contraseña queda hasheada con bcrypt nativo de Postgres/Supabase, idéntico
  a un signup normal.
