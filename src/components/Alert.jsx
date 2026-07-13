export default function Alert({ type = 'info', message, onClose }) {
  if (!message) return null

  const styles = {
    error: 'bg-red-50 text-red-800 border-red-200',
    success: 'bg-green-50 text-green-800 border-green-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  }

  return (
    <div className={`border rounded-md px-4 py-3 mb-4 flex justify-between items-start ${styles[type]}`}>
      <span className="text-sm">{message}</span>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-4 text-sm font-bold opacity-60 hover:opacity-100"
          aria-label="Close alert"
        >
          x
        </button>
      )}
    </div>
  )
}