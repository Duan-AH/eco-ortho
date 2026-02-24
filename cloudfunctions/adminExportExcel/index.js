const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const xlsx = require('xlsx')
const fs = require('fs')
const path = require('path')

function toMs(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const s = v.trim()
    if (/^\d+$/.test(s)) {
      const n = Number(s)
      if (Number.isFinite(n)) return n
    }
    const d = new Date(s)
    const t = d.getTime()
    if (!Number.isNaN(t)) return t
  }
  return 0
}

function pad2(n) {
  return n < 10 ? '0' + n : String(n)
}

// ✅ 北京时间（UTC+8），24小时制，格式：YYYY-MM-DD HH:mm:ss
function formatBJ(ms) {
  const t = Number(ms)
  if (!Number.isFinite(t) || t <= 0) return ''

  // 用 UTC 基础 + 8小时，避免设备/环境 locale 产生“上午/下午”
  const d = new Date(t)
  const utc = d.getTime() + d.getTimezoneOffset() * 60000
  const bj = new Date(utc + 8 * 3600000)

  const Y = bj.getUTCFullYear()
  const M = pad2(bj.getUTCMonth() + 1)
  const D = pad2(bj.getUTCDate())
  const hh = pad2(bj.getUTCHours())
  const mm = pad2(bj.getUTCMinutes())
  const ss = pad2(bj.getUTCSeconds())
  return `${Y}-${M}-${D} ${hh}:${mm}:${ss}`
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  // 1) 校验管理员
  const adminRes = await db.collection('admins').where({
    openid: wxContext.OPENID
  }).get()

  if (adminRes.data.length === 0) {
    return { ok: false, error: 'Permission denied' }
  }

  // 2) 拉取全部记录（分页）
  const MAX_LIMIT = 100
  const countRes = await db.collection('user_records').count()
  const total = countRes.total

  let records = []
  for (let i = 0; i < total; i += MAX_LIMIT) {
    const res = await db.collection('user_records')
      .orderBy('createdAtMs', 'desc')
      .skip(i)
      .limit(MAX_LIMIT)
      .get()
    records = records.concat(res.data)
  }

  // 3) 归一化毫秒值 + 最终稳定排序（关键）
  const normalized = records.map(r => {
    const ms = toMs(r.createdAtMs) || toMs(r.createdAt)
    return { ...r, createdAtMsNormalized: ms }
  })
  normalized.sort((a, b) => (b.createdAtMsNormalized || 0) - (a.createdAtMsNormalized || 0))

  // 4) 展平为表格行
  const rows = normalized.map(r => {
    const inputs = r.inputs || {}
    const result = r.result || {}

    const brandIndex = Number(r.brandIndex ?? 0)
    const ageIndex = Number(r.ageIndex ?? 0)
    const brandLabel = brandIndex === 1 ? '隐适美' : '时代天使'
    const ageLabel = ageIndex === 1 ? '已结束' : '未结束'

    const ms = Number(r.createdAtMsNormalized || 0)

    return {
      记录ID: r._id,
      创建时间: formatBJ(ms), // ✅ 统一输出（北京时间 24小时制）
      用户ID: r.openid,

      牙套品牌: brandLabel,
      替牙期是否结束: ageLabel,

      n初诊: inputs.n,
      x复诊: inputs.x,
      k套数: inputs.k,

      交通方式: inputs.travelModeIndex,
      往返公里数: inputs.travel_km_roundtrip,
      往返站数: inputs.travel_station_roundtrip,

      血常规次数: inputs.lab_blood_count,
      洗牙次数: inputs.cleaning_count,

      皮筋每天: inputs.elastic_per_day,
      皮筋天数: inputs.elastic_days,

      收纳盒数: inputs.case_box,
      咬胶数: inputs.chewie,

      舌侧扣数: inputs.lingual_button_count,
      支抗钉数: inputs.miniscrew_count,

      总排放g: result.total_g,
      总排放kg: result.total_kg
    }
  })

  // 5) 生成 xlsx 到 /tmp
  const wb = xlsx.utils.book_new()
  const ws = xlsx.utils.json_to_sheet(rows)
  xlsx.utils.book_append_sheet(wb, ws, 'records')

  const filename = `user_records_${Date.now()}.xlsx`
  const filepath = path.join('/tmp', filename)
  xlsx.writeFile(wb, filepath)

  // 6) 上传到云存储，返回 fileID
  const uploadRes = await cloud.uploadFile({
    cloudPath: `exports/${filename}`,
    fileContent: fs.createReadStream(filepath)
  })

  return { ok: true, fileID: uploadRes.fileID, total }
}