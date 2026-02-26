const cloud = require('wx-server-sdk')
const XLSX = require('xlsx')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const { requireAdminRoles } = require('../../_shared/guard')

const { computeResult, COMPUTE_VERSION } = require('../../_shared/compute')
const { processInput } = require('../../_shared/inputProcessor')

function safeInt(v, def = 0) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : def
}
function safeNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}
function normBrandIndex(v) {
  if (v === 2 || v === '2' || String(v).includes('隐适美')) return 1
  return 0
}
function normAgeIndex(v) {
  if (v === 2 || v === '2' || String(v).includes('已结束')) return 1
  return 0
}
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
    await Promise.all(chunk.map(async (doc, idx) => {
      try {
        await db.collection('user_records').add({ data: doc })
        success++
      } catch (e) {
        errors.push({ index: i + idx, error: e?.message || String(e) })
      }
    }))
  }

  return { success, errors }
}

module.exports = async ({ data }) => {
  // ✅ 统一权限：不再 return Permission denied，直接 throw
  const admin = await requireAdminRoles(['admin', 'super_admin'])
  const role = admin.role

  const fileID = data && data.fileID
  if (!fileID) return { ok: false, error: 'fileID required' }

  const dl = await cloud.downloadFile({ fileID })
  const buffer = dl.fileContent

  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = wb.SheetNames[0]
  const sheet = wb.Sheets[sheetName]
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true })

  const dataRows = aoa
    .slice(1)
    .filter(r => Array.isArray(r) && r.some(cell => String(cell ?? '').trim() !== ''))

  const now = Date.now()
  const docs = []

  dataRows.forEach((r, idx) => {
    let mapped
    try { mapped = mapRow(r) } catch { mapped = { openid: '', brandIndex: 0, ageIndex: 0, inputs: {} } }

    const openidRaw = String(mapped.openid ?? '').trim()

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
      processed = {
        ok: true,
        inputs: mapped.inputs || {},
        brandIndex: Number(mapped.brandIndex ?? 0),
        ageIndex: Number(mapped.ageIndex ?? 0),
        issues: [{
          level: 'warn',
          code: 'W_INPUT_PROCESSOR_FAILED',
          message: '输入处理器执行失败，已回退为原始输入（实验模式仍写入）',
          detail: { error: e?.message || String(e) }
        }],
        patched: false,
        inputVersion: 'unknown'
      }
    }

    let result
    try {
      result = computeResult(processed.inputs, processed.brandIndex, processed.ageIndex)
    } catch (e) {
      result = { ready: false, error: e?.message || String(e) }
    }

    docs.push({
      openid: openidRaw || `EXPERIMENT_ROW_${idx + 2}`,
      inputs: processed.inputs,
      brandIndex: processed.brandIndex,
      ageIndex: processed.ageIndex,
      result,

      inputIssues: processed.issues || [],
      inputPatched: !!processed.patched,
      inputVersion: processed.inputVersion,
      computeVersion: COMPUTE_VERSION,

      createdAtMs: now,
      createdAt: now,
      updatedAt: now,

      version: 'v2',
      importedBy: admin.openid,
      importFileID: fileID,
      importSheet: sheetName,
      importRow: idx + 2
    })
  })

  const writeRes = await batchAdd(docs, 20)
  const totalRows = dataRows.length

  return {
    ok: true,
    role,
    sheetName,
    total: totalRows,
    totalRows,
    toWrite: docs.length,
    success: writeRes.success,
    failed: writeRes.errors.length,
    issuesCount: docs.reduce((sum, d) => sum + ((d.inputIssues || []).length), 0),
    errors: (writeRes.errors || []).slice(0, 20)
  }
}