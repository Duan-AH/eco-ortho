module.exports = async (event, ctx) => {
  const res = await ctx.db.collection('admin_requests')
    .where({ status: 'pending' })
    .orderBy('createdAt', 'desc')
    .get()
  return { requests: res.data }
}