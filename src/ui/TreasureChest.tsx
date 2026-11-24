// Coffre au trésor de la carte : fermé (à atteindre) ou ouvert (déjà ouvert, pépites qui débordent).
// SVG autonome ; les identifiants de dégradés sont uniques par coffre pour que plusieurs coffres cohabitent.

interface Props { open: boolean; next?: boolean; uid: string }

export default function TreasureChest({ open, next, uid }: Props) {
  const g = (n: string) => `${n}-${uid}`;
  return (
    <svg className={`chest-svg ${open ? 'is-open' : 'is-closed'} ${next ? 'is-next' : ''}`} viewBox="0 0 120 112" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={g('wood')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9742a" /><stop offset="1" stop-color="#8a4a14" /></linearGradient>
        <linearGradient id={g('lid')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0903a" /><stop offset="1" stop-color="#b9651e" /></linearGradient>
        <linearGradient id={g('gold')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3a6" /><stop offset=".5" stop-color="#ffc933" /><stop offset="1" stop-color="#e08a06" /></linearGradient>
        <radialGradient id={g('glow')} cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6b0" stop-opacity=".95" /><stop offset="1" stop-color="#ffd24a" stop-opacity="0" /></radialGradient>
      </defs>

      {open && <circle className="chest-glow" cx="60" cy="50" r="58" fill={`url(#${g('glow')})`} />}
      <ellipse cx="60" cy="104" rx="46" ry="6" fill="#000" opacity=".22" />

      {/* corps */}
      <path d="M12 54 H108 V96 Q108 104 100 104 H20 Q12 104 12 96Z" fill={`url(#${g('wood')})`} stroke="#5a2e0a" strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M12 66 H108 M12 84 H108" stroke="#5a2e0a" strokeOpacity=".28" strokeWidth="2" />
      <rect x="12" y="60" width="96" height="9" fill={`url(#${g('gold')})`} stroke="#8a5200" strokeWidth="3" />
      <rect x="22" y="54" width="9" height="50" fill={`url(#${g('gold')})`} stroke="#8a5200" strokeWidth="3" />
      <rect x="89" y="54" width="9" height="50" fill={`url(#${g('gold')})`} stroke="#8a5200" strokeWidth="3" />

      {open ? (
        <>
          {/* intérieur rempli de pièces */}
          <path d="M16 54 Q60 40 104 54Z" fill="#7a3d0e" />
          <ellipse cx="60" cy="49" rx="42" ry="9" fill={`url(#${g('gold')})`} stroke="#8a5200" strokeWidth="3" />
          {[[34, 40], [48, 34], [62, 38], [76, 33], [88, 41], [56, 44]].map(([x, y], i) => (
            <g key={i}><circle cx={x} cy={y} r="8" fill={`url(#${g('gold')})`} stroke="#8a5200" strokeWidth="2.6" /><path d={`M${x - 3} ${y} h6 M${x} ${y - 3} v6`} stroke="#b86f00" strokeWidth="2" strokeLinecap="round" /></g>
          ))}
          <path className="chest-gem" d="M60 14 l7 9 -7 11 -7 -11Z" fill="#7be3f0" stroke="#0b6a7c" strokeWidth="2.6" strokeLinejoin="round" />
          {/* couvercle ouvert, rabattu vers l'arrière */}
          <path d="M16 54 L24 14 Q60 2 96 14 L104 54 Q60 40 16 54Z" fill={`url(#${g('lid')})`} stroke="#5a2e0a" strokeWidth="4.5" strokeLinejoin="round" transform="translate(0 -8) rotate(-4 60 30)" />
          <path className="chest-spark" d="M20 20 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3Z" fill="#fff" />
        </>
      ) : (
        <>
          {/* couvercle fermé, bombé */}
          <path d="M12 54 Q12 14 60 14 Q108 14 108 54Z" fill={`url(#${g('lid')})`} stroke="#5a2e0a" strokeWidth="4.5" strokeLinejoin="round" />
          <path d="M26 46 Q30 26 52 22" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="5" strokeLinecap="round" />
          <path d="M22 54 Q22 14 60 14" fill="none" stroke="#8a5200" strokeOpacity=".0" />
          <rect x="22" y="22" width="9" height="32" fill={`url(#${g('gold')})`} stroke="#8a5200" strokeWidth="3" transform="rotate(-8 26 38)" />
          <rect x="89" y="22" width="9" height="32" fill={`url(#${g('gold')})`} stroke="#8a5200" strokeWidth="3" transform="rotate(8 94 38)" />
          {/* cadenas */}
          <rect x="49" y="48" width="22" height="22" rx="5" fill={`url(#${g('gold')})`} stroke="#8a5200" strokeWidth="3.4" />
          <circle cx="60" cy="58" r="3.4" fill="#5a2e0a" /><rect x="58.6" y="58" width="2.8" height="7" rx="1.2" fill="#5a2e0a" />
          <path className="chest-spark" d="M96 22 l2.6 6 6 2.6 -6 2.6 -2.6 6 -2.6 -6 -6 -2.6 6 -2.6Z" fill="#fff" />
        </>
      )}
    </svg>
  );
}
