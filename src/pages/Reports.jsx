import { useState } from 'react'
import { FileText, Calculator, Download, Printer } from 'lucide-react'
import { useTrialBalance, useVATReport } from '../hooks/useReports'
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
    }
  }

  const handleExportPDF = () => {
    exportToPDF('report-content', `${activeReport}-${dateRange.start}-${dateRange.end}`)
  }

  const reports = [
    { id: 'trial-balance', name: 'Trial Balance', icon: Calculator },
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
            {activeReport === 'trial-balance' ? 'Trial Balance' : 'VAT Report'}
          </h3>
          <p className="text-sm text-gray-500">
            For the period {formatDate(dateRange.start)} to {formatDate(dateRange.end)}
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
      </div>
    </div>
  )
}

export default Reports
