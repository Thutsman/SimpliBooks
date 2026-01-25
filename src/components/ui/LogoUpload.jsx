import { useState, useRef } from 'react'
import { Upload, X, Image, Loader2 } from 'lucide-react'
import { uploadCompanyLogo, deleteCompanyLogo } from '../../lib/supabase'

const LogoUpload = ({ companyId, currentLogoUrl, onUploadComplete, onDeleteComplete }) => {
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file) => {
    setError(null)
    setIsUploading(true)

    try {
      const publicUrl = await uploadCompanyLogo(companyId, file)
      onUploadComplete(publicUrl)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async () => {
    setError(null)
    setIsDeleting(true)

    try {
      await deleteCompanyLogo(companyId)
      onDeleteComplete()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-3">
      {/* Current Logo Preview */}
      {currentLogoUrl ? (
        <div className="flex items-start gap-4">
          <div className="relative">
            <img
              src={currentLogoUrl}
              alt="Company logo"
              className="w-24 h-24 object-contain border border-gray-200 rounded-lg bg-white p-2"
            />
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50"
              title="Remove logo"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Current Logo</p>
            <p className="text-xs text-gray-500 mt-1">
              Click the X to remove, or drop a new image to replace
            </p>
          </div>
        </div>
      ) : null}

      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleChange}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            <p className="text-sm text-gray-600">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              {currentLogoUrl ? (
                <Image className="w-6 h-6 text-gray-400" />
              ) : (
                <Upload className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {currentLogoUrl ? 'Replace logo' : 'Upload company logo'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG or WebP up to 2MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <X className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  )
}

export default LogoUpload
