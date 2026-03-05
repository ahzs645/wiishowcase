import { memo, useRef, useEffect } from 'react';

const PLAYERS = {
  P1: { color: '#bfe2ff', accent: '#008cff' },
  P2: { color: '#ffcccc', accent: '#ff3838' },
  P3: { color: '#bfedbe', accent: '#10bd0d' },
  P4: { color: '#ffe6bf', accent: '#ff9c00' },
};

export default memo(function WiiPointer({ x, y, player = 'P1', visible = true }) {
  const svgRef = useRef(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }, [x, y]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.style.display = visible ? '' : 'none';
  }, [visible]);

  const colors = PLAYERS[player] || PLAYERS.P1;
  const playerNumber = player.replace('P', '');
  const gradId1 = `wiiPointerGrad1-${player}`;
  const gradId2 = `wiiPointerGrad2-${player}`;

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width: 64,
        height: 64,
        pointerEvents: 'none',
        zIndex: 10000,
        transform: 'translate(-8px, -4px)',
        display: visible ? '' : 'none',
        '--player-color': colors.color,
        '--player-accent': colors.accent,
      }}
      viewBox="-6 -6 20.000003 20"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <defs>
        <linearGradient id={gradId1} gradientUnits="userSpaceOnUse" x1="100.22274" y1="155.46613" x2="100.22274" y2="148.26958">
          <stop style={{ stopColor: 'var(--player-color)', stopOpacity: 1 }} offset="0.1" />
          <stop style={{ stopColor: '#ffffff', stopOpacity: 1 }} offset="0.8" />
        </linearGradient>
        <linearGradient id={gradId2} gradientUnits="userSpaceOnUse" x1="100.22274" y1="155.46613" x2="100.22274" y2="148.26958">
          <stop style={{ stopColor: 'var(--player-color)', stopOpacity: 1 }} offset="0.1" />
          <stop style={{ stopColor: '#ffffff', stopOpacity: 1 }} offset="0.8" />
        </linearGradient>
      </defs>
      <g transform="translate(8.5221861e-5,8.1085126e-4)">
        <g transform="translate(0.1695841,-0.08889199)">
          {/* Black outlines */}
          <g transform="translate(-101.26042,-144.56232)">
            <path
              style={{ fill: '#000000', fillOpacity: 1, stroke: '#000000', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'miter', paintOrder: 'normal' }}
              d="m 101.18359,148.24023 -0.21679,0.18165 c -0.37574,0.31179 -0.59375,0.77345 -0.59375,1.26171 v 2.0918 c 0,0.336 0.146,0.65549 0.40039,0.875 l 1.48242,1.2793 c 0.25439,0.21951 0.40039,0.539 0.40039,0.875 v 0.18359 c 0,0.29225 0.23705,0.5293 0.5293,0.5293 h 4.40234 c 0.27053,0.0217 0.5076,-0.18064 0.5293,-0.45117 0,-0.34434 0.10632,-0.67949 0.30469,-0.96094 l 0.71484,-1.01367 c 0.19835,-0.28145 0.29297,-0.6166 0.29297,-0.96094 v -2.77148 l -7.48242,0.11523 v 0.22851 a 0.31950433,0.31950433 135 0 1 -0.32032,0.32032 h -0.125 a 0.31950433,0.31950433 45 0 1 -0.31836,-0.32032 v -0.22851 z"
            />
            <path
              style={{ fill: '#000000', stroke: '#000000', strokeWidth: 3.4, strokeLinecap: 'round', strokeLinejoin: 'round', paintOrder: 'normal' }}
              d="m 102.74609,142.19141 v 5.97656 z"
            />
            <path
              style={{ fill: '#000000', stroke: '#000000', strokeWidth: 3.4, strokeLinecap: 'round', strokeLinejoin: 'round', paintOrder: 'normal' }}
              d="m 104.9082,146.95312 v 0.98829 z"
              transform="translate(0.14188336)"
            />
            <path
              style={{ fill: '#000000', stroke: '#000000', strokeWidth: 3.1, strokeLinecap: 'round', strokeLinejoin: 'round', paintOrder: 'normal' }}
              d="m 106.91992,147.28125 v 0.79883 z"
              transform="translate(0.07093669)"
            />
            <path
              style={{ fill: '#000000', stroke: '#000000', strokeWidth: 3.1, strokeLinecap: 'round', strokeLinejoin: 'round', paintOrder: 'normal' }}
              d="m 108.78125,147.8457 v 1.06446 z"
            />
          </g>
          {/* Gradient fill + white strokes */}
          <g transform="translate(-101.26042,-144.56232)">
            <path
              style={{ fill: `url(#${gradId1})`, stroke: `url(#${gradId2})`, strokeWidth: 0.3, strokeLinecap: 'round', strokeLinejoin: 'miter', paintOrder: 'normal' }}
              d="m 109.44141,149.35938 v 2.77083 c 0,0.34434 -0.10648,0.68025 -0.30485,0.9617 l -0.71374,1.01267 c -0.19837,0.28145 -0.30485,0.61736 -0.30485,0.9617 -0.0217,0.27053 -0.25864,0.47224 -0.52917,0.45052 h -4.40298 c -0.29225,0 -0.52917,-0.23692 -0.52917,-0.52917 v -0.18346 c 0,-0.336 -0.14624,-0.65537 -0.40063,-0.87488 l -1.48265,-1.27942 c -0.25439,-0.21951 -0.40063,-0.53888 -0.40063,-0.87488 v -2.09071 c 0,-0.48826 0.2174,-0.95116 0.59314,-1.26295 l 0.21723,-0.18026 v 1.23307 0.22971 a 0.31950433,0.31950433 45 0 0 0.3195,0.3195 h 0.12461 a 0.31950433,0.31950433 135 0 0 0.3195,-0.3195 v -0.22971 -1.28237 h 7.45568 z"
            />
            <path
              style={{ fill: 'none', stroke: '#ffffff', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }}
              d="m 102.74687,142.19218 v 5.97508"
            />
            <path
              style={{ fill: 'none', stroke: '#ffffff', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }}
              d="m 104.90812,147.94122 v -0.98841"
            />
            <path
              style={{ fill: 'none', stroke: '#ffffff', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}
              d="m 106.91936,147.28081 v 0.79897"
            />
            <path
              style={{ fill: 'none', stroke: '#ffffff', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}
              d="m 108.78061,147.8463 v 1.06461"
            />
            <path
              style={{ fill: 'none', stroke: '#ffffff', strokeWidth: 0.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}
              d="m 103.59738,147.6298 v 0.0419 a 0.214437,0.214437 45.372505 0 0 0.21165,0.21442 l 0.0381,5e-4 a 0.20893213,0.20893213 135.37251 0 0 0.21165,-0.20892 v -0.0477"
              transform="translate(0,0.26888592)"
            />
            <path
              style={{ fill: 'none', stroke: '#ffffff', strokeWidth: 0.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}
              d="m 103.59738,147.6298 v 0.0419 a 0.214437,0.214437 45.372505 0 0 0.21165,0.21442 l 0.0381,5e-4 a 0.20893213,0.20893213 135.37251 0 0 0.21165,-0.20892 v -0.0477"
              transform="translate(4.0226084,0.26888592)"
            />
            <path
              style={{ fill: 'none', stroke: '#ffffff', strokeWidth: 0.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}
              d="m 103.59738,147.6298 v 0.0419 a 0.214437,0.214437 45.372505 0 0 0.21165,0.21442 l 0.0381,5e-4 a 0.20893213,0.20893213 135.37251 0 0 0.21165,-0.20892 v -0.0477"
              transform="translate(2.1600749,0.26888592)"
            />
          </g>
        </g>
        {/* Player number text */}
        <text
          x="4.15"
          y="6.85"
          style={{
            fontFamily: 'var(--wii-font-system, system-ui, sans-serif)',
            fontWeight: 700,
            fill: 'var(--player-accent)',
            fontSize: '3.8px',
            textAnchor: 'middle',
            dominantBaseline: 'central',
          }}
        >
          {playerNumber}
        </text>
      </g>
    </svg>
  );
});
