-- Corregido: se eliminó el token inválido, se usó esquema explícito, se evitó insertar duplicados y se reemplazó TEXT por NVARCHAR(MAX)

IF OBJECT_ID(N'dbo.dashboard_events', N'U') IS NOT NULL DROP TABLE dbo.dashboard_events;
IF OBJECT_ID(N'dbo.dashboard_notifications', N'U') IS NOT NULL DROP TABLE dbo.dashboard_notifications;
IF OBJECT_ID(N'dbo.dashboard_tasks', N'U') IS NOT NULL DROP TABLE dbo.dashboard_tasks;
IF OBJECT_ID(N'dbo.dashboard_settings', N'U') IS NOT NULL DROP TABLE dbo.dashboard_settings;

IF OBJECT_ID(N'dbo.admin', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.admin (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(50) NOT NULL UNIQUE,
        email NVARCHAR(100) NOT NULL UNIQUE,
        password NVARCHAR(255) NOT NULL,
        role NVARCHAR(30) NOT NULL DEFAULT N'admin',
        is_active BIT NOT NULL DEFAULT 1,
        last_login DATETIME NULL,
        password_changed_at DATETIME NULL,
        reset_token NVARCHAR(255) NULL,
        reset_expires DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE()
    );
END;

-- Reemplaza el hash por uno generado con bcrypt/Argon2
IF NOT EXISTS (SELECT 1 FROM dbo.admin WHERE username = N'admin')
BEGIN
    INSERT INTO dbo.admin (username, email, password, role)
    VALUES (N'admin', N'admin@example.com', N'$2y$12$exampleHashedPasswordHere', N'superadmin');
END;

IF OBJECT_ID(N'dbo.dashboard_settings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.dashboard_settings (
        id INT IDENTITY(1,1) PRIMARY KEY,
        title NVARCHAR(100) NOT NULL,
        logo_path NVARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE()
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.dashboard_settings)
BEGIN
    INSERT INTO dbo.dashboard_settings (title, logo_path)
    VALUES (N'Admin Dashboard', NULL);
END;

IF OBJECT_ID(N'dbo.dashboard_events', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.dashboard_events (
        id INT IDENTITY(1,1) PRIMARY KEY,
        event_name NVARCHAR(100) NOT NULL,
        event_date DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE()
    );
END;

IF OBJECT_ID(N'dbo.dashboard_notifications', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.dashboard_notifications (
        id INT IDENTITY(1,1) PRIMARY KEY,
        message NVARCHAR(MAX) NOT NULL,
        is_read BIT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE()
    );
END;

IF OBJECT_ID(N'dbo.dashboard_tasks', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.dashboard_tasks (
        id INT IDENTITY(1,1) PRIMARY KEY,
        task_name NVARCHAR(100) NOT NULL,
        is_completed BIT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE()
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.dashboard_tasks)
BEGIN
    INSERT INTO dbo.dashboard_tasks (task_name, is_completed)
    VALUES (N'Initial Setup', 1), (N'User Management', 0), (N'System Monitoring', 0);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.dashboard_events)
BEGIN
    INSERT INTO dbo.dashboard_events (event_name, event_date)
    VALUES (N'System Launch', DATEADD(day, 7, GETDATE())), (N'Quarterly Review', DATEADD(day, 30, GETDATE()));
END;

IF NOT EXISTS (SELECT 1 FROM dbo.dashboard_notifications)
BEGIN
    INSERT INTO dbo.dashboard_notifications (message, is_read)
    VALUES (N'Welcome to the Admin Dashboard!', 0), (N'Your profile has been updated.', 0);
END;
