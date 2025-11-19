-- Inicialização do banco de dados para Docker
-- Este script garante que o charset e collation estão corretos

-- Garantir que o banco de dados usa utf8mb4
ALTER DATABASE blackbelt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Criar usuário com permissões apropriadas (caso não exista)
CREATE USER IF NOT EXISTS 'blackbelt_user'@'%' IDENTIFIED BY 'blackbelt_password';
GRANT ALL PRIVILEGES ON blackbelt.* TO 'blackbelt_user'@'%';
FLUSH PRIVILEGES;

-- Configurar variáveis de sessão para garantir utf8mb4
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
