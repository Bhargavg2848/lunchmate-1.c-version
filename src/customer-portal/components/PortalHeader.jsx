import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useClerk } from '@clerk/clerk-react'
import { Soup, User, CreditCard, ReceiptText, SlidersHorizontal, LogOut, MapPin } from 'lucide-react'
import PortalAvatar from './PortalAvatar'

export default function PortalHeader({ user, subscription, business }) {
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  const name = user?.fullName || 'Customer'
  const email = user?.primaryEmailAddress?.emailAddress || ''
  const remaining = subscription ? Number(subscription.credits_remaining ?? 0) : null
  const total = subscription ? Number(subscription.plan_credits ?? 0) : null
  const location = business ? `${business.city}, ${business.state}` : 'Kakinada, Andhra Pradesh'

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const goSection = (path, hash) => {
    setOpen(false)
    navigate(path)
    if (hash) {
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200)
    }
  }

  const menuItem =
    'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left text-[#1A2420] rounded-lg hover:bg-[#F3F0EA] transition-colors duration-150 cursor-pointer bg-transparent border-none'

  return (
    <header
      data-testid="portal-header"
      className="sticky top-0 z-50 border-b border-[#E5E2DA]/80"
      style={{ background: 'rgba(250,248,245,0.8)', backdropFilter: 'blur(12px) saturate(1.5)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link to="/" data-testid="header-logo-link" className="flex items-center gap-2.5 min-w-0 no-underline">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1E3A2B] text-[#FAF8F5] shrink-0">
            <Soup size={18} strokeWidth={1.8} />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold tracking-tight text-[#1A2420] leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Lunchmate
            </span>
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-[#808D85] leading-tight">
              <MapPin size={10} /> {location}
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {remaining !== null && (
            <div
              data-testid="header-credits-badge"
              className="flex items-center gap-1.5 text-xs font-medium text-[#2E5B44] bg-[#F0F5F2] border border-[#DCE8E0] rounded-full px-3 py-1.5"
            >
              <span data-testid="header-credits-value">{remaining} / {total} meals left</span>
            </div>
          )}

          <div className="relative" ref={menuRef}>
            <button
              data-testid="header-profile-menu-button"
              onClick={() => setOpen((v) => !v)}
              className="rounded-full transition-all duration-200 active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center bg-transparent border-none cursor-pointer"
              style={{ boxShadow: open ? '0 0 0 3px rgba(46,91,68,0.2)' : 'none' }}
              aria-label="Account menu"
            >
              <PortalAvatar url={user?.imageUrl} name={name} size={36} imageTestId="header-avatar-image" fallbackTestId="header-avatar-fallback" />
            </button>

            {open && (
              <div
                data-testid="profile-dropdown-menu"
                className="lmp-dropdown absolute right-0 mt-2 w-72 rounded-xl border border-[#E5E2DA] bg-white shadow-xl p-1.5 z-50"
              >
                <div className="px-2.5 py-2.5 flex items-center gap-3">
                  <PortalAvatar url={user?.imageUrl} name={name} size={40} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1A2420] truncate m-0" data-testid="dropdown-user-name">{name}</p>
                    <p className="text-xs text-[#808D85] truncate m-0" data-testid="dropdown-user-email">{email}</p>
                  </div>
                </div>
                <div className="h-px bg-[#E5E2DA] my-1" />
                <button data-testid="menu-item-profile" className={menuItem} onClick={() => goSection('/profile')}>
                  <User size={15} className="text-[#526058]" /> Profile
                </button>
                <button data-testid="menu-item-subscription" className={menuItem} onClick={() => { setOpen(false); navigate('/subscription') }}>
                  <CreditCard size={15} className="text-[#526058]" /> Subscription
                </button>
                <button data-testid="menu-item-billing" className={menuItem} onClick={() => { setOpen(false); navigate('/billing') }}>
                  <ReceiptText size={15} className="text-[#526058]" /> Billing &amp; Invoices
                </button>
                <button data-testid="menu-item-preferences" className={menuItem} onClick={() => goSection('/profile', 'preferences')}>
                  <SlidersHorizontal size={15} className="text-[#526058]" /> Preferences
                </button>
                <div className="h-px bg-[#E5E2DA] my-1" />
                <button
                  data-testid="menu-item-logout"
                  className={menuItem}
                  style={{ color: '#92400e' }}
                  onClick={() => signOut()}
                >
                  <LogOut size={15} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
