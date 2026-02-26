const { callFn, call } = require('../../api/call')
Page({
  data: {
    loading: true,
    ok: false,
    error: '',
    admins: [],
    newOpenid: '',
    newRoleIndex: 0,
    roleOptions: ['admin', 'super_admin'],
    requests: [],
    reqLoading: false,
    reqError: '',
    refresherTriggered: false
  },

  onLoad() {
    this.refresh()
    this.refreshRequests()
  },

  async refresh() {
    this.setData({ loading: true, error: '' })
    try {
      const r = await call('admin', 'list')
      this.setData({
        loading: false,
        ok: true,
        error: '',
        admins: r.admins || []
      })
      return r
    } catch (e) {
      console.error(e)
      this.setData({
        loading: false,
        ok: false,
        error: e.message || '调用失败，请看控制台',
        admins: []
      })
      return null
    }
  },

  onInputNewOpenid(e) {
    this.setData({ newOpenid: e.detail.value })
  },
  
  onChangeNewRole(e) {
    this.setData({ newRoleIndex: Number(e.detail.value) })
  },
  
  async onAddAdmin() {
    const openid = (this.data.newOpenid || '').trim()
    const role = this.data.roleOptions[this.data.newRoleIndex] || 'admin'
    if (!openid) {
      wx.showToast({ title: '请填写openid', icon: 'none' })
      return
    }
  
    wx.showLoading({ title: '添加中...' })
    try {
      await call('admin', 'add', { openid, role })
      wx.hideLoading()
      wx.showToast({ title: '已添加/已更新' })
      this.setData({ newOpenid: '', newRoleIndex: 0 })
      await this.refresh()
    } catch (e) {
      wx.hideLoading()
      console.error(e)
      wx.showToast({ title: e.message || '添加失败', icon: 'none' })
    }
  },
  
  onRemoveAdmin(e) {
    const openid = (e.currentTarget.dataset.openid || '').trim()
    if (!openid) return
  
    wx.showModal({
      title: '确认删除管理员？',
      content: `openid: ${openid}`,
      success: async (r) => {
        if (!r.confirm) return
  
        wx.showLoading({ title: '删除中...' })
        try {
          await call('admin', 'remove', { openid })
          wx.hideLoading()
          wx.showToast({ title: '已删除' })
          await this.refresh()
        } catch (e) {
          wx.hideLoading()
          console.error(e)
          wx.showToast({ title: e.message || '删除失败', icon: 'none' })
        }
      }
    })
  },

  async refreshRequests() {
    this.setData({ reqLoading: true, reqError: '' })
    try {
      const r = await call('admin', 'listRequests')
      this.setData({
        reqLoading: false,
        requests: r.requests || [],
        reqError: ''
      })
      return r
    } catch (e) {
      console.error(e)
      this.setData({ reqLoading: false, reqError: e.message || '加载申请失败', requests: [] })
      return null
    }
  },
  
  onApproveRequest(e) {
    const requestId = e.currentTarget.dataset.id
    wx.showModal({
      title: '通过申请？',
      content: '通过后将加入管理员（admin）',
      success: async (r) => {
        if (!r.confirm) return
        wx.showLoading({ title: '处理中...' })
        try {
          await call('admin', 'approveRequest', { requestId })
          wx.hideLoading()
          wx.showToast({ title: '已通过', icon: 'none' })
          await this.refresh()
          await this.refreshRequests()
        } catch (e) {
          wx.hideLoading()
          console.error(e)
          wx.showToast({ title: e.message || '失败', icon: 'none' })
        }
      }
    })
  },
  
  onRejectRequest(e) {
    const requestId = e.currentTarget.dataset.id
    wx.showModal({
      title: '拒绝申请？',
      content: '拒绝后不会加入管理员',
      success: async (r) => {
        if (!r.confirm) return
        wx.showLoading({ title: '处理中...' })
        try {
          await call('admin', 'rejectRequest', { requestId })
          wx.hideLoading()
          wx.showToast({ title: '已拒绝', icon: 'none' })
          await this.refreshRequests()
        } catch (e) {
          wx.hideLoading()
          console.error(e)
          wx.showToast({ title: e.message || '失败', icon: 'none' })
        }
      }
    })
  },

  onRefresherRefresh() {
    this.setData({ refresherTriggered: true })
  
    Promise.all([
      this.refresh(),
      this.refreshRequests()
    ]).finally(() => {
      this.setData({ refresherTriggered: false })
    })
  },

  async onRemarkBlur(e) {
    const openid = (e.currentTarget.dataset.openid || '').trim()
    const remark = (e.detail.value || '').trim()
    if (!openid) return
  
    try {
      await call('admin', 'updateRemark', { openid, remark })
  
      // ✅ 本地直接更新，不用整页刷新
      const next = (this.data.admins || []).map(a =>
        a.openid === openid ? { ...a, remark } : a
      )
      this.setData({ admins: next })
    } catch (e) {
      console.error(e)
      wx.showToast({ title: e.message || '保存失败', icon: 'none' })
    }
  }
})