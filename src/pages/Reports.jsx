import { useState } from 'react'
import { FileText, Calculator, Download, Printer, BookOpen, Scale, TrendingUp } from 'lucide-react'
import { useTrialBalance, useVATReport, useGeneralLedger, useIncomeStatement, useBalanceSheet } from '../hooks/useReports'
import { useCompany } from '../context/CompanyContext'
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

  const { activeCompany } = useCompany()

  const dateRange = period === 'custom' ? customRange : getDateRange(period)

  const { data: trialBalance, isLoading: tbLoading } = useTrialBalance(
    dateRange.start,
    dateRange.end
  )

  const { data: vatReport, isLoading: vatLoading } = useVATReport(
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
                      <span className="text-gray-900">Output VAT (15%)</span>
                      <span className="font-mono text-red-600">
                        {formatCurrency(vatReport?.outputVAT || 0, activeCompany?.currency)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      From {vatReport?.invoiceCount || 0} invoices
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
                      <span className="text-gray-900">Input VAT (15%)</span>
                      <span className="font-mono text-green-600">
                        {formatCurrency(vatReport?.inputVAT || 0, activeCompany?.currency)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      From {vatReport?.purchaseCount || 0} purchases
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
      </div>
    </div>
  )
}

export default Reports
