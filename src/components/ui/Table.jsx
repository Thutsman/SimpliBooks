const Table = ({ children, className = '' }) => {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${className}`}>
        {children}
      </table>
    </div>
  )
}

const TableHeader = ({ children, className = '' }) => {
  return (
    <thead className={`bg-gray-50 ${className}`}>
      {children}
    </thead>
  )
}

const TableBody = ({ children, className = '' }) => {
  return (
    <tbody className={`divide-y divide-gray-200 ${className}`}>
      {children}
    </tbody>
  )
}

const TableRow = ({ children, className = '', onClick, clickable = false }) => {
  return (
    <tr
      className={`
        ${clickable ? 'cursor-pointer hover:bg-gray-50' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

const TableHead = ({ children, className = '', align = 'left' }) => {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  return (
    <th
      className={`
        px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider
        ${alignClasses[align]}
        ${className}
      `}
    >
      {children}
    </th>
  )
}

const TableCell = ({ children, className = '', align = 'left' }) => {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  return (
    <td
      className={`
        px-4 py-3 text-sm text-gray-900
        ${alignClasses[align]}
        ${className}
      `}
    >
      {children}
    </td>
  )
}

const TableEmpty = ({ message = 'No data available', colSpan = 1 }) => {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-gray-500">
        {message}
      </td>
    </tr>
  )
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty }
export default Table
