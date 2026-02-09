// Payroll Tax Tables for Southern Africa
// Country-specific PAYE brackets, rebates, and UIF/social security rates

// =============================================
// SOUTH AFRICA — 2025/2026 Tax Year
// =============================================
export const SA_TAX_TABLES = {
  // Annual PAYE brackets
  brackets: [
    { min: 0, max: 237100, rate: 0.18, baseAmount: 0 },
    { min: 237101, max: 370500, rate: 0.26, baseAmount: 42678 },
    { min: 370501, max: 512800, rate: 0.31, baseAmount: 77362 },
    { min: 512801, max: 673000, rate: 0.36, baseAmount: 121475 },
    { min: 673001, max: 857900, rate: 0.39, baseAmount: 179147 },
    { min: 857901, max: 1817000, rate: 0.41, baseAmount: 251258 },
    { min: 1817001, max: Infinity, rate: 0.45, baseAmount: 644489 },
  ],
  // Annual rebates
  rebates: {
    primary: 17235,    // All taxpayers
    secondary: 9444,   // 65 and older
    tertiary: 3145,    // 75 and older
  },
  // Annual tax thresholds (below these = no tax)
  thresholds: {
    under65: 95750,
    age65to74: 148217,
    age75plus: 165689,
  },
}

export const SA_UIF = {
  employeeRate: 0.01,   // 1%
  employerRate: 0.01,   // 1%
  monthlyCeiling: 17712, // Maximum monthly remuneration for UIF
}

// =============================================
// BOTSWANA
// =============================================
export const BW_TAX_TABLES = {
  // Annual PAYE brackets (resident individual)
  brackets: [
    { min: 0, max: 48000, rate: 0, baseAmount: 0 },
    { min: 48001, max: 84000, rate: 0.05, baseAmount: 0 },
    { min: 84001, max: 120000, rate: 0.125, baseAmount: 1800 },
    { min: 120001, max: 156000, rate: 0.1875, baseAmount: 6300 },
    { min: 156001, max: Infinity, rate: 0.25, baseAmount: 13050 },
  ],
  rebates: {
    primary: 0,
    secondary: 0,
    tertiary: 0,
  },
  thresholds: {
    under65: 48000,
    age65to74: 48000,
    age75plus: 48000,
  },
}

export const BW_UIF = {
  employeeRate: 0,
  employerRate: 0,
  monthlyCeiling: 0,
}

// =============================================
// ZIMBABWE
// =============================================
export const ZW_TAX_TABLES = {
  // Annual PAYE brackets (USD)
  brackets: [
    { min: 0, max: 1200, rate: 0, baseAmount: 0 },
    { min: 1201, max: 36000, rate: 0.20, baseAmount: 0 },
    { min: 36001, max: 60000, rate: 0.25, baseAmount: 6960 },
    { min: 60001, max: 120000, rate: 0.30, baseAmount: 12960 },
    { min: 120001, max: 240000, rate: 0.35, baseAmount: 30960 },
    { min: 240001, max: Infinity, rate: 0.40, baseAmount: 72960 },
  ],
  rebates: {
    primary: 0,
    secondary: 0,
    tertiary: 0,
  },
  thresholds: {
    under65: 1200,
    age65to74: 1200,
    age75plus: 1200,
  },
  aidsLevy: 0.03, // 3% of PAYE
}

export const ZW_NSSA = {
  employeeRate: 0.045,  // 4.5%
  employerRate: 0.045,  // 4.5%
  monthlyCeiling: 700,  // USD cap per month
}

// =============================================
// LOOKUP HELPERS
// =============================================
const TAX_TABLES_BY_COUNTRY = {
  'South Africa': { tax: SA_TAX_TABLES, social: SA_UIF },
  'Botswana': { tax: BW_TAX_TABLES, social: BW_UIF },
  'Zimbabwe': { tax: ZW_TAX_TABLES, social: ZW_NSSA },
}

export const getTaxTablesForCountry = (country) => {
  return TAX_TABLES_BY_COUNTRY[country] || TAX_TABLES_BY_COUNTRY['South Africa']
}
