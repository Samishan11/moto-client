import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import type { TripStop } from "@moto/contract";
import type { StopWeather } from "../trip/weather";

/**
 * Interactive OpenStreetMap via MapLibre GL JS inside a WebView. Works in Expo
 * Go with no native build. Renders numbered markers for each stop (ordered) and
 * a line connecting them. Tapping a marker opens a dark, app-styled popup card
 * with the stop's number, name, category, coordinates, ETA, notes and — when
 * available — the ride-day weather.
 *
 * Weather is injected imperatively (not baked into the HTML) so it can update
 * the popups without reloading the map / re-fetching tiles.
 */
export function TripMap({
  stops,
  weather,
  weatherNote,
  places,
  height = 230,
  interactive = true,
}: {
  stops: TripStop[];
  weather?: Record<string, StopWeather>;
  /** Shown in a popup when a stop has no weather (e.g. trip outside forecast window). */
  weatherNote?: string;
  /** stopId → reverse-geocoded place name, shown in the popup under the stop name. */
  places?: Record<string, string>;
  height?: number;
  interactive?: boolean;
}): ReactNode {
  const webRef = useRef<WebView>(null);
  // Base HTML depends only on the stops — weather/places are pushed in separately.
  const html = useMemo(
    () => buildHtml(stops, interactive),
    [stops, interactive],
  );

  const inject = () => {
    const w = JSON.stringify(weather ?? {});
    const note = JSON.stringify(weatherNote ?? null);
    const p = JSON.stringify(places ?? {});
    webRef.current?.injectJavaScript(
      `window.__setPopupData && window.__setPopupData(${w}, ${note}, ${p}); true;`,
    );
  };

  useEffect(() => {
    inject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather, weatherNote, places]);

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.web}
        scrollEnabled={false}
        androidLayerType="hardware"
        javaScriptEnabled
        domStorageEnabled
        // Inject once the page (and window.__setWeather) is ready.
        onLoadEnd={inject}
      />
    </View>
  );
}

/** Marker accent colours cycle so consecutive stops are distinguishable. */
const MARKER_COLORS = ["#30D158", "#2E8BFF", "#FF5A1F", "#BF5AF2", "#FF9F0A"];

/** Escape user-entered text before it lands in popup HTML. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(stops: TripStop[], interactive: boolean): string {
  const ordered = [...stops].sort((a, b) => a.order - b.order);
  const points = ordered.map((s, i) => ({
    id: s.id,
    num: i + 1,
    lng: s.longitude,
    lat: s.latitude,
    name: esc(s.name),
    category: s.category ? esc(s.category) : null,
    eta: s.eta,
    notes: s.notes ? esc(s.notes) : null,
    color: MARKER_COLORS[s.order % MARKER_COLORS.length],
  }));
  // Center on the mean of the stops, or a sensible default when there are none.
  const center =
    points.length > 0
      ? [
          points.reduce((s, p) => s + p.lng, 0) / points.length,
          points.reduce((s, p) => s + p.lat, 0) / points.length,
        ]
      : [8.5, 47.0];
  const data = JSON.stringify({ points, center, interactive });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<style>
  html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#0A0B0D}
  .marker{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    color:#fff;font:700 13px Inter,system-ui,sans-serif;border:2px solid #0A0B0D;box-shadow:0 2px 8px rgba(0,0,0,.5)}
  .maplibregl-ctrl-attrib{font-size:9px}

  /* Popup card — mirrors the app's dark surface cards (#15171C, hairline
     border, radius 16/18, Inter, muted secondary text). */
  .maplibregl-popup-content{background:#15171C;border:1px solid rgba(255,255,255,.09);
    border-radius:16px;padding:12px 14px 13px;box-shadow:0 14px 34px rgba(0,0,0,.55);min-width:200px}
  .maplibregl-popup-anchor-bottom .maplibregl-popup-tip,
  .maplibregl-popup-anchor-bottom-left .maplibregl-popup-tip,
  .maplibregl-popup-anchor-bottom-right .maplibregl-popup-tip{border-top-color:#15171C}
  .maplibregl-popup-anchor-top .maplibregl-popup-tip,
  .maplibregl-popup-anchor-top-left .maplibregl-popup-tip,
  .maplibregl-popup-anchor-top-right .maplibregl-popup-tip{border-bottom-color:#15171C}
  .maplibregl-popup-anchor-left .maplibregl-popup-tip{border-right-color:#15171C}
  .maplibregl-popup-anchor-right .maplibregl-popup-tip{border-left-color:#15171C}
  .maplibregl-popup-close-button{color:#9AA0AB;font-size:16px;right:6px;top:4px;background:none}
  .maplibregl-popup-close-button:hover{background:none;color:#F2F3F5}

  .pop-head{display:flex;align-items:center;gap:9px}
  .pop-num{flex:none;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;
    justify-content:center;color:#fff;font:700 11px Inter,system-ui,sans-serif;border:2px solid #0A0B0D}
  .pop-name{font:700 14px Inter,system-ui,sans-serif;color:#F2F3F5;line-height:1.25}
  .pop-cat{margin-top:1px;font:600 10px Inter,system-ui,sans-serif;letter-spacing:.08em;
    text-transform:uppercase;color:#FF5A1F}
  .pop-meta{margin-top:8px;font:500 11.5px Inter,system-ui,sans-serif;color:#9AA0AB;
    display:flex;flex-wrap:wrap;gap:4px 10px}
  .pop-notes{margin-top:6px;font:500 12px Inter,system-ui,sans-serif;color:#9AA0AB;line-height:1.45}
  .pop-div{height:1px;background:rgba(255,255,255,.08);margin:10px 0 8px}
  .pop-wx-label{font:600 10px Inter,system-ui,sans-serif;letter-spacing:.08em;color:#6B7280;margin-bottom:4px}
  .pop-wx{font:600 12.5px Inter,system-ui,sans-serif;color:#F2F3F5}
  .pop-wx .sub{margin-top:3px;color:#9AA0AB;font-weight:500;font-size:11.5px}
  .pop-wx .basis{color:#6B7280;font-weight:500}
</style>
</head>
<body>
<div id="map"></div>
<script>
  var D = ${data};
  var popupById = {}; // stopId -> { popup, point }

  var wxNote = null;
  var placeById = {};

  // Escapes runtime-injected strings (place names, weather note); stop fields
  // are already escaped in the RN layer when the HTML is built.
  function escHtml(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function fmtEta(mins){
    var h = Math.floor(mins / 60), m = mins % 60;
    if(h === 0) return '+' + m + 'm';
    return '+' + h + 'h' + (m ? ' ' + m + 'm' : '');
  }

  function wxBlock(w){
    if(!w){
      return wxNote
        ? '<div class="pop-div"></div><div class="pop-wx"><span class="sub">' + escHtml(wxNote) + '</span></div>'
        : '';
    }
    var tag = w.basis === 'typical' ? ' <span class="basis">· typical</span>'
            : w.basis === 'actual' ? ' <span class="basis">· recorded</span>' : '';
    var parts = ['🌡 ' + w.tempMaxC + '° / ' + w.tempMinC + '°'];
    if(w.precipProb != null) parts.push('🌧 ' + w.precipProb + '%');
    else if(w.precipMm != null) parts.push('🌧 ' + w.precipMm + ' mm');
    if(w.windKph != null) parts.push('💨 ' + w.windKph + ' km/h');
    return '<div class="pop-div"></div>' +
      '<div class="pop-wx-label">RIDE-DAY WEATHER</div>' +
      '<div class="pop-wx">' + w.emoji + ' ' + w.label + tag +
      '<div class="sub">' + parts.join(' · ') + '</div></div>';
  }

  function popHtml(p, w){
    var head = '<div class="pop-head">' +
      '<span class="pop-num" style="background:' + p.color + '">' + p.num + '</span>' +
      '<div><div class="pop-name">' + p.name + '</div>' +
      (p.category ? '<div class="pop-cat">' + p.category + '</div>' : '') +
      '</div></div>';
    var place = placeById[p.id];
    var meta = '<div class="pop-meta">' +
      (place ? '<span>📍 ' + escHtml(place) + '</span>' : '') +
      '<span>🧭 ' + p.lat.toFixed(5) + ', ' + p.lng.toFixed(5) + '</span>' +
      (p.eta != null ? '<span>⏱ ' + fmtEta(p.eta) + '</span>' : '') + '</div>';
    var notes = p.notes ? '<div class="pop-notes">' + p.notes + '</div>' : '';
    return head + meta + notes + wxBlock(w);
  }

  // Called from RN with { stopId: weather } + { stopId: placeName } maps (+ an
  // optional note shown when a stop has no weather); refreshes popup contents.
  window.__setPopupData = function(wxById, note, places){
    wxNote = note || null;
    placeById = places || {};
    Object.keys(popupById).forEach(function(id){
      var entry = popupById[id];
      entry.popup.setHTML(popHtml(entry.point, wxById[id]));
    });
  };

  var map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
    },
    center: D.center,
    zoom: 9,
    interactive: D.interactive,
    attributionControl: true
  });

  map.on('load', function () {
    if (D.points.length > 1) {
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString',
          coordinates: D.points.map(function (p) { return [p.lng, p.lat]; }) } }
      });
      map.addLayer({
        id: 'route', type: 'line', source: 'route',
        paint: { 'line-color': '#FF5A1F', 'line-width': 4, 'line-opacity': 0.9 },
        layout: { 'line-cap': 'round', 'line-join': 'round' }
      });
    }
    D.points.forEach(function (p) {
      var el = document.createElement('div');
      el.className = 'marker';
      el.style.background = p.color;
      el.textContent = String(p.num);
      var popup = new maplibregl.Popup({ offset: 18, maxWidth: '260px' })
        .setHTML(popHtml(p, null));
      popupById[p.id] = { popup: popup, point: p };
      new maplibregl.Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .setPopup(popup)
        .addTo(map);
    });
    if (D.points.length > 1) {
      var b = new maplibregl.LngLatBounds();
      D.points.forEach(function (p) { b.extend([p.lng, p.lat]); });
      map.fitBounds(b, { padding: 48, animate: false, maxZoom: 13 });
    }
  });
</script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container: { width: "100%", overflow: "hidden", backgroundColor: "#0A0B0D" },
  web: { flex: 1, backgroundColor: "#0A0B0D" },
});
