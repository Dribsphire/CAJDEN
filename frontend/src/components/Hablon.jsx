import { useId } from 'react';

/**
 * Woven band inspired by hablon, the handloom textile of Negros and Panay.
 * Warp threads are solid vertical stripes; weft threads cross them at
 * partial opacity, which gives the plaid its woven look. Drawn as an SVG
 * <pattern> so the band tiles to any width without extra markup.
 */
const PALETTES = {
  red: { base: '#C8352B', threads: [['#F6C21C', 10], ['#14130F', 3], ['#0F6B3A', 7], ['#F4EEDF', 2], ['#7CC8E6', 5], ['#14130F', 3]] },
  green: { base: '#0F6B3A', threads: [['#F6C21C', 6], ['#14130F', 2], ['#C8352B', 9], ['#F4EEDF', 2], ['#E86A1C', 5]] },
  ink: { base: '#14130F', threads: [['#F6C21C', 8], ['#C8352B', 4], ['#F4EEDF', 2], ['#0F6B3A', 6], ['#7CC8E6', 3]] },
};
const GAP = 6;

export default function Hablon({ height = 16, variant = 'red', className = '' }) {
  const id = useId().replace(/:/g, '');
  const { base, threads } = PALETTES[variant] || PALETTES.red;

  let x = 0;
  const warp = threads.map(([color, w]) => {
    const rect = <rect key={`w${x}`} x={x} y="0" width={w} height={height} fill={color} />;
    x += w + GAP;
    return rect;
  });
  const tileWidth = x;

  const weft = [];
  for (let y = 0, j = 0; y < height; j++) {
    const [color, w] = threads[(j + 2) % threads.length];
    const h = Math.max(2, Math.round(w / 2));
    weft.push(<rect key={`f${y}`} x="0" y={y} width={tileWidth} height={h} fill={color} fillOpacity="0.55" />);
    y += h + 5;
  }

  return (
    <svg className={`hablon ${className}`} width="100%" height={height} aria-hidden="true" focusable="false" style={{ display: 'block' }}>
      <defs>
        <pattern id={`hablon-${id}`} width={tileWidth} height={height} patternUnits="userSpaceOnUse">
          <rect width={tileWidth} height={height} fill={base} />
          {warp}
          {weft}
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#hablon-${id})`} />
    </svg>
  );
}
