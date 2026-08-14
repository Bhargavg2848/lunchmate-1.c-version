const ITEMS = [
  { glyph: '🍃', x: '6%', y: '12%', size: 30, anim: 'lmp-float-a', dur: 12, delay: 0 },
  { glyph: '🥕', x: '88%', y: '18%', size: 26, anim: 'lmp-float-b', dur: 15, delay: 2.5 },
  { glyph: '🍅', x: '14%', y: '68%', size: 24, anim: 'lmp-float-c', dur: 14, delay: 4 },
  { glyph: '🥬', x: '78%', y: '72%', size: 32, anim: 'lmp-float-a', dur: 17, delay: 1.2 },
  { glyph: '🌿', x: '46%', y: '8%', size: 22, anim: 'lmp-float-b', dur: 11, delay: 6 },
  { glyph: '🍃', x: '62%', y: '86%', size: 26, anim: 'lmp-float-c', dur: 16, delay: 8.5 },
  { glyph: '🥄', x: '30%', y: '42%', size: 22, anim: 'lmp-float-b', dur: 13, delay: 3.4 },
  { glyph: '🍱', x: '92%', y: '48%', size: 28, anim: 'lmp-float-a', dur: 18, delay: 5.6 },
  { glyph: '🌶️', x: '4%', y: '38%', size: 20, anim: 'lmp-float-c', dur: 10, delay: 7.2 },
  { glyph: '🍃', x: '55%', y: '58%', size: 18, anim: 'lmp-float-b', dur: 9, delay: 1.8 },
  { glyph: '🥗', x: '72%', y: '30%', size: 24, anim: 'lmp-float-c', dur: 15.5, delay: 9.4 },
  { glyph: '🍃', x: '24%', y: '88%', size: 20, anim: 'lmp-float-a', dur: 12.5, delay: 4.8 },
]

export default function FloatingBackground() {
  return (
    <div
      aria-hidden="true"
      data-testid="floating-background"
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
    >
      {ITEMS.map((it, i) => (
        <span
          key={i}
          className="lmp-float-item"
          style={{
            left: it.x,
            top: it.y,
            fontSize: it.size,
            animationName: it.anim,
            animationDuration: `${it.dur}s`,
            animationDelay: `${it.delay}s`,
            filter: 'blur(0.4px) saturate(0.75)',
          }}
        >
          {it.glyph}
        </span>
      ))}
    </div>
  )
}
