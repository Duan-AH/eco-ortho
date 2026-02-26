// cloudfunctions/auth/actions/requireAdmin.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { requireAdmin } = require('../_shared/guard')

module.exports = async () => {
  const { OPENID } = cloud.getWXContext()
  const info = await requireAdmin(OPENID)

  return {
    ok: true,
    openid: OPENID,
    isAdmin: true,
    role: info.role
  }
}