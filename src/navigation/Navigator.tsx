import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';

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
  if (!ctx) throw new Error('useNavigation must be used within <Stack>');
  return ctx;
}

interface StackProps {
  initialRoute: string;
  initialParams?: Record<string, unknown>;
  screens: Record<string, ComponentType>;
  renderNav?: (nav: NavContextValue) => ReactNode;
}

export function Stack({ initialRoute, initialParams, screens, renderNav }: StackProps): ReactNode {
  const [stack, setStack] = useState<NavState[]>([
    { route: initialRoute, params: initialParams },
  ]);

  const navigate = useCallback((route: string, params?: Record<string, unknown>) => {
    setStack((s) => [...s, { route, params }]);
  }, []);

  const replace = useCallback((route: string, params?: Record<string, unknown>) => {
    setStack((s) => [...s.slice(0, -1), { route, params }]);
  }, []);

  const reset = useCallback((route: string, params?: Record<string, unknown>) => {
    setStack([{ route, params }]);
  }, []);

  const goBack = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

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
      <ActiveScreen />
      {renderNav && renderNav(value)}
    </NavContext.Provider>
  );
}
