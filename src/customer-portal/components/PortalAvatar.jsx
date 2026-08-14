import { useState } from 'react'

const initials = (name) =>
  name ? name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') : 'LM'

export default function PortalAvatar({ url, name, size = 36, className = '', imageTestId, fallbackTestId }) {
  const [failed, setFailed] = useState(false)
  const showImage = url && !failed

  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full border border-[#E5E2DA] ${className}`}
      style={{ width: size, height: size, background: '#1E3A2B' }}
    >
      {showImage ? (
        <img
          src={url}
          alt={name || 'Customer'}
          data-testid={imageTestId}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          data-testid={fallbackTestId}
          className="text-[#FAF8F5] font-semibold"
          style={{ fontSize: size * 0.34 }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  )
}
