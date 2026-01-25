const Card = ({ children, className = '', hover = false, padding = true, ...props }) => {
  return (
    <div
      className={`
        bg-white rounded-xl border border-gray-200 shadow-sm
        ${hover ? 'hover:shadow-md hover:border-gray-300 transition-all duration-200' : ''}
        ${padding ? 'p-6' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

const CardHeader = ({ children, className = '' }) => {
  return (
    <div className={`pb-4 border-b border-gray-100 ${className}`}>
      {children}
    </div>
  )
}

const CardTitle = ({ children, className = '' }) => {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h3>
  )
}

const CardDescription = ({ children, className = '' }) => {
  return (
    <p className={`mt-1 text-sm text-gray-500 ${className}`}>
      {children}
    </p>
  )
}

const CardContent = ({ children, className = '' }) => {
  return (
    <div className={`pt-4 ${className}`}>
      {children}
    </div>
  )
}

const CardFooter = ({ children, className = '' }) => {
  return (
    <div className={`pt-4 mt-4 border-t border-gray-100 ${className}`}>
      {children}
    </div>
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
export default Card
