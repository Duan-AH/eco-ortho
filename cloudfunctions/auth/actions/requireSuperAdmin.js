// cloudfunctions/auth/actions/requireSuperAdmin.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { requireSuperAdmin } = require('../_shared/guard')

module.exports = async () => {
  const { OPENID } = cloud.getWXContext()
  const info = await requireSuperAdmin(OPENID)

  return {
    ok: true,
    openid: OPENID,
    isAdmin: true,
    role: info.role // 必然是 super_admin
  }
}