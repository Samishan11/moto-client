import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  Animated,
  BackHandler,
  PanResponder,
  useWindowDimensions,
} from "react-native";

/**
 * A tiny stack navigator. The auth flow has a handful of screens and no native
 * navigation needs (tabs, gestures, headers), so this avoids pulling in
 * react-navigation + its native deps. Replace with react-navigation if/when the
 * authed app needs richer navigation.
 */
interface NavState {
  route: string;
  params?: Record<string, unknown>;
}

interface NavContextValue {
  route: string;
  params: Record<string, unknown>;
  navigate(route: string, params?: Record<string, unknown>): void;
  replace(route: string, params?: Record<string, unknown>): void;
  reset(route: string, params?: Record<string, unknown>): void;
  goBack(): void;
  canGoBack: boolean;
}

const NavContext = createContext<NavContextValue | null>(null);

export function useNavigation(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNavigation must be used within <Stack>");
  return ctx;
}

interface StackProps {
  initialRoute: string;
  initialParams?: Record<string, unknown>;
  screens: Record<string, ComponentType>;
  renderNav?: (nav: NavContextValue) => ReactNode;
}

export function Stack({
  initialRoute,
  initialParams,
  screens,
  renderNav,
}: StackProps): ReactNode {
  const [stack, setStack] = useState<NavState[]>([
    { route: initialRoute, params: initialParams },
  ]);

  const navigate = useCallback(
    (route: string, params?: Record<string, unknown>) => {
      setStack((s) => [...s, { route, params }]);
    },
    [],
  );

  const replace = useCallback(
    (route: string, params?: Record<string, unknown>) => {
      setStack((s) => [...s.slice(0, -1), { route, params }]);
    },
    [],
  );

  const reset = useCallback(
    (route: string, params?: Record<string, unknown>) => {
      setStack([{ route, params }]);
    },
    [],
  );

  const goBack = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  // Android hardware back: pop the stack when possible; otherwise let the OS
  // handle it (exit the app / default behavior). No-op on iOS.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stack.length > 1) {
        goBack();
        return true; // handled — don't exit the app
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, goBack]);

  const top = stack[stack.length - 1];
  const value = useMemo<NavContextValue>(
    () => ({
      route: top.route,
      params: top.params ?? {},
      navigate,
      replace,
      reset,
      goBack,
      canGoBack: stack.length > 1,
    }),
    [top, navigate, replace, reset, goBack, stack.length],
  );

  const ActiveScreen = screens[top.route];
  if (!ActiveScreen) {
    throw new Error(`No screen registered for route "${top.route}"`);
  }

  return (
    <NavContext.Provider value={value}>
      {/* Keyed by depth+route so each pushed screen gets a fresh gesture layer
          (its slide offset resets to 0 on every navigation). */}
      <SwipeBack
        key={`${stack.length}:${top.route}`}
        enabled={stack.length > 1}
        onBack={goBack}
      >
        <ActiveScreen />
      </SwipeBack>
      {renderNav && renderNav(value)}
    </NavContext.Provider>
  );
}

/** How close to the left edge a drag must start to count as a back-swipe. */
const EDGE_WIDTH = 28;

/**
 * iOS-style edge-swipe-to-go-back for the lightweight stack. Uses core RN
 * PanResponder (no native gesture lib), and only claims the gesture when a
 * drag starts near the left edge and is clearly horizontal — so taps, buttons
 * and vertical scrolling are never blocked. Disabled at the stack root.
 */
function SwipeBack({
  enabled,
  onBack,
  children,
}: {
  enabled: boolean;
  onBack: () => void;
  children: ReactNode;
}): ReactNode {
  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (evt, g) => {
          if (!enabled) return false;
          const startX = evt.nativeEvent.pageX - g.dx; // where the finger began
          return (
            startX <= EDGE_WIDTH &&
            g.dx > 6 &&
            Math.abs(g.dx) > Math.abs(g.dy) * 1.5
          );
        },
        onPanResponderMove: (_evt, g) => {
          if (g.dx > 0) translateX.setValue(Math.min(g.dx, width));
        },
        onPanResponderRelease: (_evt, g) => {
          const commit = g.dx > width * 0.33 || (g.vx > 0.4 && g.dx > 40);
          if (commit) {
            Animated.timing(translateX, {
              toValue: width,
              duration: 160,
              useNativeDriver: true,
            }).start(() => onBackRef.current());
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              bounciness: 0,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            bounciness: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [enabled, width, translateX],
  );

  return (
    <Animated.View
      style={{ flex: 1, transform: [{ translateX }] }}
      {...responder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}
