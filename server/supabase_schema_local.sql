-- ============================================
-- PSD Canvas Jaaz - 本地 PostgreSQL 資料庫建表語句
-- ============================================
-- 說明：此SQL文件適用於本地 PostgreSQL，不包含 Supabase 特定的 RLS 策略
-- 適用於：本地 PostgreSQL 資料庫
-- 生成時間：2025-11-14
-- ============================================

-- ============================================
-- 1. 用户表 (users)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    provider VARCHAR(20) DEFAULT 'local' NOT NULL,
    google_id VARCHAR(100) UNIQUE,
    role VARCHAR(20) DEFAULT 'viewer' NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    vip_level INTEGER DEFAULT 0 NOT NULL,
    vip_expires_at TIMESTAMPTZ,
    credits INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- ============================================
-- 2. 认证令牌表 (auth_tokens)
-- ============================================
CREATE TABLE IF NOT EXISTS auth_tokens (
    token TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires ON auth_tokens(expires_at);

-- ============================================
-- 3. 设备码表 (device_codes)
-- ============================================
CREATE TABLE IF NOT EXISTS device_codes (
    code TEXT PRIMARY KEY,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'authorized', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_device_codes_expires ON device_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_device_codes_status ON device_codes(status);

-- ============================================
-- 4. 画布表 (canvases)
-- ============================================
CREATE TABLE IF NOT EXISTS canvases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(30) NOT NULL,
    data JSONB,
    description TEXT DEFAULT '',
    thumbnail TEXT DEFAULT '',
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_canvases_updated_at ON canvases(updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_canvases_user_id ON canvases(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canvases_created_at ON canvases(created_at DESC);

-- ============================================
-- 5. 聊天会话表 (chat_sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canvas_id UUID REFERENCES canvases(id) ON DELETE SET NULL,
    title VARCHAR(200),
    model VARCHAR(30),
    provider VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_canvas_id ON chat_sessions(canvas_id) WHERE canvas_id IS NOT NULL;

-- ============================================
-- 6. 聊天消息表 (chat_messages)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id_id ON chat_messages(session_id, id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- ============================================
-- 7. 组织表 (organizations)
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(30) NOT NULL,
    description VARCHAR(500) DEFAULT '',
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    max_members INTEGER DEFAULT 2000 NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_organizations_invite_code ON organizations(invite_code);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC);

-- ============================================
-- 8. 组织成员表 (organization_members)
-- ============================================
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' NOT NULL CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(organization_id, role);

-- ============================================
-- 9. 组织加入申请表 (organization_join_requests)
-- ============================================
CREATE TABLE IF NOT EXISTS organization_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_code VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    message VARCHAR(100),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    reject_reason VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(organization_id, user_id, status)
);

CREATE INDEX IF NOT EXISTS idx_join_requests_org_id ON organization_join_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_user_id ON organization_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON organization_join_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_join_requests_created_at ON organization_join_requests(created_at DESC);

-- ============================================
-- 10. ComfyUI工作流表 (comfy_workflows)
-- ============================================
CREATE TABLE IF NOT EXISTS comfy_workflows (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    api_json JSONB,
    description TEXT DEFAULT '',
    inputs JSONB,
    outputs JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comfy_workflows_updated_at ON comfy_workflows(updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_comfy_workflows_name ON comfy_workflows(name);

-- ============================================
-- 触发器：自动更新 updated_at 字段
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_join_requests_updated_at BEFORE UPDATE ON organization_join_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvases_updated_at BEFORE UPDATE ON canvases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comfy_workflows_updated_at BEFORE UPDATE ON comfy_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 初始化数据
-- ============================================

-- 创建默认画布（如果不存在）
INSERT INTO canvases (id, name, description, user_id)
VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    'Default Canvas',
    '默认公共画布',
    NULL
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 清理过期数据的函数
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_auth_data()
RETURNS void AS $$
BEGIN
    DELETE FROM auth_tokens WHERE expires_at < NOW();
    DELETE FROM device_codes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 数据库版本信息
-- ============================================

CREATE TABLE IF NOT EXISTS db_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    description TEXT
);

INSERT INTO db_version (version, description)
VALUES (8, 'Add organization management: organizations, members, join requests')
ON CONFLICT (version) DO NOTHING;

-- ============================================
-- 授予權限給應用用戶
-- ============================================

-- 授予所有表的權限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO psd_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO psd_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO psd_user;

-- 設置默認權限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO psd_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO psd_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO psd_user;





