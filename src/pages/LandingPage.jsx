import { useEffect, useState } from 'react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ukrztdeqzbbroowcphwk.supabase.co'
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnp0ZGVxemJicm9vd2NwaHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTkzOTgsImV4cCI6MjA5OTE5NTM5OH0.uNmeVbQh9dlWfm_hJkZWn-1gItJo-Q4d4L-xoqOYCHc'

const DEFAULTS = {
  tagline: 'Fresh, home-style meals — cooked every morning in Kakinada, delivered to your door.',
  subtitle: 'One subscription. Zero cooking stress. Veg, non-veg and student meal plans with pause-any-day flexibility.',
  city: 'Kakinada, Andhra Pradesh',
  portals: [
    { key: 'customer', title: 'Customer Portal', description: 'Track your credits, upcoming meals, skip a day, manage billing.', url: 'https://customer.lunchmate.live', primary: true },
    { key: 'delivery', title: 'Delivery Partner', description: "Today's route, drop-off list and delivery status updates.", url: 'https://delivery.lunchmate.live' },
    { key: 'admin', title: 'Admin', description: 'Plans, subscriptions, kitchen notes and payments.', url: 'https://admin.lunchmate.live' },
  ],
}

const FLOAT_ITEMS = [
  ['🍃', '6%', '12%', 30, 'lml-fa', 12, 0], ['🥕', '88%', '18%', 26, 'lml-fb', 15, 2.5],
  ['🍅', '12%', '70%', 24, 'lml-fc', 14, 4], ['🥬', '80%', '74%', 32, 'lml-fa', 17, 1.2],
  ['🌿', '46%', '6%', 22, 'lml-fb', 11, 6], ['🍃', '60%', '88%', 26, 'lml-fc', 16, 8.5],
  ['🥄', '28%', '40%', 22, 'lml-fb', 13, 3.4], ['🍱', '93%', '46%', 28, 'lml-fa', 18, 5.6],
  ['🌶️', '3%', '36%', 20, 'lml-fc', 10, 7.2], ['🍃', '54%', '60%', 18, 'lml-fb', 9, 1.8],
  ['🥗', '72%', '28%', 24, 'lml-fc', 15.5, 9.4], ['🍴', '20%', '86%', 20, 'lml-fa', 12.5, 4.8],
]

const CSS = `
.lml { --forest:#1E3A2B; --forest-deep:#172E22; --emerald:#2E5B44; --cream:#FAF8F5; --border:#E5E2DA; --ink:#1A2420; --muted:#526058; --faint:#808D85;
  background: var(--cream); color: var(--ink); font-family: "Outfit", sans-serif; min-height: 100dvh; position: relative; overflow-x: hidden; -webkit-font-smoothing: antialiased; }
.lml h1, .lml .lml-brand-name { font-family: "Plus Jakarta Sans", sans-serif; }
@keyframes lml-fa { 0%,100% { transform: translate3d(0,0,0) rotate(0deg); opacity:.16 } 50% { transform: translate3d(14px,-26px,0) rotate(7deg); opacity:.3 } }
@keyframes lml-fb { 0%,100% { transform: translate3d(0,0,0) rotate(-5deg); opacity:.12 } 50% { transform: translate3d(-18px,-20px,0) rotate(6deg); opacity:.26 } }
@keyframes lml-fc { 0%,100% { transform: translate3d(0,0,0) rotate(0deg); opacity:.1 } 33% { transform: translate3d(10px,16px,0) rotate(-6deg); opacity:.2 } 66% { transform: translate3d(-8px,-12px,0) rotate(4deg); opacity:.16 } }
.lml-float-item { position:absolute; will-change: transform, opacity; animation-timing-function: ease-in-out; animation-iteration-count: infinite; filter: blur(.4px) saturate(.75); user-select:none; pointer-events:none }
@keyframes lml-in { from { opacity:0; transform: translate3d(0,18px,0) } to { opacity:1; transform: translate3d(0,0,0) } }
.lml-reveal { opacity:0; animation: lml-in .8s cubic-bezier(0.16,1,0.3,1) forwards }
.lml-d1{animation-delay:.05s}.lml-d2{animation-delay:.15s}.lml-d3{animation-delay:.3s}.lml-d4{animation-delay:.5s}.lml-d5{animation-delay:.68s}.lml-d6{animation-delay:.85s}
.lml-header { display:flex; align-items:center; justify-content:space-between; padding: 20px clamp(20px,6vw,64px); position:relative; z-index:1 }
.lml-brand { display:flex; align-items:center; gap:12px }
.lml-brand-mark { width:42px; height:42px; border-radius:13px; background:var(--forest); display:grid; place-items:center; color:#FAF8F5; box-shadow:0 4px 14px rgba(30,58,43,.22) }
.lml-brand-name { font-weight:700; font-size:19px; letter-spacing:-.02em; display:block }
.lml-brand-city { font-size:11.5px; color:var(--faint); letter-spacing:.04em }
.lml-main { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:12px 20px 40px; position:relative; z-index:1 }
.lml-page { min-height:100dvh; display:flex; flex-direction:column }
.lml-stage { position:relative; width:250px; height:220px; margin-bottom:34px }
.lml-shadow { position:absolute; left:50%; bottom:8px; width:190px; height:22px; transform:translateX(-50%); background:radial-gradient(ellipse at center, rgba(30,58,43,.18), transparent 70%) }
.lml-bento { position:absolute; left:50%; bottom:22px; transform:translateX(-50%); width:224px; height:128px; background:linear-gradient(180deg,#fff,#F1EEE7); border:1px solid var(--border); border-radius:26px; box-shadow:0 18px 40px -12px rgba(30,58,43,.22), inset 0 1px 0 rgba(255,255,255,.9); display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; gap:8px; padding:12px }
.lml-comp { border-radius:15px; opacity:0; transform:scale(.55); animation: lml-pop .7s cubic-bezier(0.16,1,0.3,1) forwards }
@keyframes lml-pop { to { opacity:1; transform:scale(1) } }
.lml-rice{background:linear-gradient(145deg,#FBF8F0,#F0E9D8);animation-delay:1.15s}.lml-dal{background:linear-gradient(145deg,#F6DCAA,#EFC98A);animation-delay:1.3s}.lml-greens{background:linear-gradient(145deg,#D5E2D2,#BDD2BB);animation-delay:1.45s}.lml-tomato{background:linear-gradient(145deg,#EFCDBE,#E4B7A3);animation-delay:1.6s}
.lml-lid { position:absolute; left:50%; bottom:138px; transform:translateX(-50%); width:238px; height:34px; background:linear-gradient(180deg,var(--forest),var(--forest-deep)); border-radius:17px; box-shadow:0 10px 24px -8px rgba(23,46,34,.45), inset 0 1px 0 rgba(255,255,255,.18); animation: lml-lid 1.1s cubic-bezier(0.16,1,0.3,1) .45s forwards; transform-origin:15% 100%; z-index:2 }
.lml-lid::after { content:""; position:absolute; left:50%; top:7px; transform:translateX(-50%); width:58px; height:9px; border-radius:6px; background:rgba(255,255,255,.22) }
@keyframes lml-lid { 0% { transform:translateX(-50%) translateY(0) rotate(0) } 55% { transform:translateX(-50%) translateY(-58px) rotate(-14deg) } 100% { transform:translateX(-50%) translateY(-96px) rotate(-9deg) } }
.lml-steam { position:absolute; left:50%; bottom:150px; transform:translateX(-50%); display:flex; gap:16px; z-index:3 }
.lml-steam span { width:7px; height:30px; border-radius:50%; background:linear-gradient(180deg,rgba(128,141,133,0),rgba(128,141,133,.45),rgba(128,141,133,0)); opacity:0; animation: lml-steam 2.8s ease-in-out infinite }
.lml-steam span:nth-child(2){animation-delay:.9s;height:38px}.lml-steam span:nth-child(3){animation-delay:1.7s}
@keyframes lml-steam { 0% { opacity:0; transform:translateY(6px) scaleY(.7) } 35% { opacity:.8 } 100% { opacity:0; transform:translateY(-34px) scaleY(1.15) } }
.lml-h1 { font-size:clamp(34px,6vw,58px); font-weight:700; letter-spacing:-.03em; line-height:1.05; max-width:15ch; margin:0 }
.lml-accent { color:var(--emerald) }
.lml-tagline { margin:16px 0 0; font-size:clamp(15px,2.2vw,18px); color:var(--muted); max-width:52ch; line-height:1.55 }
.lml-subtitle { margin:8px 0 0; font-size:13.5px; color:var(--faint); max-width:56ch; line-height:1.5 }
.lml-portals { margin-top:42px; display:flex; flex-wrap:wrap; gap:14px; justify-content:center }
.lml-btn { position:relative; overflow:hidden; display:flex; flex-direction:column; align-items:flex-start; gap:4px; min-width:218px; padding:18px 24px 17px; border-radius:999px; text-decoration:none; cursor:pointer; border:1px solid var(--border); background:rgba(255,255,255,.75); backdrop-filter:blur(14px); box-shadow:0 3px 12px rgba(30,58,43,.07), inset 0 1px 0 rgba(255,255,255,.9); transition:transform .28s cubic-bezier(0.16,1,0.3,1), box-shadow .28s cubic-bezier(0.16,1,0.3,1), background-color .28s ease, border-color .28s ease }
.lml-btn::before { content:""; position:absolute; inset:0; border-radius:inherit; background:linear-gradient(115deg, transparent 30%, rgba(255,255,255,.55) 46%, transparent 60%); transform:translateX(-110%); transition:transform .65s cubic-bezier(0.16,1,0.3,1); pointer-events:none }
.lml-btn:hover { transform:translateY(-3px); box-shadow:0 12px 28px -6px rgba(30,58,43,.18), inset 0 1px 0 rgba(255,255,255,.9); border-color:#D8D2C6; background:rgba(255,255,255,.92) }
.lml-btn:hover::before { transform:translateX(110%) }
.lml-btn:active { transform:translateY(-1px) scale(.97); box-shadow:0 4px 12px rgba(30,58,43,.1); transition-duration:.1s }
.lml-btn-primary { background:var(--forest); border-color:var(--forest); box-shadow:0 6px 20px -4px rgba(30,58,43,.32), inset 0 1px 0 rgba(255,255,255,.16) }
.lml-btn-primary:hover { background:var(--forest-deep); box-shadow:0 14px 32px -8px rgba(30,58,43,.4), inset 0 1px 0 rgba(255,255,255,.16) }
.lml-btn-title { font-family:"Plus Jakarta Sans",sans-serif; font-weight:600; font-size:15.5px; letter-spacing:-.01em; color:var(--ink); display:flex; align-items:center; gap:8px }
.lml-btn-desc { font-size:12px; color:var(--faint); line-height:1.4; text-align:left; max-width:26ch }
.lml-btn-primary .lml-btn-title { color:#FAF8F5 } .lml-btn-primary .lml-btn-desc { color:rgba(250,248,245,.66) }
.lml-btn:hover .lml-arrow { transform:translateX(4px) } .lml-arrow { transition:transform .28s cubic-bezier(0.16,1,0.3,1) }
.lml-footer { padding:22px; text-align:center; font-size:12px; color:var(--faint); letter-spacing:.03em; position:relative; z-index:1 }
@media (max-width:560px){ .lml-btn { width:100%; min-width:0 } .lml-stage { transform:scale(.88); margin-bottom:18px } }
@media (prefers-reduced-motion: reduce){ .lml-float-item,.lml-lid,.lml-steam span,.lml-reveal,.lml-comp { animation:none !important } .lml-reveal,.lml-comp { opacity:1 !important; transform:none !important } }
`

export default function LandingPage() {
  const [content, setContent] = useState(DEFAULTS)

  useEffect(() => {
    fetch(`${SUPABASE_URL}/rest/v1/business_settings?key=eq.landing&select=value`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((rows) => {
        if (!rows || !rows.length) return
        const v = rows[0].value || {}
        setContent((prev) => ({
          tagline: v.tagline || prev.tagline,
          subtitle: v.subtitle || prev.subtitle,
          city: v.city || prev.city,
          portals: Array.isArray(v.portals) && v.portals.length ? v.portals : prev.portals,
        }))
      })
      .catch(() => {})
  }, [])

  return (
    <div className="lml">
      <style>{CSS}</style>
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {FLOAT_ITEMS.map((it, i) => (
          <span key={i} className="lml-float-item" style={{ left: it[1], top: it[2], fontSize: it[3], animationName: it[4], animationDuration: `${it[5]}s`, animationDelay: `${it[6]}s` }}>
            {it[0]}
          </span>
        ))}
      </div>

      <div className="lml-page">
        <header className="lml-header lml-reveal lml-d1">
          <div className="lml-brand">
            <span className="lml-brand-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11h18" /><path d="M5 11V7a7 7 0 0 1 14 0v4" /><path d="M4 11v2a8 8 0 0 0 16 0v-2" /></svg>
            </span>
            <span>
              <span className="lml-brand-name">Lunchmate</span>
              <span className="lml-brand-city">{content.city}</span>
            </span>
          </div>
        </header>

        <main className="lml-main">
          <div className="lml-stage lml-reveal lml-d2" aria-hidden="true">
            <div className="lml-steam"><span></span><span></span><span></span></div>
            <div className="lml-lid"></div>
            <div className="lml-bento">
              <div className="lml-comp lml-rice"></div>
              <div className="lml-comp lml-dal"></div>
              <div className="lml-comp lml-greens"></div>
              <div className="lml-comp lml-tomato"></div>
            </div>
            <div className="lml-shadow"></div>
          </div>

          <h1 className="lml-h1 lml-reveal lml-d3">Fresh lunches, <span className="lml-accent">delivered daily</span> in Kakinada.</h1>
          <p className="lml-tagline lml-reveal lml-d4">{content.tagline}</p>
          <p className="lml-subtitle lml-reveal lml-d4">{content.subtitle}</p>

          <nav className="lml-portals lml-reveal lml-d5" aria-label="Portals">
            {content.portals.map((p, i) => (
              <a key={p.key || i} href={p.url} className={`lml-btn${p.primary || i === 0 ? ' lml-btn-primary' : ''}`}>
                <span className="lml-btn-title">
                  {p.title}
                  <svg className="lml-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
                </span>
                <span className="lml-btn-desc">{p.description}</span>
              </a>
            ))}
          </nav>
        </main>

        <footer className="lml-footer lml-reveal lml-d6">© {new Date().getFullYear()} Lunchmate · {content.city}, India</footer>
      </div>
    </div>
  )
}
