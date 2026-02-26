module.exports = async (event, ctx) => {
  const requestId = String(event.requestId || '').trim()
  if (!requestId) throw new Error('requestId required')

  const reqRes = await ctx.db.collection('admin_requests').doc(requestId).get()
  const req = reqRes && reqRes.data
  if (!req) throw new Error('request not found')
  if (req.status !== 'pending') throw new Error('request already handled')

  const targetOpenid = String(req.openid || '').trim()
  if (!targetOpenid) throw new Error('request openid missing')

  // 防止重复加到 admins
  const exists = await ctx.db.collection('admins').where({ openid: targetOpenid }).get()
  if (!exists.data || exists.data.length === 0) {
    await ctx.db.collection('admins').add({
      data: {
        openid: targetOpenid,
        role: 'admin',
        createdAt: Date.now(),
        createdBy: ctx.OPENID
      }
    })
  }

  await ctx.db.collection('admin_requests').doc(requestId).update({
    data: {
      status: 'approved',
      handledAt: Date.now(),
      handledBy: ctx.OPENID
    }
  })

  return {}
}