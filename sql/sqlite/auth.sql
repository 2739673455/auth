PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS `email_code`;
DROP TABLE IF EXISTS `refresh_token`;
DROP TABLE IF EXISTS `group_user_rel`;
DROP TABLE IF EXISTS `group_scope_rel`;
DROP TABLE IF EXISTS `user`;
DROP TABLE IF EXISTS `group`;
DROP TABLE IF EXISTS `scope`;

-- 权限范围表
CREATE TABLE `scope` (
    `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,  -- 权限范围ID
    `name` VARCHAR(100) NOT NULL UNIQUE,  -- 权限范围名称
    `description` VARCHAR(100) DEFAULT NULL,  -- 权限范围描述
    `create_at` DATETIME DEFAULT (datetime('now', '+8 hours')),  -- 创建时间（北京时间）
    `yn` INTEGER NOT NULL DEFAULT 1  -- 是否启用
);

-- 用户组表
CREATE TABLE `group` (
    `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,  -- 组ID
    `name` VARCHAR(100) NOT NULL UNIQUE,  -- 组名称
    `create_at` DATETIME DEFAULT (datetime('now', '+8 hours')),  -- 创建时间（北京时间）
    `yn` INTEGER NOT NULL DEFAULT 1  -- 是否启用
);

-- 用户表
CREATE TABLE `user` (
    `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,  -- 用户ID
    `email` VARCHAR(100) UNIQUE NOT NULL,  -- 邮箱
    `name` VARCHAR(100) NOT NULL,  -- 用户名
    `password_hash` VARCHAR(500) NOT NULL,  -- 密码哈希
    `create_at` DATETIME DEFAULT (datetime('now', '+8 hours')),  -- 创建时间（北京时间）
    `update_at` DATETIME DEFAULT (datetime('now', '+8 hours')),  -- 更新时间（北京时间）
    `yn` INTEGER NOT NULL DEFAULT 1  -- 是否启用
);

-- 更新用户时间的触发器（使用北京时间）
CREATE TRIGGER `update_user_update_at`
AFTER UPDATE ON `user`
FOR EACH ROW
BEGIN
    UPDATE `user` SET `update_at` = datetime('now', '+8 hours')
    WHERE `id` = new.`id`;
END;

-- 组-权限关系表
CREATE TABLE `group_scope_rel` (
    `group_id` INTEGER NOT NULL,  -- 组ID
    `scope_id` INTEGER NOT NULL,  -- 权限范围ID
    PRIMARY KEY (`group_id`, `scope_id`),
    FOREIGN KEY (`group_id`) REFERENCES `group` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`scope_id`) REFERENCES `scope` (`id`) ON DELETE CASCADE
);

-- 组-用户关系表
CREATE TABLE `group_user_rel` (
    `group_id` INTEGER NOT NULL,  -- 组ID
    `user_id` INTEGER NOT NULL,  -- 用户ID
    PRIMARY KEY (`group_id`, `user_id`),
    FOREIGN KEY (`group_id`) REFERENCES `group` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
);

-- 刷新令牌表
CREATE TABLE `refresh_token` (
    `jti` VARCHAR(255) NOT NULL PRIMARY KEY,  -- JWT唯一标识
    `user_id` INTEGER NOT NULL,  -- 用户ID
    `create_at` DATETIME DEFAULT (datetime('now', '+8 hours')),  -- 创建时间（北京时间）
    `expires_at` DATETIME NOT NULL,  -- 过期时间
    `yn` INTEGER NOT NULL DEFAULT 1,  -- 是否启用
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
);

CREATE INDEX `idx_refresh_token_user_id` ON `refresh_token` (`user_id`);

-- 邮箱验证码表
CREATE TABLE `email_code` (
    `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,  -- ID
    `email` VARCHAR(100) NOT NULL,  -- 邮箱
    `code` VARCHAR(10) NOT NULL,  -- 验证码
    `type` VARCHAR(20) NOT NULL,  -- 类型：register-注册, reset_password-重置密码
    `expire_at` DATETIME NOT NULL,  -- 过期时间
    `used` INTEGER NOT NULL DEFAULT 0,  -- 是否已使用
    `create_at` DATETIME NOT NULL DEFAULT (datetime('now', '+8 hours'))  -- 创建时间（北京时间）
);

CREATE INDEX `idx_email_code_email` ON `email_code` (`email`);
CREATE INDEX `idx_email_code_expire_at` ON `email_code` (`expire_at`);
