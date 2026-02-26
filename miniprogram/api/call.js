// miniprogram/api/call.js
// 统一：CommonJS 写法（小程序官方最稳）

async function callFn(name, data = {}) {
  const res = await wx.cloud.callFunction({ name, data })
  const payload = res && res.result

  // 兼容旧函数：不是 { ok: ... } 的直接返回
  if (!payload || typeof payload !== 'object' || !('ok' in payload)) {
    return payload
  }

  if (!payload.ok) {
    const err = new Error(payload.error || 'Cloud function failed')
    err.code = payload.code || 'CF_ERR'
    err.detail = payload
    throw err
  }

  const { ok, ...rest } = payload
  return rest
}


async function call(moduleName, action, data = {}) {
  return callFn(moduleName, { ...data, action })
}

module.exports = {
  callFn,
  call
}