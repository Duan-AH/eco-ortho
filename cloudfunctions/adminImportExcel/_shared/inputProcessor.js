// cloudfunctions/computeAndSave/_shared/inputProcessor.js
// 输入处理骨架：normalize + issues（先占坑，未来再扩展规则）
// 注意：由于云端部署限制，本文件会在多个云函数中复制；用版本号保证同步。

const INPUT_PROCESSOR_VERSION = 'input_v0.1_2026-02-24'

// --- 工具函数 ---
function safeInt(v, def = 0) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : def
}
function safeNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}
function norm01(v, def = 0) {
  const n = Number(v)
  if (n === 0 || n === 1) return n
  return def
}

/**
 * @param {object} params
 * @param {object} params.inputs 原始 inputs
 * @param {any} params.brandIndex
 * @param {any} params.ageIndex
 * @param {object} params.ctx 上下文：{ mode, source, ... }（预留）
 */
function processInput({ inputs, brandIndex, ageIndex, ctx = {} }) {
  const issues = []

  // 1) normalize：先不做“拦截”，只做最安全的类型归一
  const inps = inputs || {}
  const normalized = {
    // 现有 compute.js 用到的字段都列出来（没有就给默认值）
    n: safeInt(inps.n, 0),
    x: safeInt(inps.x, 0),
    k: safeInt(inps.k, 8),

    travelModeIndex: safeInt(inps.travelModeIndex, 0),
    travel_km_roundtrip: safeNumber(inps.travel_km_roundtrip, 0),
    travel_station_roundtrip: safeInt(inps.travel_station_roundtrip, 0),

    lab_blood_count: safeInt(inps.lab_blood_count, 0),
    cleaning_count: safeInt(inps.cleaning_count, 0),

    elastic_per_day: safeInt(inps.elastic_per_day, 0),
    elastic_days: safeInt(inps.elastic_days, 0),
    case_box: safeInt(inps.case_box, 1),
    chewie: safeInt(inps.chewie, 1),

    lingual_button_count: safeInt(inps.lingual_button_count, 0),
    miniscrew_count: safeInt(inps.miniscrew_count, 0)
  }

  const bi = norm01(brandIndex, 0)
  const ai = norm01(ageIndex, 0)

  // 2) 预留：轻量提示（先给一个示例 warn，后面再加）
  // 这里不阻断：ok 永远 true
  if (normalized.x < 0 || normalized.n < 0) {
    issues.push({
      level: 'warn',
      field: 'n/x',
      code: 'W_NEGATIVE',
      message: 'n 或 x 为负数，已按输入参与计算（当前不拦截）',
      detail: { n: normalized.n, x: normalized.x }
    })
  }

  return {
    ok: true, // 先不拦截，保持“输啥算啥”
    inputs: normalized,
    brandIndex: bi,
    ageIndex: ai,
    issues,
    patched: false,
    inputVersion: INPUT_PROCESSOR_VERSION
  }
}

module.exports = { processInput, INPUT_PROCESSOR_VERSION }