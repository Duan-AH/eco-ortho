// cloudfunctions/adminImportExcel/index.js
// ✅ 实验阶段：彻底去掉所有行级校验（B类）
//  - 不再检查 openid / n / x
//  - 不再收集 rowErrors
//  - 每一行都尽量落库（即使 result.ready=false）
//  - 失败只统计“写库失败”

const cloud = require('wx-server-sdk')
const XLSX = require('xlsx')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// ✅ 使用同一套云端统一计算
const { computeResult, COMPUTE_VERSION } = require('./_shared/compute')
const { processInput } = require('./_shared/inputProcessor')

// --- 小工具：把 Excel 值规范化 ---
function safeInt(v, def = 0) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : def
}
function safeNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}
function normBrandIndex(v) {
  // Excel 可能是 1/2 或 文本
  // 约定：时代天使=0；隐适美=1
  if (v === 2 || v === '2' || String(v).includes('隐适美')) return 1
  return 0
}
function normAgeIndex(v) {
  // 约定：未结束=0；已结束=1
  if (v === 2 || v === '2' || String(v).includes('已结束')) return 1
  return 0
}

// ✅ 列映射（按你的 Excel 列顺序）
function mapRow(r) {
  const openid = String(r[0] ?? '').trim()

  const brandIndex = normBrandIndex(r[1])
  const ageIndex = normAgeIndex(r[2])

  const inputs = {
    n: safeInt(r[3]),
    x: safeInt(r[4]),
    k: safeInt(r[5], 8),

    travelModeIndex: safeInt(r[6], 0),
    travel_km_roundtrip: safeNumber(r[7], 0),
    travel_station_roundtrip: safeInt(r[8], 0),

    lab_blood_count: safeInt(r[9], 0),
    cleaning_count: safeInt(r[10], 0),

    elastic_per_day: safeInt(r[11], 0),
    elastic_days: safeInt(r[12], 0),
    case_box: safeInt(r[13], 1),
    chewie: safeInt(r[14], 1),

    lingual_button_count: safeInt(r[15], 0),
    miniscrew_count: safeInt(r[16], 0)
  }

  return { openid, brandIndex, ageIndex, inputs }
}

async function batchAdd(docs, batchSize = 20) {
  let success = 0
  const errors = []

  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize)
    const tasks = chunk.map(async (doc, idx) => {
      try {
        await db.collection('user_records').add({ data: doc })
        success++
      } catch (e) {
        errors.push({
          index: i + idx,
          error: e && e.message ? e.message : String(e)
        })
      }
    })
    await Promise.all(tasks)
  }

  return { success, errors }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  // 1) 权限：必须是 admin / super_admin
  const me = await db.collection('admins').where({ openid: OPENID }).get()
  const role = me.data && me.data[0] && (me.data[0].role || 'admin')
  if (!me.data.length || !['admin', 'super_admin'].includes(role)) {
    return { ok: false, error: 'Permission denied' }
  }

  // 2) 必须传 fileID
  const fileID = event.fileID
  if (!fileID) return { ok: false, error: 'fileID required' }

  // 3) 下载 Excel
  const dl = await cloud.downloadFile({ fileID })
  const buffer = dl.fileContent

  // 4) 解析第一个 sheet（第一行表头丢弃）
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = wb.SheetNames[0]
  const sheet = wb.Sheets[sheetName]
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true })

  // ✅ 只过滤“整行全空”的行
  const dataRows = aoa
    .slice(1)
    .filter(r => Array.isArray(r) && r.some(cell => String(cell ?? '').trim() !== ''))

  // 5) 逐行：映射 → 输入处理 → 计算 → 准备写库（不做任何行级校验）
  const now = Date.now()
  const docs = []

  dataRows.forEach((r, idx) => {
    // 5.1 映射（尽量不让 mapRow 阻断）
    let mapped
    try {
      mapped = mapRow(r)
    } catch (e) {
      mapped = { openid: '', brandIndex: 0, ageIndex: 0, inputs: {} }
    }

    const openidRaw = String(mapped.openid ?? '').trim()

    // ✅ 5.2 输入处理骨架（实验模式：不拦截，只 normalize + 产出 issues）
    let processed
    try {
      processed = processInput({
        inputs: mapped.inputs,
        brandIndex: mapped.brandIndex,
        ageIndex: mapped.ageIndex,
        ctx: {
          mode: 'excel_experiment',
          source: 'adminImportExcel',
          importRow: idx + 2,
          importSheet: sheetName,
          importFileID: fileID
        }
      })
    } catch (e) {
      // 输入处理器不允许阻断导入：兜底为“原样输入”
      processed = {
        ok: true,
        inputs: mapped.inputs || {},
        brandIndex: Number(mapped.brandIndex ?? 0),
        ageIndex: Number(mapped.ageIndex ?? 0),
        issues: [{
          level: 'warn',
          code: 'W_INPUT_PROCESSOR_FAILED',
          message: '输入处理器执行失败，已回退为原始输入（实验模式仍写入）',
          detail: { error: e && e.message ? e.message : String(e) }
        }],
        patched: false,
        inputVersion: 'unknown'
      }
    }

    // 5.3 统一计算（实验阶段允许写入）
    let result
    try {
      result = computeResult(processed.inputs, processed.brandIndex, processed.ageIndex)
    } catch (e) {
      result = { ready: false, error: e && e.message ? e.message : String(e) }
    }

    // 5.4 永远写入 docs
    docs.push({
      openid: openidRaw || `EXPERIMENT_ROW_${idx + 2}`,

      inputs: processed.inputs,
      brandIndex: processed.brandIndex,
      ageIndex: processed.ageIndex,
      result,

      // ✅ 预留：输入问题/修复/版本追溯
      inputIssues: processed.issues || [],
      inputPatched: !!processed.patched,
      inputVersion: processed.inputVersion,
      computeVersion: COMPUTE_VERSION,

      // ✅ 新增：统一排序字段
      createdAtMs: now,

      createdAt: now,
      updatedAt: now,

      version: 'v2',
      importedBy: OPENID,
      importFileID: fileID,
      importSheet: sheetName,
      importRow: idx + 2
    })
  })

  // 6) 分批写库
  const writeRes = await batchAdd(docs, 20)

  return {
    ok: true,
    role,
    sheetName,
    totalRows: dataRows.length,
    toWrite: docs.length,

    success: writeRes.success,
    failed: writeRes.errors.length,

    // ✅ 额外回传：本次导入累计 issues 数（方便你前端先做一个总提示）
    issuesCount: docs.reduce((sum, d) => sum + ((d.inputIssues || []).length), 0),

    errors: (writeRes.errors || []).slice(0, 20)
  }
}