// cloudfunctions/auth/actions/whoami.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { getAdminInfo } = require('../_shared/guard')

module.exports = async () => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const info = await getAdminInfo(openid)

  // ✅ 对齐原 checkAdmin：ok:true + isAdmin + role
  // ✅ 额外返回 openid（不影响旧用法）
  return {
    ok: true,
    openid,
    isAdmin: info.isAdmin,
    role: info.role
  }
}