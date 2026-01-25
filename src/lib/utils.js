import { format } from 'date-fns'
import * as XLSX from 'xlsx'

// Simple hash function for deduplication
export const createHash = (str) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}

// Export to Excel
export const exportToExcel = (data, filename, sheetName = 'Sheet1') => {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// Export to PDF using html2pdf
export const exportToPDF = async (elementId, filename) => {
  const element = document.getElementById(elementId)
  if (!element) {
    console.error('Element not found for PDF export')
    return
  }

  // Dynamically import html2pdf
  const html2pdf = (await import('html2pdf.js')).default

  const opt = {
    margin: 10,
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }

  html2pdf().set(opt).from(element).save()
}

// Format number as currency string
export const formatNumber = (num, decimals = 2) => {
  return Number(num || 0).toLocaleString('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// Parse CSV file
export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const Papa = (await import('papaparse')).default
        const result = Papa.parse(e.target.result, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
        })
        resolve(result.data)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

// Get date range for report periods
export const getDateRange = (period) => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  switch (period) {
    case 'this_month':
      return {
        start: format(new Date(year, month, 1), 'yyyy-MM-dd'),
        end: format(new Date(year, month + 1, 0), 'yyyy-MM-dd'),
      }
    case 'last_month':
      return {
        start: format(new Date(year, month - 1, 1), 'yyyy-MM-dd'),
        end: format(new Date(year, month, 0), 'yyyy-MM-dd'),
      }
    case 'this_quarter':
      const qStart = Math.floor(month / 3) * 3
      return {
        start: format(new Date(year, qStart, 1), 'yyyy-MM-dd'),
        end: format(new Date(year, qStart + 3, 0), 'yyyy-MM-dd'),
      }
    case 'last_quarter':
      const lqStart = Math.floor(month / 3) * 3 - 3
      return {
        start: format(new Date(year, lqStart, 1), 'yyyy-MM-dd'),
        end: format(new Date(year, lqStart + 3, 0), 'yyyy-MM-dd'),
      }
    case 'this_year':
      return {
        start: format(new Date(year, 0, 1), 'yyyy-MM-dd'),
        end: format(new Date(year, 11, 31), 'yyyy-MM-dd'),
      }
    case 'last_year':
      return {
        start: format(new Date(year - 1, 0, 1), 'yyyy-MM-dd'),
        end: format(new Date(year - 1, 11, 31), 'yyyy-MM-dd'),
      }
    default:
      return { start: null, end: null }
  }
}

// Classify transaction type
export const classifyTransactionType = (description, amount) => {
  const desc = description.toLowerCase()

  // Common patterns for credits (money in)
  const creditPatterns = [
    'deposit', 'payment received', 'refund', 'credit', 'transfer in',
    'interest', 'dividend', 'salary', 'wages'
  ]

  // Common patterns for debits (money out)
  const debitPatterns = [
    'payment', 'purchase', 'withdrawal', 'debit', 'transfer out',
    'fee', 'charge', 'subscription', 'insurance', 'rent'
  ]

  if (amount > 0 || creditPatterns.some(p => desc.includes(p))) {
    return 'credit'
  }

  return 'debit'
}
