import { useState } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import Input from '../ui/Input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '../ui/Table'

const DataTable = ({
  columns,
  data,
  searchable = true,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  emptyMessage = 'No data available',
  onRowClick,
}) => {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Filter data based on search
  const filteredData = searchable && search
    ? data.filter((row) =>
        columns.some((col) => {
          const value = col.accessor ? row[col.accessor] : col.cell?.(row)
          return String(value || '').toLowerCase().includes(search.toLowerCase())
        })
      )
    : data

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize)

  // Reset to first page when search changes
  const handleSearch = (value) => {
    setSearch(value)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      {searchable && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index} align={column.align}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableEmpty message={emptyMessage} colSpan={columns.length} />
            ) : (
              paginatedData.map((row, rowIndex) => (
                <TableRow
                  key={row.id || rowIndex}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  clickable={!!onRowClick}
                >
                  {columns.map((column, colIndex) => (
                    <TableCell key={colIndex} align={column.align}>
                      {column.cell
                        ? column.cell(row)
                        : column.accessor
                        ? row[column.accessor]
                        : null}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <p className="text-gray-500 text-center sm:text-left">
            Showing {startIndex + 1}-{Math.min(startIndex + pageSize, filteredData.length)} of{' '}
            {filteredData.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-gray-100 rounded-lg font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
