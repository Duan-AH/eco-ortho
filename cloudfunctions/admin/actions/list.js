module.exports = async (event, ctx) => {
  const res = await ctx.db.collection('admins').orderBy('createdAt', 'desc').get()
  return { admins: res.data }
}