const fs = require('fs');
const path = require('path');

/**
 * Cookie 持久化存储中心
 * 支持多账号、多角色 Cookie 隔离存储
 */
class CookieStore {
  constructor(baseDir = null) {
    this.baseDir = baseDir || path.join(__dirname, '..', 'cookies');
    this.ensureDir();
  }

  /**
   * 确保存储目录存在
   */
  ensureDir() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * 获取 Cookie 文件路径
   * @param {string} role - 角色名 (sales/operation/design/procurement/inventory)
   * @param {string} account - 账号标识
   * @returns {string} Cookie 文件路径
   */
  getCookiePath(role, account = 'default') {
    return path.join(this.baseDir, `${role}_${account}.json`);
  }

  /**
   * 保存 Cookie
   * @param {string} role - 角色名
   * @param {Array} cookies - Cookie 数组
   * @param {string} account - 账号标识
   */
  async save(role, cookies, account = 'default') {
    const cookiePath = this.getCookiePath(role, account);
    const dir = path.dirname(cookiePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data = {
      role,
      account,
      updatedAt: new Date().toISOString(),
      cookies
    };

    fs.writeFileSync(cookiePath, JSON.stringify(data, null, 2));
    console.log(`✓ Cookie 已保存 [${role}/${account}]: ${cookies.length} 个`);
  }

  /**
   * 加载 Cookie
   * @param {string} role - 角色名
   * @param {string} account - 账号标识
   * @returns {Array|null} Cookie 数组
   */
  load(role, account = 'default') {
    const cookiePath = this.getCookiePath(role, account);

    if (fs.existsSync(cookiePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(cookiePath, 'utf-8'));
        const updatedAt = new Date(data.updatedAt);
        const now = new Date();
        const hoursSinceUpdate = (now - updatedAt) / (1000 * 60 * 60);

        // Cookie 超过 24 小时视为过期
        if (hoursSinceUpdate > 24) {
          console.log(`⚠️  Cookie 已过期 (${Math.floor(hoursSinceUpdate)}小时前)`);
          return null;
        }

        console.log(`✓ Cookie 已加载 [${role}/${account}]: ${data.cookies.length} 个`);
        return data.cookies;
      } catch (error) {
        console.warn(`⚠️  Cookie 加载失败 [${role}/${account}]: ${error.message}`);
      }
    }

    return null;
  }

  /**
   * 删除 Cookie
   * @param {string} role - 角色名
   * @param {string} account - 账号标识
   */
  remove(role, account = 'default') {
    const cookiePath = this.getCookiePath(role, account);
    if (fs.existsSync(cookiePath)) {
      fs.unlinkSync(cookiePath);
      console.log(`✓ Cookie 已删除 [${role}/${account}]`);
    }
  }

  /**
   * 列出所有已保存的 Cookie
   * @returns {Array} Cookie 信息列表
   */
  listAll() {
    const result = [];

    if (fs.existsSync(this.baseDir)) {
      const files = fs.readdirSync(this.baseDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const cookiePath = path.join(this.baseDir, file);
          try {
            const data = JSON.parse(fs.readFileSync(cookiePath, 'utf-8'));
            result.push({
              file,
              role: data.role,
              account: data.account,
              cookieCount: data.cookies?.length || 0,
              updatedAt: data.updatedAt
            });
          } catch (e) {
            // 忽略无效文件
          }
        }
      }
    }

    return result;
  }

  /**
   * 跨角色共享 Cookie（用于单点登录场景）
   * @param {string} fromRole - 源角色
   * @param {string} toRole - 目标角色
   * @param {string} account - 账号标识
   */
  share(fromRole, toRole, account = 'default') {
    const sourcePath = this.getCookiePath(fromRole, account);
    const targetPath = this.getCookiePath(toRole, account);

    if (fs.existsSync(sourcePath)) {
      const data = fs.readFileSync(sourcePath, 'utf-8');
      const parsed = JSON.parse(data);
      parsed.role = toRole;
      parsed.updatedAt = new Date().toISOString();

      fs.writeFileSync(targetPath, JSON.stringify(parsed, null, 2));
      console.log(`✓ Cookie 已共享 [${fromRole} → ${toRole}]`);
      return true;
    }

    console.warn(`⚠️  源 Cookie 不存在 [${fromRole}/${account}]`);
    return false;
  }
}

module.exports = CookieStore;
