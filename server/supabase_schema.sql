-- ============================================
-- PSD Canvas Jaaz - Supabase 数据库建表语句
-- ============================================
-- 说明：此SQL文件整合了所有迁移文件的表结构，并转换为PostgreSQL语法
-- 适用于：Supabase PostgreSQL 数据库
-- 生成时间：2025-11-11
-- ============================================

-- ============================================
-- 1. 用户表 (users)
-- ============================================
-- 存储用户基本信息、认证信息和角色权限
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

-- 用户表字段注释
COMMENT ON TABLE users IS '用户表 - 存储用户基本信息、认证信息和角色权限';
COMMENT ON COLUMN users.id IS '用户唯一标识符';
COMMENT ON COLUMN users.username IS '用户名，全局唯一，最长50字符';
COMMENT ON COLUMN users.email IS '用户邮箱，全局唯一，最长255字符';
COMMENT ON COLUMN users.password_hash IS '密码哈希值（SHA-256），Google登录用户可为空字符串';
COMMENT ON COLUMN users.image_url IS '用户头像URL';
COMMENT ON COLUMN users.provider IS '登录提供者：local=本地注册, google=Google OAuth';
COMMENT ON COLUMN users.google_id IS 'Google用户唯一标识符，仅Google登录用户使用，最长100字符';
COMMENT ON COLUMN users.role IS '用户角色（admin=管理员, editor=编辑者）';
COMMENT ON COLUMN users.is_admin IS '是否为管理员账户，用于快速判断管理员权限';
COMMENT ON COLUMN users.vip_level IS 'VIP等级：0=普通用户, 1-4=VIP等级';
COMMENT ON COLUMN users.vip_expires_at IS 'VIP到期时间，NULL表示非VIP';
COMMENT ON COLUMN users.credits IS '用户积分余额';
COMMENT ON COLUMN users.created_at IS '账户创建时间';
COMMENT ON COLUMN users.updated_at IS '账户最后更新时间';

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- ============================================
-- 2. 认证令牌表 (auth_tokens)--TODO：后续可以的话转redis-----------------
-- ============================================
-- 存储用户会话令牌
CREATE TABLE IF NOT EXISTS auth_tokens (
    token TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE auth_tokens IS '认证令牌表 - 存储用户会话令牌';
COMMENT ON COLUMN auth_tokens.token IS '访问令牌，用于API认证';
COMMENT ON COLUMN auth_tokens.user_id IS '关联的用户ID';
COMMENT ON COLUMN auth_tokens.expires_at IS '令牌过期时间';
COMMENT ON COLUMN auth_tokens.created_at IS '令牌创建时间';

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires ON auth_tokens(expires_at);

-- ============================================
-- 3. 设备码表 (device_codes)
-- ============================================
-- 存储设备认证流程中的设备码
CREATE TABLE IF NOT EXISTS device_codes (
    code TEXT PRIMARY KEY,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'authorized', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE device_codes IS '设备码表 - 存储设备认证流程中的授权码';
COMMENT ON COLUMN device_codes.code IS '设备授权码';
COMMENT ON COLUMN device_codes.status IS '授权状态：pending=待授权, authorized=已授权, expired=已过期';
COMMENT ON COLUMN device_codes.expires_at IS '设备码过期时间';
COMMENT ON COLUMN device_codes.created_at IS '设备码创建时间';
COMMENT ON COLUMN device_codes.user_id IS '授权的用户ID';

CREATE INDEX IF NOT EXISTS idx_device_codes_expires ON device_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_device_codes_status ON device_codes(status);

-- ============================================
-- 4. 画布表 (canvases)
-- ============================================
-- 存储用户的画布数据
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

COMMENT ON TABLE canvases IS '画布表 - 存储用户的设计画布数据';
COMMENT ON COLUMN canvases.id IS '画布唯一标识符';
COMMENT ON COLUMN canvases.name IS '画布名称，最长30字符';
COMMENT ON COLUMN canvases.data IS '画布数据（JSON格式）';
COMMENT ON COLUMN canvases.description IS '画布描述';
COMMENT ON COLUMN canvases.thumbnail IS '画布缩略图URL';
COMMENT ON COLUMN canvases.user_id IS '画布所属用户ID，NULL表示公共画布';
COMMENT ON COLUMN canvases.created_at IS '画布创建时间';
COMMENT ON COLUMN canvases.updated_at IS '画布最后更新时间';

CREATE INDEX IF NOT EXISTS idx_canvases_updated_at ON canvases(updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_canvases_user_id ON canvases(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canvases_created_at ON canvases(created_at DESC);

-- ============================================
-- 5. 聊天会话表 (chat_sessions)
-- ============================================
-- 存储AI聊天会话信息
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canvas_id UUID REFERENCES canvases(id) ON DELETE SET NULL,
    title VARCHAR(200),
    model VARCHAR(30),
    provider VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE chat_sessions IS '聊天会话表 - 存储AI助手的对话会话';
COMMENT ON COLUMN chat_sessions.id IS '会话唯一标识符';
COMMENT ON COLUMN chat_sessions.canvas_id IS '关联的画布ID';
COMMENT ON COLUMN chat_sessions.title IS '会话标题';
COMMENT ON COLUMN chat_sessions.model IS 'AI模型名称，最长30字符（如gpt-4-turbo, claude-3等）';
COMMENT ON COLUMN chat_sessions.provider IS 'AI服务提供者，最长30字符（如openai, anthropic, google等）';
COMMENT ON COLUMN chat_sessions.created_at IS '会话创建时间';
COMMENT ON COLUMN chat_sessions.updated_at IS '会话最后更新时间';

CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_canvas_id ON chat_sessions(canvas_id) WHERE canvas_id IS NOT NULL;

-- ============================================
-- 6. 聊天消息表 (chat_messages)
-- ============================================
-- 存储聊天会话中的消息
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE chat_messages IS '聊天消息表 - 存储会话中的对话消息';
COMMENT ON COLUMN chat_messages.id IS '消息唯一标识符（自增）';
COMMENT ON COLUMN chat_messages.session_id IS '所属会话ID';
COMMENT ON COLUMN chat_messages.role IS '消息角色（user=用户, assistant=AI助手, system=系统）';
COMMENT ON COLUMN chat_messages.message IS '消息内容';
COMMENT ON COLUMN chat_messages.created_at IS '消息创建时间';
COMMENT ON COLUMN chat_messages.updated_at IS '消息最后更新时间';

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id_id ON chat_messages(session_id, id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- ============================================
-- 7. 组织表 (organizations)
-- ============================================
-- 存储组织基本信息
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

COMMENT ON TABLE organizations IS '组织表 - 存储组织基本信息';
COMMENT ON COLUMN organizations.id IS '组织唯一标识符';
COMMENT ON COLUMN organizations.name IS '组织名称，最长30字符';
COMMENT ON COLUMN organizations.description IS '组织描述，最长500字符';
COMMENT ON COLUMN organizations.invite_code IS '组织邀请码，全局唯一，用于用户加入组织';
COMMENT ON COLUMN organizations.logo_url IS '组织Logo URL，最长500字符';
COMMENT ON COLUMN organizations.is_active IS '组织是否激活（TRUE=正常运行, FALSE=已禁用/冻结）';
COMMENT ON COLUMN organizations.max_members IS '组织最大成员数量限制（默认2000，可自行修改）';
COMMENT ON COLUMN organizations.owner_id IS '组织创建者/所有者ID';
COMMENT ON COLUMN organizations.created_at IS '组织创建时间';
COMMENT ON COLUMN organizations.updated_at IS '组织最后更新时间';

CREATE INDEX IF NOT EXISTS idx_organizations_invite_code ON organizations(invite_code);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC);

-- ============================================
-- 8. 组织成员表 (organization_members)
-- ============================================
-- 存储用户与组织的关联关系
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' NOT NULL CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(organization_id, user_id)
);

COMMENT ON TABLE organization_members IS '组织成员表 - 存储用户与组织的关联关系';
COMMENT ON COLUMN organization_members.id IS '成员关系唯一标识符';
COMMENT ON COLUMN organization_members.organization_id IS '所属组织ID';
COMMENT ON COLUMN organization_members.user_id IS '成员用户ID';
COMMENT ON COLUMN organization_members.role IS '组织内角色（admin=组织管理员, member=普通成员）';
COMMENT ON COLUMN organization_members.joined_at IS '加入组织时间';

CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(organization_id, role);

-- ============================================
-- 9. 组织加入申请表 (organization_join_requests)
-- ============================================
-- 存储待审核的组织加入申请
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

COMMENT ON TABLE organization_join_requests IS '组织加入申请表 - 存储待审核的组织加入申请';
COMMENT ON COLUMN organization_join_requests.id IS '申请唯一标识符';
COMMENT ON COLUMN organization_join_requests.organization_id IS '申请加入的组织ID';
COMMENT ON COLUMN organization_join_requests.user_id IS '申请人用户ID';
COMMENT ON COLUMN organization_join_requests.invite_code IS '使用的邀请码';
COMMENT ON COLUMN organization_join_requests.status IS '申请状态（pending=待审核, approved=已通过, rejected=已拒绝）';
COMMENT ON COLUMN organization_join_requests.message IS '申请留言，最长100字符';
COMMENT ON COLUMN organization_join_requests.reviewed_by IS '审核人ID';
COMMENT ON COLUMN organization_join_requests.reviewed_at IS '审核时间';
COMMENT ON COLUMN organization_join_requests.reject_reason IS '拒绝原因，最长100字符';
COMMENT ON COLUMN organization_join_requests.created_at IS '申请创建时间';
COMMENT ON COLUMN organization_join_requests.updated_at IS '申请最后更新时间';

CREATE INDEX IF NOT EXISTS idx_join_requests_org_id ON organization_join_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_user_id ON organization_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON organization_join_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_join_requests_created_at ON organization_join_requests(created_at DESC);

-- ============================================
-- 10. ComfyUI工作流表 (comfy_workflows)
-- ============================================
-- 存储ComfyUI工作流配置
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

COMMENT ON TABLE comfy_workflows IS 'ComfyUI工作流表 - 存储图像生成工作流配置';
COMMENT ON COLUMN comfy_workflows.id IS '工作流唯一标识符（自增）';
COMMENT ON COLUMN comfy_workflows.name IS '工作流名称（仅允许a-z, A-Z, 0-9, _字符）';
COMMENT ON COLUMN comfy_workflows.api_json IS 'ComfyUI API配置（JSON格式）';
COMMENT ON COLUMN comfy_workflows.description IS '工作流描述';
COMMENT ON COLUMN comfy_workflows.inputs IS '输入参数定义（JSON格式）';
COMMENT ON COLUMN comfy_workflows.outputs IS '输出参数定义（JSON格式）';
COMMENT ON COLUMN comfy_workflows.created_at IS '工作流创建时间';
COMMENT ON COLUMN comfy_workflows.updated_at IS '工作流最后更新时间';

CREATE INDEX IF NOT EXISTS idx_comfy_workflows_updated_at ON comfy_workflows(updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_comfy_workflows_name ON comfy_workflows(name);

-- ============================================
-- 触发器：自动更新 updated_at 字段
-- ============================================

-- 创建通用的更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有需要的表添加触发器
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
-- Row Level Security (RLS) 策略
-- ============================================

-- 启用RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 用户表RLS策略
CREATE POLICY "用户可查看所有用户基本信息" ON users
    FOR SELECT
    USING (true);

CREATE POLICY "用户可更新自己的信息" ON users
    FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "管理员可管理所有用户" ON users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- 组织表RLS策略
CREATE POLICY "用户可查看所有激活的组织" ON organizations
    FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "组织所有者可管理组织" ON organizations
    FOR ALL
    USING (owner_id = auth.uid());

CREATE POLICY "系统管理员可管理所有组织" ON organizations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- 组织成员表RLS策略
CREATE POLICY "用户可查看自己的组织成员关系" ON organization_members
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "组织管理员可管理成员" ON organization_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = organization_members.organization_id
            AND om.user_id = auth.uid()
            AND om.role = 'admin'
        )
    );

-- 组织加入申请表RLS策略
CREATE POLICY "用户可查看自己的申请" ON organization_join_requests
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "用户可创建加入申请" ON organization_join_requests
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "组织管理员可查看组织的申请" ON organization_join_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = organization_join_requests.organization_id
            AND om.user_id = auth.uid()
            AND om.role = 'admin'
        )
    );

CREATE POLICY "组织管理员可审核申请" ON organization_join_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = organization_join_requests.organization_id
            AND om.user_id = auth.uid()
            AND om.role = 'admin'
        )
    );

-- 画布表RLS策略
CREATE POLICY "用户可查看自己的画布" ON canvases
    FOR SELECT
    USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "用户可创建自己的画布" ON canvases
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "用户可更新自己的画布" ON canvases
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "用户可删除自己的画布" ON canvases
    FOR DELETE
    USING (user_id = auth.uid());

CREATE POLICY "管理员可管理所有画布" ON canvases
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- 认证令牌RLS策略
CREATE POLICY "用户可查看自己的令牌" ON auth_tokens
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "用户可删除自己的令牌" ON auth_tokens
    FOR DELETE
    USING (user_id = auth.uid());

-- 聊天会话RLS策略
CREATE POLICY "用户可查看关联画布的会话" ON chat_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = chat_sessions.canvas_id
            AND (canvases.user_id = auth.uid() OR canvases.user_id IS NULL)
        )
        OR canvas_id IS NULL
    );

-- 聊天消息RLS策略
CREATE POLICY "用户可查看会话消息" ON chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions cs
            LEFT JOIN canvases c ON c.id = cs.canvas_id
            WHERE cs.id = chat_messages.session_id
            AND (c.user_id = auth.uid() OR c.user_id IS NULL OR cs.canvas_id IS NULL)
        )
    );

-- ============================================
-- 11. 字体分类表 (font_categories)
-- ============================================
-- 存储字体分类信息
CREATE TABLE IF NOT EXISTS font_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(20) DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE font_categories IS '字体分类表 - 存储字体分类信息';
COMMENT ON COLUMN font_categories.id IS '分类唯一标识符';
COMMENT ON COLUMN font_categories.name IS '分类名称';
COMMENT ON COLUMN font_categories.description IS '分类描述';
COMMENT ON COLUMN font_categories.icon IS '分类图标';
COMMENT ON COLUMN font_categories.color IS '分类颜色';
COMMENT ON COLUMN font_categories.created_at IS '分类创建时间';
COMMENT ON COLUMN font_categories.updated_at IS '分类最后更新时间';

CREATE INDEX IF NOT EXISTS idx_font_categories_name ON font_categories(name);

-- ============================================
-- 12. 字体表 (font_items)
-- ============================================
-- 存储字体文件信息
CREATE TABLE IF NOT EXISTS font_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    font_family VARCHAR(200) NOT NULL,
    font_file_name VARCHAR(255) NOT NULL,
    font_file_path VARCHAR(500) NOT NULL,
    font_file_url VARCHAR(500) NOT NULL,
    font_format VARCHAR(20) NOT NULL,
    file_size INTEGER NOT NULL,
    description TEXT,
    category_id UUID REFERENCES font_categories(id) ON DELETE SET NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    usage_count INTEGER DEFAULT 0,
    is_favorite BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    font_metadata JSONB,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE font_items IS '字体表 - 存储字体文件信息';
COMMENT ON COLUMN font_items.id IS '字体唯一标识符';
COMMENT ON COLUMN font_items.name IS '字体名称';
COMMENT ON COLUMN font_items.font_family IS '字体族名称';
COMMENT ON COLUMN font_items.font_file_name IS '字体文件名';
COMMENT ON COLUMN font_items.font_file_path IS '字体文件路径';
COMMENT ON COLUMN font_items.font_file_url IS '字体文件访问URL';
COMMENT ON COLUMN font_items.font_format IS '字体格式（ttf, otf, woff, woff2）';
COMMENT ON COLUMN font_items.file_size IS '文件大小（字节）';
COMMENT ON COLUMN font_items.description IS '字体描述';
COMMENT ON COLUMN font_items.category_id IS '所属分类ID';
COMMENT ON COLUMN font_items.tags IS '字体标签（JSON数组）';
COMMENT ON COLUMN font_items.usage_count IS '使用次数';
COMMENT ON COLUMN font_items.is_favorite IS '是否收藏';
COMMENT ON COLUMN font_items.is_public IS '是否公开';
COMMENT ON COLUMN font_items.font_metadata IS '字体元数据（JSON格式）';
COMMENT ON COLUMN font_items.created_by IS '创建者用户ID';
COMMENT ON COLUMN font_items.created_at IS '字体创建时间';
COMMENT ON COLUMN font_items.updated_at IS '字体最后更新时间';

CREATE INDEX IF NOT EXISTS idx_font_items_name ON font_items(name);
CREATE INDEX IF NOT EXISTS idx_font_items_font_family ON font_items(font_family);
CREATE INDEX IF NOT EXISTS idx_font_items_category_id ON font_items(category_id);
CREATE INDEX IF NOT EXISTS idx_font_items_is_favorite ON font_items(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_font_items_is_public ON font_items(is_public);
CREATE INDEX IF NOT EXISTS idx_font_items_created_by ON font_items(created_by);
CREATE INDEX IF NOT EXISTS idx_font_items_usage_count ON font_items(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_font_items_created_at ON font_items(created_at DESC);

-- 字体表触发器
CREATE TRIGGER update_font_categories_updated_at BEFORE UPDATE ON font_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_font_items_updated_at BEFORE UPDATE ON font_items
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

-- 清理过期令牌和设备码
CREATE OR REPLACE FUNCTION cleanup_expired_auth_data()
RETURNS void AS $$
BEGIN
    -- 删除过期的认证令牌
    DELETE FROM auth_tokens WHERE expires_at < NOW();
    
    -- 删除过期的设备码
    DELETE FROM device_codes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 创建定时清理任务（需要pg_cron扩展）
-- 注意：Supabase默认可能未启用pg_cron，需要手动启用或使用其他方式定期清理
-- SELECT cron.schedule('cleanup-expired-auth', '0 * * * *', 'SELECT cleanup_expired_auth_data()');

-- ============================================
-- 数据库版本信息
-- ============================================

CREATE TABLE IF NOT EXISTS db_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    description TEXT
);

COMMENT ON TABLE db_version IS '数据库版本表 - 记录数据库迁移版本';

INSERT INTO db_version (version, description)
VALUES (8, 'Add organization management: organizations, members, join requests')
ON CONFLICT (version) DO NOTHING;
