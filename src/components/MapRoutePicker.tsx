import { useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { colors } from '../theme';

export interface PickedPoint {
  latitude: number;
  longitude: number;
}

interface GeoResult {
  displayName: string;
  latitude: number;
  longitude: number;
}

/**
 * Geocode a place name via OpenStreetMap Nominatim. `accept-language: ne,en`
 * makes it match and label results in both Nepali (पोखरा) and English (Pokhara).
 */
async function geocode(query: string): Promise<GeoResult[]> {
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=ne,en&q=' +
    encodeURIComponent(query);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return data.map((d) => ({
    displayName: d.display_name,
    latitude: Number(d.lat),
    longitude: Number(d.lon),
  }));
}

/**
 * Full-screen interactive map (MapLibre GL JS + OpenStreetMap in a WebView) for
 * building a route by tapping. Each tap drops a numbered marker and extends an
 * orange line connecting the stops in order — e.g. tap Kathmandu, then Pokhara,
 * and the line links them. Works in Expo Go, no native build.
 */
export function MapRoutePicker({
  visible,
  initial = [],
  onCancel,
  onDone,
}: {
  visible: boolean;
  initial?: PickedPoint[];
  onCancel: () => void;
  onDone: (points: PickedPoint[]) => void;
}): ReactNode {
  const webRef = useRef<WebView>(null);
  const [points, setPoints] = useState<PickedPoint[]>(initial);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);

  function onMessage(e: WebViewMessageEvent): void {
    try {
      const data = JSON.parse(e.nativeEvent.data) as { lng: number; lat: number }[];
      setPoints(data.map((p) => ({ latitude: p.lat, longitude: p.lng })));
    } catch {
      // ignore malformed messages
    }
  }

  const inject = (fn: string) => webRef.current?.injectJavaScript(`${fn}; true;`);

  async function runSearch(): Promise<void> {
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    try {
      setResults(await geocode(q));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  /** A search result becomes the next stop: fly there and drop its pin. */
  function selectResult(r: GeoResult): void {
    inject(`searchAdd(${r.longitude}, ${r.latitude})`);
    setResults([]);
    setQuery('');
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.root}>
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html: buildHtml(initial) }}
          style={styles.web}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          androidLayerType="hardware"
        />

        {/* Top bar: back + search */}
        <View style={styles.topBar} pointerEvents="box-none">
          <View style={styles.topRow}>
            <Pressable style={styles.iconBtn} onPress={onCancel} hitSlop={8}>
              <Text style={styles.iconText}>‹</Text>
            </Pressable>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={runSearch}
                placeholder="Search a place (Pokhara / पोखरा)"
                placeholderTextColor="#6B7280"
                returnKeyType="search"
                autoCorrect={false}
              />
              {searching ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : query.length > 0 ? (
                <Pressable onPress={runSearch} hitSlop={8}>
                  <Text style={styles.searchGo}>Go</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Search results dropdown */}
          {results.length > 0 ? (
            <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
              {results.map((r, i) => (
                <Pressable key={i} style={styles.resultRow} onPress={() => selectResult(r)}>
                  <Text style={styles.resultPin}>📍</Text>
                  <Text style={styles.resultText} numberOfLines={2}>
                    {r.displayName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.hint}>
              <Text style={styles.hintText}>
                {points.length === 0
                  ? 'Search or tap the map to set your start'
                  : points.length === 1
                    ? 'Tap or search to add the destination'
                    : `${points.length} stops · tap to add more`}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomBar}>
          <Pressable
            style={[styles.ghostBtn, points.length === 0 && styles.disabled]}
            onPress={() => inject('undoPoint()')}
            disabled={points.length === 0}
          >
            <Text style={styles.ghostText}>Undo</Text>
          </Pressable>
          <Pressable
            style={[styles.ghostBtn, points.length === 0 && styles.disabled]}
            onPress={() => inject('clearPoints()')}
            disabled={points.length === 0}
          >
            <Text style={styles.ghostText}>Clear</Text>
          </Pressable>
          <Pressable
            style={[styles.doneBtn, points.length === 0 && styles.disabled]}
            onPress={() => onDone(points)}
            disabled={points.length === 0}
          >
            <Text style={styles.doneText}>
              Use {points.length} {points.length === 1 ? 'stop' : 'stops'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const MARKER_COLORS = ['#30D158', '#2E8BFF', '#FF5A1F', '#BF5AF2', '#FF9F0A'];

function buildHtml(initial: PickedPoint[]): string {
  const seed = JSON.stringify(initial.map((p) => ({ lng: p.longitude, lat: p.latitude })));
  const colors = JSON.stringify(MARKER_COLORS);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<style>
  html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#0A0B0D}
  .marker{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    color:#fff;font:700 14px Inter,system-ui,sans-serif;border:2px solid #0A0B0D;box-shadow:0 2px 8px rgba(0,0,0,.5)}
</style>
</head>
<body>
<div id="map"></div>
<script>
  var COLORS = ${colors};
  var points = ${seed};
  var markers = [];
  var map = new maplibregl.Map({
    container: 'map',
    style: { version: 8, sources: { osm: { type:'raster',
      tiles:['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize:256,
      attribution:'© OpenStreetMap contributors' } },
      layers: [{ id:'osm', type:'raster', source:'osm' }] },
    center: points.length ? [points[0].lng, points[0].lat] : [84.0, 28.2], // Nepal-ish default
    zoom: points.length ? 8 : 6
  });

  function report() {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(points));
  }
  function render() {
    markers.forEach(function(m){ m.remove(); });
    markers = [];
    points.forEach(function(p, i){
      var el = document.createElement('div');
      el.className = 'marker';
      el.style.background = COLORS[i % COLORS.length];
      el.textContent = String(i + 1);
      markers.push(new maplibregl.Marker({element: el}).setLngLat([p.lng, p.lat]).addTo(map));
    });
    var coords = points.map(function(p){ return [p.lng, p.lat]; });
    var geo = { type:'Feature', geometry:{ type:'LineString', coordinates: coords } };
    if (map.getSource('route')) { map.getSource('route').setData(geo); }
    else if (map.isStyleLoaded()) {
      map.addSource('route', { type:'geojson', data: geo });
      map.addLayer({ id:'route', type:'line', source:'route',
        paint:{ 'line-color':'#FF5A1F', 'line-width':4, 'line-opacity':.9 },
        layout:{ 'line-cap':'round', 'line-join':'round' } });
    }
  }
  function addPoint(lng, lat){ points.push({lng:lng, lat:lat}); render(); report(); }
  function undoPoint(){ points.pop(); render(); report(); }
  function clearPoints(){ points = []; render(); report(); }
  // Called from the search box: fly to the result and add it as a stop.
  function searchAdd(lng, lat){ points.push({lng:lng, lat:lat}); render(); report(); map.flyTo({center:[lng,lat], zoom:11}); }

  map.on('load', function(){ render(); report(); });
  map.on('click', function(e){ addPoint(e.lngLat.lng, e.lngLat.lat); });
</script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0B0D' },
  web: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    gap: 10,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchBox: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(10,11,13,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 14, color: '#F2F3F5', paddingVertical: 0 },
  searchGo: { fontSize: 13, fontWeight: '700', color: colors.primary },
  results: {
    maxHeight: 240,
    borderRadius: 14,
    backgroundColor: 'rgba(18,20,24,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  resultPin: { fontSize: 14 },
  resultText: { flex: 1, fontSize: 13, color: '#F2F3F5' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(10,11,13,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: '#fff', fontSize: 22, fontWeight: '600', lineHeight: 24 },
  hint: {
    alignSelf: 'flex-start',
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(10,11,13,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  hintText: { color: '#F2F3F5', fontSize: 13, fontWeight: '600' },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 34,
    flexDirection: 'row',
    gap: 10,
  },
  ghostBtn: {
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(21,23,28,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: { color: '#F2F3F5', fontSize: 14, fontWeight: '600' },
  doneBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  doneText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
