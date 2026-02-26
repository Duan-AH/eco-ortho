module.exports = async (event, ctx) => {
  const targetOpenid = String(event.openid || '').trim()
  if (!targetOpenid) throw new Error('openid is required')

  const remark = String(event.remark || '').trim()

  const found = await ctx.db.collection('admins').where({ openid: targetOpenid }).get()
  if (!found.data || found.data.length === 0) throw new Error('target not found')

  await ctx.db.collection('admins').doc(found.data[0]._id).update({
    data: { remark }
  })

  return {}
}