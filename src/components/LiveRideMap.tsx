import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import type * as MapLibre from "@maplibre/maplibre-react-native";
import type { CameraRef } from "@maplibre/maplibre-react-native";

/**
 * MapLibre is a NATIVE module — present only in dev builds (`npx expo
 * run:ios|android`), never in Expo Go. Loading it lazily and tolerating
 * failure keeps the rest of the app usable in Expo Go: map screens render a
 * fallback instead of the whole app dying at boot with
 * "MLRNCameraModule could not be found".
 */
let ml: typeof MapLibre | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ml = require("@maplibre/maplibre-react-native") as typeof MapLibre;
} catch {
  ml = null;
}

export interface RiderMarker {
  userId: string;
  lat: number;
  lng: number;
  /** 1-2 letter initials shown inside the pin. */
  label: string;
  color: string;
  isLeader: boolean;
  heading: number | null;
  /** Rider went silent — render dimmed instead of pretending it's live. */
  stale?: boolean;
}

/** A hazard pin (distinct from rider markers). */
export interface HazardMarker {
  id: string;
  lat: number;
  lng: number;
  /** Hazard type; unused visually for now but kept for future per-type icons. */
  type: string;
}

/** True when the native MapLibre module is present (dev build, not Expo Go). */
export const liveMapAvailable = ml != null;

/** OpenFreeMap dark vector style: keyless, free, production use allowed. */
const MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";
/** Fallback center before any position exists (parity with the old map). */
const DEFAULT_CENTER: [number, number] = [85.32, 27.71]; // Kathmandu

/** Glide cadence: 10fps exponential approach reaches ~95% of a move in ~1s. */
const GLIDE_TICK_MS = 100;
const GLIDE_FACTOR = 0.25;
const SNAP_EPS = 1e-7;

/**
 * Smoothly interpolated [lng, lat] per rider. Position updates arrive every
 * ~4s over the socket; rendering them directly would teleport markers, so each
 * tick moves the displayed position a fraction toward the latest target. New
 * riders appear in place; the interval no-ops (returns the same object) once
 * everything has settled, so idle maps don't re-render.
 */
function useGlidingCoords(
  riders: RiderMarker[],
): Record<string, [number, number]> {
  const [coords, setCoords] = useState<Record<string, [number, number]>>({});
  const targets = useRef<Record<string, [number, number]>>({});

  useEffect(() => {
    const next: Record<string, [number, number]> = {};
    for (const r of riders) next[r.userId] = [r.lng, r.lat];
    targets.current = next;
    setCoords((prev) => {
      const out: Record<string, [number, number]> = {};
      for (const r of riders) out[r.userId] = prev[r.userId] ?? [r.lng, r.lat];
      return out;
    });
  }, [riders]);

  useEffect(() => {
    const iv = setInterval(() => {
      setCoords((prev) => {
        let changed = false;
        const out = { ...prev };
        for (const [id, target] of Object.entries(targets.current)) {
          const cur = out[id];
          if (!cur) continue;
          const dLng = target[0] - cur[0];
          const dLat = target[1] - cur[1];
          if (Math.abs(dLng) < SNAP_EPS && Math.abs(dLat) < SNAP_EPS) continue;
          out[id] = [cur[0] + dLng * GLIDE_FACTOR, cur[1] + dLat * GLIDE_FACTOR];
          changed = true;
        }
        return changed ? out : prev;
      });
    }, GLIDE_TICK_MS);
    return () => clearInterval(iv);
  }, []);

  return coords;
}

/** Frame the camera around the riders: center on a lone rider, fit all. */
function fitCamera(
  camera: CameraRef | null,
  riders: RiderMarker[],
  animated: boolean,
): void {
  if (!camera || riders.length === 0) return;
  if (riders.length === 1) {
    const center: [number, number] = [riders[0].lng, riders[0].lat];
    if (animated) camera.flyTo({ center, zoom: 15, duration: 600 });
    else camera.jumpTo({ center, zoom: 15 });
    return;
  }
  const lngs = riders.map((r) => r.lng);
  const lats = riders.map((r) => r.lat);
  camera.fitBounds(
    [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
    {
      padding: { top: 70, bottom: 70, left: 70, right: 70 },
      ...(animated ? { duration: 600 } : null),
    },
  );
}

export interface LiveRideMapHandle {
  /** Animate the camera back to frame the whole group. */
  recenter(): void;
}

/**
 * Live ride map on MapLibre Native (OpenFreeMap dark style). Fully
 * declarative: pass the current riders/hazards and the component reconciles
 * markers, glides positions between updates, and fits the camera once when
 * the first positions arrive. `ref.recenter()` re-frames on demand.
 *
 * Native module — requires a dev build; not available in Expo Go.
 */
export const LiveRideMap = forwardRef<
  LiveRideMapHandle,
  { riders: RiderMarker[]; hazards?: HazardMarker[] }
>(function LiveRideMap({ riders, hazards = [] }, ref): ReactNode {
  const cameraRef = useRef<CameraRef>(null);
  const didFit = useRef(false);
  const coords = useGlidingCoords(riders);
  const available = ml != null;

  // Latest riders for the imperative recenter, which lives outside the render.
  const ridersRef = useRef(riders);
  ridersRef.current = riders;

  useImperativeHandle(ref, () => ({
    recenter: () => fitCamera(cameraRef.current, ridersRef.current, true),
  }));

  // Recenter once, as soon as we have any position. The caller's own GPS
  // usually arrives after mount, so fitting only on mount would leave a lone
  // rider stranded off-screen on the default center.
  useEffect(() => {
    if (!available || didFit.current || riders.length === 0) return;
    didFit.current = true;
    fitCamera(cameraRef.current, riders, false);
  }, [riders]);

  if (!ml) {
    return (
      <View style={[styles.container, styles.fallback]}>
        <Text style={styles.fallbackTitle}>Map unavailable in Expo Go</Text>
        <Text style={styles.fallbackText}>
          The live map uses a native module. Build the dev client with{" "}
          {'"npx expo run:ios"'} (or run:android) and launch the Moto app
          instead of Expo Go.
        </Text>
      </View>
    );
  }
  const { Map: MapLibreMap, Camera, Marker } = ml;

  return (
    <View style={styles.container}>
      <MapLibreMap
        style={styles.map}
        mapStyle={MAP_STYLE}
        attributionPosition={{ bottom: 8, left: 8 }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: DEFAULT_CENTER, zoom: 13 }}
        />
        {hazards.map((h) => (
          <Marker key={h.id} lngLat={[h.lng, h.lat]}>
            <View style={styles.hazard}>
              <Text style={styles.hazardIcon}>⚠</Text>
            </View>
          </Marker>
        ))}
        {riders.map((r) => (
          <Marker key={r.userId} lngLat={coords[r.userId] ?? [r.lng, r.lat]}>
            <View style={r.stale ? styles.staleWrap : null}>
              <View
                style={[
                  styles.rider,
                  r.isLeader && styles.riderLeader,
                  { backgroundColor: r.color },
                ]}
              >
                <Text style={styles.riderLabel}>{r.label}</Text>
              </View>
            </View>
          </Marker>
        ))}
      </MapLibreMap>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0a0f14" },
  map: { flex: 1 },

  fallback: { alignItems: "center", justifyContent: "center", padding: 32 },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F2F3F5",
    marginBottom: 8,
  },
  fallbackText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9AA0AB",
    textAlign: "center",
    lineHeight: 19,
  },

  staleWrap: { opacity: 0.4 },
  // Teardrop pin: round with one pinched corner, rotated 45° (the label
  // counter-rotates) — same look as the previous WebView markers.
  rider: {
    width: 34,
    height: 34,
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    borderBottomRightRadius: 17,
    borderBottomLeftRadius: 6,
    transform: [{ rotate: "45deg" }],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0a0f14",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  riderLeader: {
    width: 42,
    height: 42,
    borderTopLeftRadius: 21,
    borderTopRightRadius: 21,
    borderBottomRightRadius: 21,
    shadowColor: "#FF5A1F",
    shadowOpacity: 0.6,
    shadowRadius: 9,
  },
  riderLabel: {
    transform: [{ rotate: "-45deg" }],
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  hazard: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "rgba(255,214,10,0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0a0f14",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  hazardIcon: { fontSize: 14, fontWeight: "700", color: "#0a0f14" },
});
