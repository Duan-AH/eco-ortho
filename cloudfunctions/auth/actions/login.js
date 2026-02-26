// cloudfunctions/auth/actions/login.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

module.exports = async () => {
  const wxContext = cloud.getWXContext()
  return { ok: true, openid: wxContext.OPENID }
}