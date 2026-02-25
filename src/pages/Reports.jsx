import { useState } from 'react'
import { FileText, Calculator, Download, Printer, BookOpen, Scale, TrendingUp, Users, Truck, Clock, Receipt, AlertCircle } from 'lucide-react'
import {
  useTrialBalance,
  useVATReport,
  useVAT201Report,
  useGeneralLedger,
  useIncomeStatement,
  useBalanceSheet,
  useARAging,
  useAPAging,
  useCashFlowStatement,
  useProfitLossByPeriod,
  useCustomerStatement,
  useSupplierStatement,
  useUnreconciledItemsReport,
  useIntegrityChecks,
} from '../hooks/useReports'
import { useCompany } from '../context/CompanyContext'
import { useClients } from '../hooks/useClients'
import { useSuppliers } from '../hooks/useSuppliers'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Select } from '../components/ui/Input'
import { formatCurrency, formatDate } from '../lib/constants'
import { exportToExcel, exportToPDF, getDateRange } from '../lib/utils'
import { format } from 'date-fns'

const Reports = () => {
  const [activeReport, setActiveReport] = useState('trial-balance')
  const [period, setPeriod] = useState('this_month')
  const [customRange, setCustomRange] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  })
  const [statementClientId, setStatementClientId] = useState('')
  const [statementSupplierId, setStatementSupplierId] = useState('')
  const [plCompareRange, setPlCompareRange] = useState({
    start2: format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), 'yyyy-MM-dd'),
    end2: format(new Date(new Date().getFullYear(), new Date().getMonth(), 0), 'yyyy-MM-dd'),
  })

  const { activeCompany } = useCompany()
  const { clients } = useClients()
  const { suppliers } = useSuppliers()

  const dateRange = period === 'custom' ? customRange : getDateRange(period)

  const { data: trialBalance, isLoading: tbLoading } = useTrialBalance(
    dateRange.start,
    dateRange.end
  )

  const { data: vatReport, isLoading: vatLoading } = useVATReport(
    dateRange.start,
    dateRange.end
  )

  const { data: vat201Report, isLoading: vat201Loading } = useVAT201Report(
    dateRange.start,
    dateRange.end
  )

  const { data: generalLedger, isLoading: glLoading } = useGeneralLedger(
    dateRange.start,
    dateRange.end
  )

  const { data: incomeStatement, isLoading: isLoading } = useIncomeStatement(
    dateRange.start,
    dateRange.end
  )

  const { data: balanceSheet, isLoading: bsLoading } = useBalanceSheet(
    dateRange.end
  )

  const { data: arAging, isLoading: arAgingLoading } = useARAging(dateRange.end)
  const { data: apAging, isLoading: apAgingLoading } = useAPAging(dateRange.end)
  const { data: cashFlow, isLoading: cashFlowLoading } = useCashFlowStatement(
    dateRange.start,
    dateRange.end
  )
  const { data: plByPeriod, isLoading: plByPeriodLoading } = useProfitLossByPeriod(
    dateRange.start,
    dateRange.end,
    plCompareRange.start2,
    plCompareRange.end2,
    activeReport === 'pl-by-period'
  )
  const { data: customerStatement, isLoading: customerStmtLoading } = useCustomerStatement(
    statementClientId || null,
    dateRange.start,
    dateRange.end
  )
  const { data: supplierStatement, isLoading: supplierStmtLoading } = useSupplierStatement(
    statementSupplierId || null,
    dateRange.start,
    dateRange.end
  )
  const { data: unreconciledItems, isLoading: unreconciledLoading } = useUnreconciledItemsReport(dateRange.end)
  const { data: integrityChecks, isLoading: integrityLoading } = useIntegrityChecks(
    dateRange.start,
    dateRange.end,
    activeReport === 'integrity-checks'
  )

  const handleExportExcel = () => {
    if (activeReport === 'trial-balance' && trialBalance) {
      const data = trialBalance.accounts.map((a) => ({
        Code: a.code,
        Account: a.name,
        Type: a.type,
        Debit: a.debit.toFixed(2),
        Credit: a.credit.toFixed(2),
      }))
      data.push({
        Code: '',
        Account: 'TOTAL',
        Type: '',
        Debit: trialBalance.totalDebits.toFixed(2),
        Credit: trialBalance.totalCredits.toFixed(2),
      })
      exportToExcel(data, `trial-balance-${dateRange.start}-${dateRange.end}`, 'Trial Balance')
    } else if (activeReport === 'vat' && vatReport) {
      const data = [
        { Description: 'Total Sales (excl. VAT)', Amount: vatReport.totalSales.toFixed(2) },
        { Description: 'Output VAT', Amount: vatReport.outputVAT.toFixed(2) },
        { Description: 'Total Purchases (excl. VAT)', Amount: vatReport.totalPurchases.toFixed(2) },
        { Description: 'Input VAT', Amount: vatReport.inputVAT.toFixed(2) },
        { Description: 'Net VAT Payable', Amount: vatReport.netVAT.toFixed(2) },
      ]
      exportToExcel(data, `vat-report-${dateRange.start}-${dateRange.end}`, 'VAT Report')
    } else if (activeReport === 'income-statement' && incomeStatement) {
      const data = []

      // Revenue section
      data.push({ Section: 'REVENUE', Account: '', Amount: '' })
      incomeStatement.revenue?.forEach((acc) => {
        data.push({ Section: '', Account: acc.name, Amount: acc.balance.toFixed(2) })
      })
      data.push({ Section: '', Account: 'Total Revenue', Amount: incomeStatement.totalRevenue.toFixed(2) })
      data.push({ Section: '', Account: '', Amount: '' })

      // Cost of Sales section
      data.push({ Section: 'COST OF SALES', Account: '', Amount: '' })
      incomeStatement.costOfSales?.forEach((acc) => {
        data.push({ Section: '', Account: acc.name, Amount: `(${acc.balance.toFixed(2)})` })
      })
      data.push({ Section: '', Account: 'Total Cost of Sales', Amount: `(${incomeStatement.totalCostOfSales.toFixed(2)})` })
      data.push({ Section: '', Account: '', Amount: '' })

      // Gross Profit
      data.push({ Section: 'GROSS PROFIT', Account: '', Amount: incomeStatement.grossProfit.toFixed(2) })
      data.push({ Section: '', Account: '', Amount: '' })

      // Operating Expenses section
      data.push({ Section: 'OPERATING EXPENSES', Account: '', Amount: '' })
      incomeStatement.operatingExpenses?.forEach((acc) => {
        data.push({ Section: '', Account: acc.name, Amount: `(${acc.balance.toFixed(2)})` })
      })
      data.push({ Section: '', Account: 'Total Operating Expenses', Amount: `(${incomeStatement.totalOperatingExpenses.toFixed(2)})` })
      data.push({ Section: '', Account: '', Amount: '' })

      // Other Income
      if (incomeStatement.otherIncome?.length > 0) {
        data.push({ Section: 'OTHER INCOME', Account: '', Amount: '' })
        incomeStatement.otherIncome.forEach((acc) => {
          data.push({ Section: '', Account: acc.name, Amount: acc.balance.toFixed(2) })
        })
        data.push({ Section: '', Account: '', Amount: '' })
      }

      // Other Expenses
      if (incomeStatement.otherExpenses?.length > 0) {
        data.push({ Section: 'OTHER EXPENSES', Account: '', Amount: '' })
        incomeStatement.otherExpenses.forEach((acc) => {
          data.push({ Section: '', Account: acc.name, Amount: `(${acc.balance.toFixed(2)})` })
        })
        data.push({ Section: '', Account: '', Amount: '' })
      }

      // Net Profit
      const netProfitDisplay = incomeStatement.netProfit >= 0
        ? incomeStatement.netProfit.toFixed(2)
        : `(${Math.abs(incomeStatement.netProfit).toFixed(2)})`
      data.push({ Section: 'NET PROFIT / (LOSS)', Account: '', Amount: netProfitDisplay })

      exportToExcel(data, `income-statement-${dateRange.start}-${dateRange.end}`, 'Income Statement')
    } else if (activeReport === 'balance-sheet' && balanceSheet) {
      const data = []

      // Assets section
      data.push({ Section: 'ASSETS', Category: '', Account: '', Amount: '' })
      data.push({ Section: '', Category: 'Current Assets', Account: '', Amount: '' })
      balanceSheet.currentAssets?.forEach((acc) => {
        data.push({ Section: '', Category: '', Account: acc.name, Amount: acc.balance.toFixed(2) })
      })
      data.push({ Section: '', Category: '', Account: 'Total Current Assets', Amount: balanceSheet.totalCurrentAssets.toFixed(2) })

      data.push({ Section: '', Category: 'Fixed Assets', Account: '', Amount: '' })
      balanceSheet.fixedAssets?.forEach((acc) => {
        data.push({ Section: '', Category: '', Account: acc.name, Amount: acc.balance.toFixed(2) })
      })
      data.push({ Section: '', Category: '', Account: 'Total Fixed Assets', Amount: balanceSheet.totalFixedAssets.toFixed(2) })

      data.push({ Section: '', Category: '', Account: 'TOTAL ASSETS', Amount: balanceSheet.totalAssets.toFixed(2) })
      data.push({ Section: '', Category: '', Account: '', Amount: '' })

      // Liabilities section
      data.push({ Section: 'LIABILITIES', Category: '', Account: '', Amount: '' })
      data.push({ Section: '', Category: 'Current Liabilities', Account: '', Amount: '' })
      balanceSheet.currentLiabilities?.forEach((acc) => {
        data.push({ Section: '', Category: '', Account: acc.name, Amount: acc.balance.toFixed(2) })
      })
      data.push({ Section: '', Category: '', Account: 'Total Current Liabilities', Amount: balanceSheet.totalCurrentLiabilities.toFixed(2) })

      if (balanceSheet.longTermLiabilities?.length > 0) {
        data.push({ Section: '', Category: 'Long-term Liabilities', Account: '', Amount: '' })
        balanceSheet.longTermLiabilities.forEach((acc) => {
          data.push({ Section: '', Category: '', Account: acc.name, Amount: acc.balance.toFixed(2) })
        })
        data.push({ Section: '', Category: '', Account: 'Total Long-term Liabilities', Amount: balanceSheet.totalLongTermLiabilities.toFixed(2) })
      }

      data.push({ Section: '', Category: '', Account: 'Total Liabilities', Amount: balanceSheet.totalLiabilities.toFixed(2) })
      data.push({ Section: '', Category: '', Account: '', Amount: '' })

      // Equity section
      data.push({ Section: 'EQUITY', Category: '', Account: '', Amount: '' })
      balanceSheet.equity?.forEach((acc) => {
        data.push({ Section: '', Category: '', Account: acc.name, Amount: acc.balance.toFixed(2) })
      })
      data.push({ Section: '', Category: '', Account: 'Retained Earnings (Current Period)', Amount: balanceSheet.retainedEarnings.toFixed(2) })
      data.push({ Section: '', Category: '', Account: 'Total Equity', Amount: balanceSheet.totalEquityWithRetainedEarnings.toFixed(2) })
      data.push({ Section: '', Category: '', Account: '', Amount: '' })

      // Total
      data.push({ Section: '', Category: '', Account: 'TOTAL LIABILITIES & EQUITY', Amount: balanceSheet.totalLiabilitiesAndEquity.toFixed(2) })

      exportToExcel(data, `balance-sheet-${dateRange.end}`, 'Balance Sheet')
    } else if (activeReport === 'general-ledger' && generalLedger) {
      const data = []

      generalLedger.ledger?.forEach((ledger) => {
        // Account header
        data.push({
          Account: `${ledger.account.code} - ${ledger.account.name}`,
          Date: '',
          'Entry #': '',
          Description: '',
          Debit: '',
          Credit: '',
          Balance: ''
        })

        // Entries
        let runningBalance = 0
        ledger.entries.forEach((entry) => {
          // Calculate running balance based on account type
          if (['asset', 'expense'].includes(ledger.account.type)) {
            runningBalance += entry.debit - entry.credit
          } else {
            runningBalance += entry.credit - entry.debit
          }

          data.push({
            Account: '',
            Date: entry.date,
            'Entry #': entry.entryNumber,
            Description: entry.description || '',
            Debit: entry.debit > 0 ? entry.debit.toFixed(2) : '',
            Credit: entry.credit > 0 ? entry.credit.toFixed(2) : '',
            Balance: runningBalance.toFixed(2)
          })
        })

        // Account totals
        data.push({
          Account: '',
          Date: '',
          'Entry #': '',
          Description: 'TOTAL',
          Debit: ledger.totalDebit.toFixed(2),
          Credit: ledger.totalCredit.toFixed(2),
          Balance: ledger.closingBalance.toFixed(2)
        })

        // Empty row between accounts
        data.push({
          Account: '',
          Date: '',
          'Entry #': '',
          Description: '',
          Debit: '',
          Credit: '',
          Balance: ''
        })
      })

      exportToExcel(data, `general-ledger-${dateRange.start}-${dateRange.end}`, 'General Ledger')
    } else if (activeReport === 'ar-aging' && arAging) {
      const data = arAging.rows.map((r) => ({
        Customer: r.clientName,
        Current: r.current.toFixed(2),
        '31-60 days': r.days_31_60.toFixed(2),
        '61-90 days': r.days_61_90.toFixed(2),
        'Over 90': r.over_90.toFixed(2),
        Total: r.total.toFixed(2),
      }))
      data.push({
        Customer: 'TOTAL',
        Current: arAging.totals.current.toFixed(2),
        '31-60 days': arAging.totals.days_31_60.toFixed(2),
        '61-90 days': arAging.totals.days_61_90.toFixed(2),
        'Over 90': arAging.totals.over_90.toFixed(2),
        Total: arAging.totals.total.toFixed(2),
      })
      exportToExcel(data, `ar-aging-${arAging.asOfDate}`, 'AR Aging')
    } else if (activeReport === 'ap-aging' && apAging) {
      const data = apAging.rows.map((r) => ({
        Supplier: r.supplierName,
        Current: r.current.toFixed(2),
        '31-60 days': r.days_31_60.toFixed(2),
        '61-90 days': r.days_61_90.toFixed(2),
        'Over 90': r.over_90.toFixed(2),
        Total: r.total.toFixed(2),
      }))
      data.push({
        Supplier: 'TOTAL',
        Current: apAging.totals.current.toFixed(2),
        '31-60 days': apAging.totals.days_31_60.toFixed(2),
        '61-90 days': apAging.totals.days_61_90.toFixed(2),
        'Over 90': apAging.totals.over_90.toFixed(2),
        Total: apAging.totals.total.toFixed(2),
      })
      exportToExcel(data, `ap-aging-${apAging.asOfDate}`, 'AP Aging')
    } else if (activeReport === 'vat201' && vat201Report) {
      const data = [
        { Box: '1', Description: 'Output tax', Amount: vat201Report.box1OutputTax.toFixed(2) },
        { Box: '4', Description: 'Input tax', Amount: vat201Report.box4InputTax.toFixed(2) },
        { Box: '7', Description: 'Net VAT', Amount: vat201Report.box7NetVAT.toFixed(2) },
      ]
      exportToExcel(data, `vat201-${dateRange.start}-${dateRange.end}`, 'VAT 201')
    } else if (activeReport === 'cash-flow' && cashFlow) {
      const data = [
        { Section: 'Operating', Item: 'Net Income', Amount: cashFlow.netIncome.toFixed(2) },
        ...cashFlow.operating.items.map((a) => ({ Section: '', Item: a.name, Amount: a.balance.toFixed(2) })),
        { Section: '', Item: 'Operating total', Amount: cashFlow.operating.total.toFixed(2) },
        { Section: 'Investing', Item: '', Amount: '' },
        ...cashFlow.investing.items.map((a) => ({ Section: '', Item: a.name, Amount: a.balance.toFixed(2) })),
        { Section: '', Item: 'Investing total', Amount: cashFlow.investing.total.toFixed(2) },
        { Section: 'Financing', Item: '', Amount: '' },
        ...cashFlow.financing.items.map((a) => ({ Section: '', Item: a.name, Amount: a.balance.toFixed(2) })),
        { Section: '', Item: 'Financing total', Amount: cashFlow.financing.total.toFixed(2) },
        { Section: '', Item: 'Net change in cash', Amount: cashFlow.netChangeInCash.toFixed(2) },
      ]
      exportToExcel(data, `cash-flow-${dateRange.start}-${dateRange.end}`, 'Cash Flow')
    } else if (activeReport === 'pl-by-period' && plByPeriod) {
      const data = [
        { Metric: 'Revenue', Period1: plByPeriod.period1.revenue.toFixed(2), Period2: plByPeriod.period2.revenue.toFixed(2) },
        { Metric: 'Expenses', Period1: plByPeriod.period1.expenses.toFixed(2), Period2: plByPeriod.period2.expenses.toFixed(2) },
        { Metric: 'Net Profit', Period1: plByPeriod.period1.netProfit.toFixed(2), Period2: plByPeriod.period2.netProfit.toFixed(2) },
      ]
      exportToExcel(data, `pl-by-period-${dateRange.start}-${dateRange.end}`, 'P&L by Period')
    } else if (activeReport === 'customer-statement' && customerStatement?.client) {
      const data = [
        { Date: '', Type: 'Opening Balance', Reference: '', Debit: '', Credit: '', Balance: customerStatement.openingBalance.toFixed(2) },
        ...customerStatement.transactions.map((t) => ({
          Date: t.date,
          Type: t.type,
          Reference: t.reference,
          Debit: t.debit > 0 ? t.debit.toFixed(2) : '',
          Credit: t.credit > 0 ? t.credit.toFixed(2) : '',
          Balance: t.balance != null ? Number(t.balance).toFixed(2) : '',
        })),
        { Date: '', Type: 'Closing Balance', Reference: '', Debit: '', Credit: '', Balance: customerStatement.closingBalance.toFixed(2) },
      ]
      exportToExcel(data, `customer-statement-${statementClientId}-${dateRange.start}`, 'Customer Statement')
    } else if (activeReport === 'supplier-statement' && supplierStatement?.supplier) {
      const data = [
        { Date: '', Type: 'Opening Balance', Reference: '', Debit: '', Credit: '', Balance: supplierStatement.openingBalance.toFixed(2) },
        ...supplierStatement.transactions.map((t) => ({
          Date: t.date,
          Type: t.type,
          Reference: t.reference,
          Debit: t.debit > 0 ? t.debit.toFixed(2) : '',
          Credit: t.credit > 0 ? t.credit.toFixed(2) : '',
          Balance: t.balance != null ? Number(t.balance).toFixed(2) : '',
        })),
        { Date: '', Type: 'Closing Balance', Reference: '', Debit: '', Credit: '', Balance: supplierStatement.closingBalance.toFixed(2) },
      ]
      exportToExcel(data, `supplier-statement-${statementSupplierId}-${dateRange.start}`, 'Supplier Statement')
    } else if (activeReport === 'unreconciled-items' && unreconciledItems) {
      const data = []
      unreconciledItems.bankTransactions.forEach((t) => {
        data.push({
          Type: 'Bank Transaction',
          Date: t.date,
          Description: t.description,
          Reference: t.reference || '',
          Amount: t.outstanding.toFixed(2),
          Age: `${t.age} days`,
        })
      })
      unreconciledItems.unpaidInvoices.forEach((inv) => {
        data.push({
          Type: 'Unpaid Invoice',
          Date: inv.date,
          Description: inv.description,
          Reference: inv.reference,
          Amount: inv.outstanding.toFixed(2),
          Age: `${inv.age} days`,
        })
      })
      unreconciledItems.unpaidPurchases.forEach((pur) => {
        data.push({
          Type: 'Unpaid Purchase',
          Date: pur.date,
          Description: pur.description,
          Reference: pur.reference,
          Amount: pur.outstanding.toFixed(2),
          Age: `${pur.age} days`,
        })
      })
      data.push({
        Type: 'TOTAL',
        Date: '',
        Description: '',
        Reference: '',
        Amount: unreconciledItems.totals.total.toFixed(2),
        Age: '',
      })
      exportToExcel(data, `unreconciled-items-${unreconciledItems.asOfDate}`, 'Unreconciled Items')
    }
  }

  const handleExportPDF = () => {
    exportToPDF('report-content', `${activeReport}-${dateRange.start}-${dateRange.end}`)
  }

  const reports = [
    { id: 'trial-balance', name: 'Trial Balance', icon: Calculator },
    { id: 'general-ledger', name: 'General Ledger', icon: BookOpen },
    { id: 'income-statement', name: 'Income Statement', icon: TrendingUp },
    { id: 'balance-sheet', name: 'Balance Sheet', icon: Scale },
    { id: 'vat', name: 'VAT Report', icon: FileText },
    { id: 'vat201', name: 'VAT 201 (SA)', icon: Receipt },
    { id: 'ar-aging', name: 'AR Aging', icon: Clock },
    { id: 'ap-aging', name: 'AP Aging', icon: Clock },
    { id: 'cash-flow', name: 'Cash Flow', icon: TrendingUp },
    { id: 'pl-by-period', name: 'P&L by Period', icon: TrendingUp },
    { id: 'customer-statement', name: 'Customer Statement', icon: Users },
    { id: 'supplier-statement', name: 'Supplier Statement', icon: Truck },
    { id: 'unreconciled-items', name: 'Unreconciled Items', icon: AlertCircle },
    { id: 'integrity-checks', name: 'Integrity Checks', icon: AlertCircle },
  ]

  const periodOptions = [
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'last_quarter', label: 'Last Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'last_year', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Generate financial reports for your business</p>
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExportExcel} className="flex-1 sm:flex-none">
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
          <Button variant="outline" onClick={handleExportPDF} className="flex-1 sm:flex-none">
            <Printer className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </div>

      {/* Report Selection */}
      <div className="flex gap-4 flex-wrap">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors
                ${activeReport === report.id
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              {report.name}
            </button>
          )
        })}
      </div>

      {/* Date Range */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={periodOptions}
            className="w-48"
          />
          {period === 'custom' && (
            <>
              <Input
                label="Start Date"
                type="date"
                value={customRange.start}
                onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                className="w-40"
              />
              <Input
                label="End Date"
                type="date"
                value={customRange.end}
                onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                className="w-40"
              />
            </>
          )}
          <p className="text-sm text-gray-500">
            {dateRange.start && dateRange.end && (
              <>Showing: {formatDate(dateRange.start)} to {formatDate(dateRange.end)}</>
            )}
          </p>
        </div>
      </div>

      {/* Report Content */}
      <div id="report-content" className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Report Header */}
        <div className="text-center mb-6 border-b pb-4">
          <h2 className="text-xl font-bold text-gray-900">{activeCompany?.name}</h2>
          <h3 className="text-lg font-semibold text-gray-700">
            {reports.find(r => r.id === activeReport)?.name || 'Report'}
          </h3>
          <p className="text-sm text-gray-500">
            {activeReport === 'balance-sheet'
              ? `As of ${formatDate(dateRange.end)}`
              : `For the period ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}`
            }
          </p>
        </div>

        {/* Trial Balance */}
        {activeReport === 'trial-balance' && (
          <>
            {tbLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Account</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Debit</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {trialBalance?.accounts?.map((account) => (
                      <tr key={account.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{account.code}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{account.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">{account.type}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono">
                          {account.debit > 0 ? formatCurrency(account.debit, activeCompany?.currency) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono">
                          {account.credit > 0 ? formatCurrency(account.credit, activeCompany?.currency) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr className="font-bold">
                      <td colSpan="3" className="px-4 py-3 text-right">TOTAL</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatCurrency(trialBalance?.totalDebits || 0, activeCompany?.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatCurrency(trialBalance?.totalCredits || 0, activeCompany?.currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {trialBalance && !trialBalance.balanced && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 font-medium">
                      Warning: Debits and credits do not balance. Difference:{' '}
                      {formatCurrency(Math.abs(trialBalance.totalDebits - trialBalance.totalCredits), activeCompany?.currency)}
                    </p>
                  </div>
                )}

                {trialBalance?.balanced && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700 font-medium">
                      Trial Balance is balanced.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* VAT Report */}
        {activeReport === 'vat' && (
          <>
            {vatLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Output VAT Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Output VAT (Sales)</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Sales (excl. VAT)</span>
                      <span className="font-mono">{formatCurrency(vatReport?.totalSales || 0, activeCompany?.currency)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-gray-900">Output VAT</span>
                      <span className="font-mono text-red-600">
                        {formatCurrency(vatReport?.outputVAT || 0, activeCompany?.currency)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      From {vatReport?.vatLineCount || 0} VAT journal line(s)
                    </div>
                  </div>
                </div>

                {/* Input VAT Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Input VAT (Purchases)</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Purchases (excl. VAT)</span>
                      <span className="font-mono">{formatCurrency(vatReport?.totalPurchases || 0, activeCompany?.currency)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-gray-900">Input VAT</span>
                      <span className="font-mono text-green-600">
                        {formatCurrency(vatReport?.inputVAT || 0, activeCompany?.currency)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      From {vatReport?.vatLineCount || 0} VAT journal line(s)
                    </div>
                  </div>
                </div>

                {/* Net VAT */}
                <div className="border-t-2 border-gray-200 pt-4">
                  <div className="bg-primary-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">
                        Net VAT {vatReport?.netVAT >= 0 ? 'Payable' : 'Refundable'}
                      </span>
                      <span
                        className={`text-2xl font-bold font-mono ${
                          vatReport?.netVAT >= 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {formatCurrency(Math.abs(vatReport?.netVAT || 0), activeCompany?.currency)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {vatReport?.netVAT >= 0
                        ? 'Amount due to tax authority'
                        : 'Amount claimable from tax authority'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* General Ledger */}
        {activeReport === 'general-ledger' && (
          <>
            {glLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded" />
                ))}
              </div>
            ) : generalLedger?.ledger?.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No journal entries found for this period.</p>
                <p className="text-sm mt-2">Journal entries are created when invoices are sent or purchases are recorded.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {generalLedger?.ledger?.map((ledger) => (
                  <div key={ledger.account.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                      <div>
                        <span className="font-mono text-sm text-gray-500 mr-2">{ledger.account.code}</span>
                        <span className="font-semibold text-gray-900">{ledger.account.name}</span>
                        <span className="ml-2 text-xs text-gray-500 capitalize">({ledger.account.type})</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-500">Balance: </span>
                        <span className={`font-mono font-semibold ${ledger.closingBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(ledger.closingBalance), activeCompany?.currency)}
                          {ledger.closingBalance < 0 ? ' CR' : ' DR'}
                        </span>
                      </div>
                    </div>
                    <table className="w-full">
                      <thead className="bg-gray-50 border-t border-gray-200">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Entry #</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Debit</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ledger.entries.map((entry, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-600">{formatDate(entry.date)}</td>
                            <td className="px-4 py-2 text-sm font-mono text-gray-500">{entry.entryNumber}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{entry.description}</td>
                            <td className="px-4 py-2 text-sm text-right font-mono">
                              {entry.debit > 0 ? formatCurrency(entry.debit, activeCompany?.currency) : '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-right font-mono">
                              {entry.credit > 0 ? formatCurrency(entry.credit, activeCompany?.currency) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t border-gray-200">
                        <tr className="font-medium">
                          <td colSpan="3" className="px-4 py-2 text-sm text-right">Total</td>
                          <td className="px-4 py-2 text-sm text-right font-mono">{formatCurrency(ledger.totalDebit, activeCompany?.currency)}</td>
                          <td className="px-4 py-2 text-sm text-right font-mono">{formatCurrency(ledger.totalCredit, activeCompany?.currency)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Income Statement */}
        {activeReport === 'income-statement' && (
          <>
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Revenue Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Revenue</h4>
                  {incomeStatement?.revenue?.length > 0 ? (
                    <div className="space-y-2">
                      {incomeStatement.revenue.map((acc) => (
                        <div key={acc.id} className="flex justify-between px-4 py-1">
                          <span className="text-gray-700">{acc.name}</span>
                          <span className="font-mono">{formatCurrency(acc.balance, activeCompany?.currency)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 px-4 py-2 text-sm">No revenue recorded</p>
                  )}
                  <div className="flex justify-between px-4 py-2 bg-gray-50 rounded mt-2 font-semibold">
                    <span>Total Revenue</span>
                    <span className="font-mono">{formatCurrency(incomeStatement?.totalRevenue || 0, activeCompany?.currency)}</span>
                  </div>
                </div>

                {/* Cost of Sales Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Cost of Sales</h4>
                  {incomeStatement?.costOfSales?.length > 0 ? (
                    <div className="space-y-2">
                      {incomeStatement.costOfSales.map((acc) => (
                        <div key={acc.id} className="flex justify-between px-4 py-1">
                          <span className="text-gray-700">{acc.name}</span>
                          <span className="font-mono text-red-600">({formatCurrency(acc.balance, activeCompany?.currency)})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 px-4 py-2 text-sm">No cost of sales recorded</p>
                  )}
                  <div className="flex justify-between px-4 py-2 bg-gray-50 rounded mt-2 font-semibold">
                    <span>Total Cost of Sales</span>
                    <span className="font-mono text-red-600">({formatCurrency(incomeStatement?.totalCostOfSales || 0, activeCompany?.currency)})</span>
                  </div>
                </div>

                {/* Gross Profit */}
                <div className="flex justify-between px-4 py-3 bg-blue-50 rounded-lg border border-blue-200 font-bold text-lg">
                  <span>Gross Profit</span>
                  <span className={`font-mono ${incomeStatement?.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(incomeStatement?.grossProfit || 0, activeCompany?.currency)}
                  </span>
                </div>

                {/* Operating Expenses Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Operating Expenses</h4>
                  {incomeStatement?.operatingExpenses?.length > 0 ? (
                    <div className="space-y-2">
                      {incomeStatement.operatingExpenses.map((acc) => (
                        <div key={acc.id} className="flex justify-between px-4 py-1">
                          <span className="text-gray-700">{acc.name}</span>
                          <span className="font-mono text-red-600">({formatCurrency(acc.balance, activeCompany?.currency)})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 px-4 py-2 text-sm">No operating expenses recorded</p>
                  )}
                  <div className="flex justify-between px-4 py-2 bg-gray-50 rounded mt-2 font-semibold">
                    <span>Total Operating Expenses</span>
                    <span className="font-mono text-red-600">({formatCurrency(incomeStatement?.totalOperatingExpenses || 0, activeCompany?.currency)})</span>
                  </div>
                </div>

                {/* Other Income */}
                {incomeStatement?.otherIncome?.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Other Income</h4>
                    <div className="space-y-2">
                      {incomeStatement.otherIncome.map((acc) => (
                        <div key={acc.id} className="flex justify-between px-4 py-1">
                          <span className="text-gray-700">{acc.name}</span>
                          <span className="font-mono">{formatCurrency(acc.balance, activeCompany?.currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Expenses */}
                {incomeStatement?.otherExpenses?.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Other Expenses</h4>
                    <div className="space-y-2">
                      {incomeStatement.otherExpenses.map((acc) => (
                        <div key={acc.id} className="flex justify-between px-4 py-1">
                          <span className="text-gray-700">{acc.name}</span>
                          <span className="font-mono text-red-600">({formatCurrency(acc.balance, activeCompany?.currency)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Net Profit */}
                <div className="flex justify-between px-4 py-4 bg-primary-50 rounded-lg border-2 border-primary-200 font-bold text-xl">
                  <span>Net Profit / (Loss)</span>
                  <span className={`font-mono ${incomeStatement?.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {incomeStatement?.netProfit >= 0 ? '' : '('}
                    {formatCurrency(Math.abs(incomeStatement?.netProfit || 0), activeCompany?.currency)}
                    {incomeStatement?.netProfit >= 0 ? '' : ')'}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Balance Sheet */}
        {activeReport === 'balance-sheet' && (
          <>
            {bsLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded" />
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Assets Column */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900 border-b-2 border-gray-300 pb-2">ASSETS</h3>

                  {/* Current Assets */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Current Assets</h4>
                    {balanceSheet?.currentAssets?.length > 0 ? (
                      <div className="space-y-1">
                        {balanceSheet.currentAssets.map((acc) => (
                          <div key={acc.id} className="flex justify-between px-3 py-1 text-sm">
                            <span className="text-gray-600">{acc.name}</span>
                            <span className="font-mono">{formatCurrency(acc.balance, activeCompany?.currency)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm px-3">No current assets</p>
                    )}
                    <div className="flex justify-between px-3 py-2 bg-gray-100 rounded mt-2 font-medium text-sm">
                      <span>Total Current Assets</span>
                      <span className="font-mono">{formatCurrency(balanceSheet?.totalCurrentAssets || 0, activeCompany?.currency)}</span>
                    </div>
                  </div>

                  {/* Fixed Assets */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Fixed Assets</h4>
                    {balanceSheet?.fixedAssets?.length > 0 ? (
                      <div className="space-y-1">
                        {balanceSheet.fixedAssets.map((acc) => (
                          <div key={acc.id} className="flex justify-between px-3 py-1 text-sm">
                            <span className="text-gray-600">{acc.name}</span>
                            <span className="font-mono">{formatCurrency(acc.balance, activeCompany?.currency)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm px-3">No fixed assets</p>
                    )}
                    <div className="flex justify-between px-3 py-2 bg-gray-100 rounded mt-2 font-medium text-sm">
                      <span>Total Fixed Assets</span>
                      <span className="font-mono">{formatCurrency(balanceSheet?.totalFixedAssets || 0, activeCompany?.currency)}</span>
                    </div>
                  </div>

                  {/* Total Assets */}
                  <div className="flex justify-between px-4 py-3 bg-blue-100 rounded-lg font-bold border border-blue-300">
                    <span>TOTAL ASSETS</span>
                    <span className="font-mono">{formatCurrency(balanceSheet?.totalAssets || 0, activeCompany?.currency)}</span>
                  </div>
                </div>

                {/* Liabilities & Equity Column */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900 border-b-2 border-gray-300 pb-2">LIABILITIES & EQUITY</h3>

                  {/* Current Liabilities */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Current Liabilities</h4>
                    {balanceSheet?.currentLiabilities?.length > 0 ? (
                      <div className="space-y-1">
                        {balanceSheet.currentLiabilities.map((acc) => (
                          <div key={acc.id} className="flex justify-between px-3 py-1 text-sm">
                            <span className="text-gray-600">{acc.name}</span>
                            <span className="font-mono">{formatCurrency(acc.balance, activeCompany?.currency)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm px-3">No current liabilities</p>
                    )}
                    <div className="flex justify-between px-3 py-2 bg-gray-100 rounded mt-2 font-medium text-sm">
                      <span>Total Current Liabilities</span>
                      <span className="font-mono">{formatCurrency(balanceSheet?.totalCurrentLiabilities || 0, activeCompany?.currency)}</span>
                    </div>
                  </div>

                  {/* Long-term Liabilities */}
                  {balanceSheet?.longTermLiabilities?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Long-term Liabilities</h4>
                      <div className="space-y-1">
                        {balanceSheet.longTermLiabilities.map((acc) => (
                          <div key={acc.id} className="flex justify-between px-3 py-1 text-sm">
                            <span className="text-gray-600">{acc.name}</span>
                            <span className="font-mono">{formatCurrency(acc.balance, activeCompany?.currency)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between px-3 py-2 bg-gray-100 rounded mt-2 font-medium text-sm">
                        <span>Total Long-term Liabilities</span>
                        <span className="font-mono">{formatCurrency(balanceSheet?.totalLongTermLiabilities || 0, activeCompany?.currency)}</span>
                      </div>
                    </div>
                  )}

                  {/* Equity */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Equity</h4>
                    {balanceSheet?.equity?.length > 0 && (
                      <div className="space-y-1">
                        {balanceSheet.equity.map((acc) => (
                          <div key={acc.id} className="flex justify-between px-3 py-1 text-sm">
                            <span className="text-gray-600">{acc.name}</span>
                            <span className="font-mono">{formatCurrency(acc.balance, activeCompany?.currency)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between px-3 py-1 text-sm">
                      <span className="text-gray-600">Retained Earnings (Current Period)</span>
                      <span className={`font-mono ${balanceSheet?.retainedEarnings >= 0 ? '' : 'text-red-600'}`}>
                        {formatCurrency(balanceSheet?.retainedEarnings || 0, activeCompany?.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between px-3 py-2 bg-gray-100 rounded mt-2 font-medium text-sm">
                      <span>Total Equity</span>
                      <span className="font-mono">{formatCurrency(balanceSheet?.totalEquityWithRetainedEarnings || 0, activeCompany?.currency)}</span>
                    </div>
                  </div>

                  {/* Total Liabilities & Equity */}
                  <div className="flex justify-between px-4 py-3 bg-blue-100 rounded-lg font-bold border border-blue-300">
                    <span>TOTAL LIABILITIES & EQUITY</span>
                    <span className="font-mono">{formatCurrency(balanceSheet?.totalLiabilitiesAndEquity || 0, activeCompany?.currency)}</span>
                  </div>
                </div>

                {/* Balance Check */}
                <div className="md:col-span-2">
                  {balanceSheet?.balanced ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                      <p className="text-green-700 font-medium">Balance Sheet is balanced. Assets equal Liabilities + Equity.</p>
                    </div>
                  ) : (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                      <p className="text-red-700 font-medium">
                        Warning: Balance Sheet does not balance. Difference:{' '}
                        {formatCurrency(Math.abs((balanceSheet?.totalAssets || 0) - (balanceSheet?.totalLiabilitiesAndEquity || 0)), activeCompany?.currency)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* AR Aging */}
        {activeReport === 'ar-aging' && (
          <>
            {arAgingLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <p className="text-sm text-gray-500 mb-4">As of {formatDate(arAging?.asOfDate)}. Outstanding invoices (sent/overdue).</p>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Current</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">31-60 days</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">61-90 days</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Over 90</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {arAging?.rows?.map((r) => (
                      <tr key={r.clientId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.clientName}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(r.current, activeCompany?.currency)}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(r.days_31_60, activeCompany?.currency)}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(r.days_61_90, activeCompany?.currency)}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(r.over_90, activeCompany?.currency)}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono font-semibold">{formatCurrency(r.total, activeCompany?.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr className="font-bold">
                      <td className="px-4 py-3 text-right">TOTAL</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(arAging?.totals?.current ?? 0, activeCompany?.currency)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(arAging?.totals?.days_31_60 ?? 0, activeCompany?.currency)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(arAging?.totals?.days_61_90 ?? 0, activeCompany?.currency)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(arAging?.totals?.over_90 ?? 0, activeCompany?.currency)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(arAging?.totals?.total ?? 0, activeCompany?.currency)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}

        {/* AP Aging */}
        {activeReport === 'ap-aging' && (
          <>
            {apAgingLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <p className="text-sm text-gray-500 mb-4">As of {formatDate(apAging?.asOfDate)}. Outstanding supplier invoices (unpaid/overdue).</p>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Supplier</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Current</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">31-60 days</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">61-90 days</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Over 90</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {apAging?.rows?.map((r) => (
                      <tr key={r.supplierId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.supplierName}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(r.current, activeCompany?.currency)}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(r.days_31_60, activeCompany?.currency)}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(r.days_61_90, activeCompany?.currency)}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(r.over_90, activeCompany?.currency)}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono font-semibold">{formatCurrency(r.total, activeCompany?.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr className="font-bold">
                      <td className="px-4 py-3 text-right">TOTAL</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(apAging?.totals?.current ?? 0, activeCompany?.currency)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(apAging?.totals?.days_31_60 ?? 0, activeCompany?.currency)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(apAging?.totals?.days_61_90 ?? 0, activeCompany?.currency)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(apAging?.totals?.over_90 ?? 0, activeCompany?.currency)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(apAging?.totals?.total ?? 0, activeCompany?.currency)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}

        {/* VAT 201 (South Africa) */}
        {activeReport === 'vat201' && (
          <>
            {vat201Loading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-gray-500">SARS VAT 201 style (South Africa). Use period for the VAT period.</p>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Box 1 – Output tax</span>
                    <span className="font-mono font-semibold">{formatCurrency(vat201Report?.box1OutputTax ?? 0, activeCompany?.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Box 4 – Input tax</span>
                    <span className="font-mono font-semibold">{formatCurrency(vat201Report?.box4InputTax ?? 0, activeCompany?.currency)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-3">
                    <span className="font-semibold text-gray-900">Box 7 – Net VAT</span>
                    <span className={`font-mono font-bold ${(vat201Report?.box7NetVAT ?? 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(vat201Report?.box7NetVAT ?? 0, activeCompany?.currency)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Cash Flow Statement */}
        {activeReport === 'cash-flow' && (
          <>
            {cashFlowLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Operating</h4>
                  <div className="pl-4 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Net Income</span>
                      <span className="font-mono">{formatCurrency(cashFlow?.netIncome ?? 0, activeCompany?.currency)}</span>
                    </div>
                    {cashFlow?.operating?.items?.filter((a) => Math.abs(a.balance) > 0.001).map((a) => (
                      <div key={a.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{a.name}</span>
                        <span className="font-mono">{formatCurrency(a.balance, activeCompany?.currency)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                      <span>Operating total</span>
                      <span className="font-mono">{formatCurrency(cashFlow?.operating?.total ?? 0, activeCompany?.currency)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Investing</h4>
                  <div className="pl-4 space-y-1">
                    {cashFlow?.investing?.items?.filter((a) => Math.abs(a.balance) > 0.001).length > 0
                      ? cashFlow.investing.items.map((a) => (
                          <div key={a.id} className="flex justify-between text-sm">
                            <span className="text-gray-600">{a.name}</span>
                            <span className="font-mono">{formatCurrency(a.balance, activeCompany?.currency)}</span>
                          </div>
                        ))
                      : <p className="text-sm text-gray-500">No investing activity</p>}
                    <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                      <span>Investing total</span>
                      <span className="font-mono">{formatCurrency(cashFlow?.investing?.total ?? 0, activeCompany?.currency)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Financing</h4>
                  <div className="pl-4 space-y-1">
                    {cashFlow?.financing?.items?.filter((a) => Math.abs(a.balance) > 0.001).length > 0
                      ? cashFlow.financing.items.map((a) => (
                          <div key={a.id} className="flex justify-between text-sm">
                            <span className="text-gray-600">{a.name}</span>
                            <span className="font-mono">{formatCurrency(a.balance, activeCompany?.currency)}</span>
                          </div>
                        ))
                      : <p className="text-sm text-gray-500">No financing activity</p>}
                    <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                      <span>Financing total</span>
                      <span className="font-mono">{formatCurrency(cashFlow?.financing?.total ?? 0, activeCompany?.currency)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between px-4 py-3 bg-primary-50 rounded-lg font-bold text-lg">
                  <span>Net change in cash</span>
                  <span className="font-mono">{formatCurrency(cashFlow?.netChangeInCash ?? 0, activeCompany?.currency)}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* P&L by Period */}
        {activeReport === 'pl-by-period' && (
          <>
            <div className="mb-4 flex flex-wrap gap-4 items-end">
              <div className="text-sm text-gray-600">Period 1: {formatDate(dateRange.start)} – {formatDate(dateRange.end)}</div>
              <div className="flex gap-2 items-center">
                <Input
                  label="Period 2 start"
                  type="date"
                  value={plCompareRange.start2}
                  onChange={(e) => setPlCompareRange((r) => ({ ...r, start2: e.target.value }))}
                  className="w-40"
                />
                <Input
                  label="Period 2 end"
                  type="date"
                  value={plCompareRange.end2}
                  onChange={(e) => setPlCompareRange((r) => ({ ...r, end2: e.target.value }))}
                  className="w-40"
                />
              </div>
            </div>
            {plByPeriodLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Metric</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Period 1</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Period 2</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">Revenue</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(plByPeriod?.period1?.revenue ?? 0, activeCompany?.currency)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(plByPeriod?.period2?.revenue ?? 0, activeCompany?.currency)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">Expenses</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(plByPeriod?.period1?.expenses ?? 0, activeCompany?.currency)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(plByPeriod?.period2?.expenses ?? 0, activeCompany?.currency)}</td>
                    </tr>
                    <tr className="font-semibold">
                      <td className="px-4 py-3 text-sm text-gray-900">Net Profit</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(plByPeriod?.period1?.netProfit ?? 0, activeCompany?.currency)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(plByPeriod?.period2?.netProfit ?? 0, activeCompany?.currency)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Customer Statement */}
        {activeReport === 'customer-statement' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select
                value={statementClientId}
                onChange={(e) => setStatementClientId(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              >
                <option value="">Select a customer</option>
                {(clients ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {customerStmtLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded" />
                ))}
              </div>
            ) : !statementClientId ? (
              <p className="text-gray-500">Select a customer to view their statement.</p>
            ) : (
              <div className="space-y-4">
                {customerStatement?.client && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-semibold text-gray-900">{customerStatement.client.name}</p>
                    {customerStatement.client.email && <p className="text-sm text-gray-600">{customerStatement.client.email}</p>}
                  </div>
                )}
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">Opening Balance</span>
                  <span className="font-mono">{formatCurrency(customerStatement?.openingBalance ?? 0, activeCompany?.currency)}</span>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Reference</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Debit</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Credit</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customerStatement?.transactions?.map((t, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm">{formatDate(t.date)}</td>
                        <td className="px-4 py-2 text-sm capitalize">{t.type}</td>
                        <td className="px-4 py-2 text-sm">{t.reference}</td>
                        <td className="px-4 py-2 text-sm text-right font-mono">{t.debit > 0 ? formatCurrency(t.debit, activeCompany?.currency) : '-'}</td>
                        <td className="px-4 py-2 text-sm text-right font-mono">{t.credit > 0 ? formatCurrency(t.credit, activeCompany?.currency) : '-'}</td>
                        <td className="px-4 py-2 text-sm text-right font-mono">{t.balance != null ? formatCurrency(t.balance, activeCompany?.currency) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between py-3 border-t-2 font-bold">
                  <span>Closing Balance</span>
                  <span className="font-mono">{formatCurrency(customerStatement?.closingBalance ?? 0, activeCompany?.currency)}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Supplier Statement */}
        {activeReport === 'supplier-statement' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <select
                value={statementSupplierId}
                onChange={(e) => setStatementSupplierId(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              >
                <option value="">Select a supplier</option>
                {(suppliers ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            {supplierStmtLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded" />
                ))}
              </div>
            ) : !statementSupplierId ? (
              <p className="text-gray-500">Select a supplier to view their statement.</p>
            ) : (
              <div className="space-y-4">
                {supplierStatement?.supplier && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-semibold text-gray-900">{supplierStatement.supplier.name}</p>
                    {supplierStatement.supplier.email && <p className="text-sm text-gray-600">{supplierStatement.supplier.email}</p>}
                  </div>
                )}
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">Opening Balance</span>
                  <span className="font-mono">{formatCurrency(supplierStatement?.openingBalance ?? 0, activeCompany?.currency)}</span>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Reference</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Debit</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Credit</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {supplierStatement?.transactions?.map((t, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm">{formatDate(t.date)}</td>
                        <td className="px-4 py-2 text-sm capitalize">{t.type}</td>
                        <td className="px-4 py-2 text-sm">{t.reference}</td>
                        <td className="px-4 py-2 text-sm text-right font-mono">{t.debit > 0 ? formatCurrency(t.debit, activeCompany?.currency) : '-'}</td>
                        <td className="px-4 py-2 text-sm text-right font-mono">{t.credit > 0 ? formatCurrency(t.credit, activeCompany?.currency) : '-'}</td>
                        <td className="px-4 py-2 text-sm text-right font-mono">{t.balance != null ? formatCurrency(t.balance, activeCompany?.currency) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between py-3 border-t-2 font-bold">
                  <span>Closing Balance</span>
                  <span className="font-mono">{formatCurrency(supplierStatement?.closingBalance ?? 0, activeCompany?.currency)}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Unreconciled Items Report */}
        {activeReport === 'unreconciled-items' && (
          <>
            {unreconciledLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-gray-500">As of {formatDate(unreconciledItems?.asOfDate)}. Items that need reconciliation.</p>

                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-gray-600">Unreconciled Bank Transactions</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(unreconciledItems?.totals?.bankTransactions ?? 0, activeCompany?.currency)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {unreconciledItems?.bankTransactions?.length ?? 0} transaction(s)
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-600">Unpaid Invoices</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(unreconciledItems?.totals?.unpaidInvoices ?? 0, activeCompany?.currency)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {unreconciledItems?.unpaidInvoices?.length ?? 0} invoice(s)
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <p className="text-sm text-gray-600">Unpaid Purchases</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(unreconciledItems?.totals?.unpaidPurchases ?? 0, activeCompany?.currency)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {unreconciledItems?.unpaidPurchases?.length ?? 0} purchase(s)
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <p className="text-sm text-gray-600">Total Unreconciled</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(unreconciledItems?.totals?.total ?? 0, activeCompany?.currency)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">All items</p>
                  </div>
                </div>

                {/* Bank Transactions */}
                {unreconciledItems?.bankTransactions?.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Unreconciled Bank Transactions</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reference</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Age</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {unreconciledItems.bankTransactions.map((t) => (
                            <tr key={t.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(t.date)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{t.description}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{t.reference || '-'}</td>
                              <td className="px-4 py-3 text-sm text-right font-mono">
                                {formatCurrency(t.outstanding, activeCompany?.currency)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-500">{t.age} days</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Unpaid Invoices */}
                {unreconciledItems?.unpaidInvoices?.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Unpaid Invoices</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Invoice #</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Client</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Due Date</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Outstanding</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Age</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {unreconciledItems.unpaidInvoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.reference}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{inv.client || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(inv.date)}</td>
                              <td className="px-4 py-3 text-sm text-right font-mono">
                                {formatCurrency(inv.outstanding, activeCompany?.currency)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-500">{inv.age} days</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Unpaid Purchases */}
                {unreconciledItems?.unpaidPurchases?.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Unpaid Supplier Invoices</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Invoice #</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Supplier</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Due Date</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Outstanding</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Age</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {unreconciledItems.unpaidPurchases.map((pur) => (
                            <tr key={pur.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{pur.reference}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{pur.supplier || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(pur.date)}</td>
                              <td className="px-4 py-3 text-sm text-right font-mono">
                                {formatCurrency(pur.outstanding, activeCompany?.currency)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-500">{pur.age} days</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {(!unreconciledItems?.bankTransactions?.length && !unreconciledItems?.unpaidInvoices?.length && !unreconciledItems?.unpaidPurchases?.length) && (
                  <div className="text-center py-12 text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>All items are reconciled!</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Integrity Checks */}
        {activeReport === 'integrity-checks' && (
          <>
            {integrityLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-gray-500">
                  As of {formatDate(integrityChecks?.asOfDate)}. These checks help confirm subledgers reconcile to control accounts.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">Accounts Receivable (1100)</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">GL balance</span>
                        <span className="font-mono">{formatCurrency(integrityChecks?.ar?.gl ?? 0, activeCompany?.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Subledger (open invoices)</span>
                        <span className="font-mono">{formatCurrency(integrityChecks?.ar?.subledger ?? 0, activeCompany?.currency)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                        <span>Difference</span>
                        <span className={`font-mono ${Math.abs(integrityChecks?.ar?.difference ?? 0) <= 0.01 ? 'text-green-700' : 'text-red-700'}`}>
                          {formatCurrency(integrityChecks?.ar?.difference ?? 0, activeCompany?.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">Accounts Payable (2000)</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">GL balance</span>
                        <span className="font-mono">{formatCurrency(integrityChecks?.ap?.gl ?? 0, activeCompany?.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Subledger (open purchases)</span>
                        <span className="font-mono">{formatCurrency(integrityChecks?.ap?.subledger ?? 0, activeCompany?.currency)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                        <span>Difference</span>
                        <span className={`font-mono ${Math.abs(integrityChecks?.ap?.difference ?? 0) <= 0.01 ? 'text-green-700' : 'text-red-700'}`}>
                          {formatCurrency(integrityChecks?.ap?.difference ?? 0, activeCompany?.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">VAT (period movement)</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Output VAT</span>
                        <span className="font-mono">{formatCurrency(integrityChecks?.vat?.period?.outputVAT ?? 0, activeCompany?.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Input VAT</span>
                        <span className="font-mono">{formatCurrency(integrityChecks?.vat?.period?.inputVAT ?? 0, activeCompany?.currency)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                        <span>Net VAT</span>
                        <span className="font-mono">{formatCurrency(integrityChecks?.vat?.period?.netVAT ?? 0, activeCompany?.currency)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Based on {integrityChecks?.vat?.period?.lineCount ?? 0} VAT journal line(s) in the period.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">VAT control account balances (as of date)</h4>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between bg-gray-50 rounded p-3">
                      <span className="text-gray-600">VAT Payable (2100)</span>
                      <span className="font-mono">{formatCurrency(integrityChecks?.vat?.balances?.vatPayableGL ?? 0, activeCompany?.currency)}</span>
                    </div>
                    <div className="flex justify-between bg-gray-50 rounded p-3">
                      <span className="text-gray-600">VAT Input (1150)</span>
                      <span className="font-mono">{formatCurrency(integrityChecks?.vat?.balances?.vatInputGL ?? 0, activeCompany?.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Reports
