import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { WIDTH, buildBase, buildGeometry } from '../../lib/mapGeometry.js';
import { useMapZoom } from '../../lib/useMapZoom.js';
import { STATUS_BY_ID } from '../../lib/useLiveTrains.js';
import { BaseLayer, LabelLayer, ZoomControls } from '../MapBase.jsx';
import { useRailways } from '../../lib/useRailways.js';
import RailNetwork from '../live/RailNetwork.jsx';

const FOLLOW_ZOOM = 6;

/**
 * Mapa con la posición GPS de cada tren, coloreada según su estado.
 * Los puntos se desplazan suavemente entre una actualización y la siguiente,
 * y el tren seleccionado muestra su recorrido real y sus paradas.
 * Las vías de larga distancia se dibujan con la red ferroviaria real de OpenStreetMap (la misma que el mapa
 * de la portada), en vez de con rectas entre estaciones. Si esa red no carga, se usan las rectas.
 */
export default function LiveMap({ provinces, countries, network, cerTracks, trains, selected, follow, onSelect }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const geo = useMemo(() => buildGeometry(provinces, countries), [provinces, countries]);
  const base = useMemo(() => buildBase(provinces, countries, geo), [provinces, countries, geo]);
  const toPaths = (lines) => lines.map((l) => ({ id: l.id, d: geo.path({ type: 'MultiLineString', coordinates: l.coords }) }));
  const avTracks = useMemo(() => toPaths(network), [network, geo]);
  const railways = useRailways();
  // `network` llega vacío cuando el filtro es «solo Cercanías»: entonces tampoco se dibuja la red.
  const showNetwork = network.length > 0;
  const cerPaths = useMemo(() => toPaths(cerTracks), [cerTracks, geo]);
  const { transform, zoomBy, reset, focus } = useMapZoom(svgRef, geo.height);
  const k = transform.k;

  // Los retrasos se dibujan los últimos para que queden por encima.
  const dots = useMemo(
    () =>
      trains
        .map((t) => {
          const p = geo.projection([t.lon, t.lat]);
          return p ? { train: t, x: p[0], y: p[1] } : null;
        })
        .filter(Boolean)
        .reverse(),
    [trains, geo],
  );

  // Recorrido del tren seleccionado: trazado real (si lo hay) y sus paradas.
  const selectedId = selected?.id ?? null;
  const route = useMemo(() => {
    if (!selected?.detail) return null;
    const { geometry, stops } = selected.detail;
    const stopCoords = (stops ?? []).filter((s) => s.lat != null).map((s) => [s.lon, s.lat]);
    const coords = geometry?.length > 1 ? geometry : stopCoords;
    return {
      d: coords.length > 1 ? geo.path({ type: 'LineString', coordinates: coords }) : null,
      stops: stopCoords.map((c) => geo.projection(c)).filter(Boolean),
      real: geometry?.length > 1,
    };
  }, [selected?.detail, geo]);

  // Seguir el tren: centrar el mapa en él cada vez que cambia su posición.
  const followed = dots.find((d) => d.train.id === selectedId);
  const fx = followed?.x;
  const fy = followed?.y;
  useEffect(() => {
    if (follow && fx != null) focus(fx, fy, Math.max(FOLLOW_ZOOM, transform.k));
    // transform.k no se incluye a propósito: el usuario puede cambiar el zoom mientras sigue el tren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follow, fx, fy, focus]);

  const showTip = (dot) => (event) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    setHover({ train: dot.train, x, y: event.clientY - rect.top, flip: x > rect.width * 0.62 });
  };

  return (
    <div className="map-frame incidents-map" onPointerLeave={() => setHover(null)}>
      <svg
        ref={svgRef}
        className={`map-svg${selectedId ? ' has-selection' : ''}`}
        viewBox={`0 0 ${WIDTH} ${geo.height}`}
        role="img"
        aria-label="Mapa de trenes en tiempo real"
      >
        <rect className="map-sea" y={-1000} width={WIDTH} height={geo.height + 1000} onClick={() => onSelect(null)} />
        <g transform={transform.toString()}>
          <BaseLayer {...base} inset={geo.inset} />
          {showNetwork && railways && <RailNetwork data={railways} path={geo.path} />}
          <Tracks tracks={cerPaths} variant="cer" />
          {!railways && <Tracks tracks={avTracks} variant="av" />}
          <LabelLayer {...base} k={k} />

          {route?.d && (
            <g className="train-route" pointerEvents="none">
              <path d={route.d} className="train-route-casing" />
              <path d={route.d} className="train-route-line" style={{ stroke: selected.train?.color ?? undefined }} />
              {route.stops.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={3.2 / k} strokeWidth={1.6 / k} className="train-route-stop" />
              ))}
            </g>
          )}

          <g className="train-dots">
            {dots.map((dot) => {
              const { train } = dot;
              const isSel = train.id === selectedId;
              const r = (train.status === 'delay' ? 6 : train.kind === 'ld' ? 4.6 : 3.4) / k;
              return (
                <g
                  key={train.id}
                  className={`train-dot-wrap${isSel ? ' is-selected' : ''}`}
                  style={{ transform: `translate(${dot.x}px, ${dot.y}px)` }}
                >
                  {(train.status === 'delay' || isSel) && <circle className="dot-pulse" r={r} strokeWidth={2 / k} />}
                  <circle
                    className={`train-dot train-dot--${train.status}`}
                    r={isSel ? r * 1.7 : r}
                    strokeWidth={(isSel ? 2.5 : 1.2) / k}
                    onPointerEnter={showTip(dot)}
                    onPointerMove={showTip(dot)}
                    onPointerLeave={() => setHover(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(train.id);
                    }}
                  />
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      <ZoomControls zoomBy={zoomBy} reset={reset} />

      <div className="map-legend" aria-hidden="true">
        <span>
          <span className={`legend-track ${railways ? 'legend-track--rail' : 'legend-track--av'}`} />
          {railways ? 'Red ferroviaria' : 'Vía de alta velocidad'}
        </span>
        <span>
          <span className="legend-track legend-track--cer" />
          Vía de Cercanías
        </span>
        {['delay', 'moving', 'incoming', 'stopped'].map((id) => (
          <span key={id}>
            <span className={`status-dot status-dot--${id}`} />
            {STATUS_BY_ID[id].label}
          </span>
        ))}
      </div>

      {showNetwork && railways && <div className="map-attribution">Vías © OpenStreetMap</div>}

      {route && selectedId && (
        <div className="route-note">{route.real ? 'Recorrido real del tren' : 'Recorrido aproximado (uniendo sus paradas)'}</div>
      )}

      {hover && (
        <div className={`map-tooltip${hover.flip ? ' is-flipped' : ''}`} style={{ left: hover.x, top: hover.y }}>
          <div className="tooltip-title">
            <span className={`status-dot status-dot--${hover.train.status}`} />
            {hover.train.label}
          </div>
          {hover.train.origin && hover.train.destination && (
            <div className="tooltip-meta">
              {hover.train.origin} → {hover.train.destination}
            </div>
          )}
          <div className="tooltip-meta">
            {STATUS_BY_ID[hover.train.status].label}
            {hover.train.stopName && ` · ${hover.train.status === 'stopped' ? 'en' : 'hacia'} ${hover.train.stopName}`}
          </div>
          {hover.train.officialDelayMin > 0 && (
            <div className="tooltip-meta">Retraso oficial: {hover.train.officialDelayMin} min</div>
          )}
          {hover.train.status === 'delay' && (
            <div className="tooltip-meta">Sin moverse desde hace {hover.train.stillMinutes} min</div>
          )}
        </div>
      )}
    </div>
  );
}

const Tracks = memo(function Tracks({ tracks, variant }) {
  return (
    <g className={`live-tracks live-tracks--${variant}`} pointerEvents="none">
      {tracks.map((t) => (
        <path key={t.id} d={t.d} />
      ))}
    </g>
  );
});
