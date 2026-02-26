module.exports = async (event, ctx) => {
  const requestId = String(event.requestId || '').trim()
  if (!requestId) throw new Error('requestId required')

  const reqRes = await ctx.db.collection('admin_requests').doc(requestId).get()
  const req = reqRes && reqRes.data
  if (!req) throw new Error('request not found')
  if (req.status !== 'pending') throw new Error('request already handled')

  await ctx.db.collection('admin_requests').doc(requestId).update({
    data: {
      status: 'rejected',
      handledAt: Date.now(),
      handledBy: ctx.OPENID
    }
  })

  return {}
}