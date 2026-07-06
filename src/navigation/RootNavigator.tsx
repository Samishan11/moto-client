import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { Stack, useNavigation } from "./Navigator";
import { useAuthDeepLink, type AuthDeepLink } from "./deeplink";
import { BottomTabBar } from "./BottomTabNavigator";
import { SplashScreen } from "../screens/SplashScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { ResetPasswordScreen } from "../screens/ResetPasswordScreen";
import { VerifyEmailScreen } from "../screens/VerifyEmailScreen";
import { PermissionsScreen } from "../screens/PermissionsScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { TripsScreen } from "../screens/TripsScreen";
import { GroupsScreen } from "../screens/GroupsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { EmergencyContactsScreen } from "../screens/EmergencyContactsScreen";
import { GarageScreen } from "../screens/GarageScreen";
import { BikeFormScreen } from "../screens/BikeFormScreen";
import { BikeDetailScreen } from "../screens/BikeDetailScreen";
import { ServiceRecordFormScreen } from "../screens/ServiceRecordFormScreen";
import { GroupDetailScreen } from "../screens/GroupDetailScreen";
import { GroupFormScreen } from "../screens/GroupFormScreen";
import { AnnouncementFormScreen } from "../screens/AnnouncementFormScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { BlockListScreen } from "../screens/BlockListScreen";
import { TripDetailScreen } from "../screens/TripDetailScreen";
import { CreateTripScreen } from "../screens/CreateTripScreen";
import { EditTripScreen } from "../screens/EditTripScreen";
import { PollFormScreen } from "../screens/PollFormScreen";
import { LiveRideScreen } from "../screens/LiveRideScreen";
import { RideStatsScreen } from "../screens/RideStatsScreen";
import { ReportHazardScreen } from "../screens/ReportHazardScreen";
import { NearbyRidersScreen } from "../screens/NearbyRidersScreen";
import { isPermissionsSetupDone } from "../lib/permissionsSetup";

const authScreens: Record<string, ComponentType> = {
  welcome: WelcomeScreen,
  login: LoginScreen,
  register: RegisterScreen,
  forgot: ForgotPasswordScreen,
  reset: ResetPasswordScreen,
  verify: VerifyEmailScreen,
};

const appScreens: Record<string, ComponentType> = {
  permissions: PermissionsScreen,
  home: HomeScreen,
  trips: TripsScreen,
  groups: GroupsScreen,
  garage: GarageScreen,
  verify: VerifyEmailScreen,
  profile: ProfileScreen,
  emergencyContacts: EmergencyContactsScreen,
  bikeForm: BikeFormScreen,
  bikeDetail: BikeDetailScreen,
  serviceRecordForm: ServiceRecordFormScreen,
  groupDetail: GroupDetailScreen,
  groupForm: GroupFormScreen,
  announcementForm: AnnouncementFormScreen,
  chat: ChatScreen,
  blockList: BlockListScreen,
  tripDetail: TripDetailScreen,
  tripForm: CreateTripScreen,
  editTrip: EditTripScreen,
  pollForm: PollFormScreen,
  liveRide: LiveRideScreen,
  rideStats: RideStatsScreen,
  reportHazard: ReportHazardScreen,
  nearbyRide: NearbyRidersScreen,
};

interface Target {
  route: string;
  params?: Record<string, unknown>;
}

function signedOutTarget(link: AuthDeepLink | null): Target {
  if (link?.kind === "reset-password")
    return { route: "reset", params: { token: link.token } };
  if (link?.kind === "verify-email")
    return { route: "verify", params: { token: link.token } };
  return { route: "welcome" };
}

function signedInTarget(
  link: AuthDeepLink | null,
  emailVerified: boolean,
  email: string | undefined,
  permissionsSetupDone: boolean,
): Target {
  if (link?.kind === "verify-email")
    return { route: "verify", params: { token: link.token } };
  if (!emailVerified) return { route: "verify", params: { email } };
  // One-time "Set up your ride" permission onboarding (design: Login → Perms → Home).
  if (!permissionsSetupDone) return { route: "permissions" };
  return { route: "home" };
}

/** Wrapper that renders Stack + BottomTabBar inside the navigation context */
function AppStack({
  initialRoute,
  initialParams,
  screens,
}: {
  initialRoute: string;
  initialParams?: Record<string, unknown>;
  screens: Record<string, ComponentType>;
}): ReactNode {
  return (
    <Stack
      initialRoute={initialRoute}
      initialParams={initialParams}
      screens={screens}
      // Bottom tab bar only belongs on the top-level tab screens. Pushed
      // full-screen views (chat, detail, forms) render without it so it can't
      // overlap their own bottom bars/inputs — matches the design.
      renderNav={(nav) =>
        TAB_ROUTES.has(nav.route) ? <BottomTabBar nav={nav} /> : null
      }
    />
  );
}

/** The routes that show the bottom tab bar (must match BottomTabBar's tabs). */
const TAB_ROUTES = new Set(["home", "trips", "groups", "garage"]);

/** Minimum time the startup splash stays on screen so its animation is visible
 *  (mirrors the design's ~1.9s splash before it advances to Welcome). */
const SPLASH_MIN_MS = 1900;

export function RootNavigator(): ReactNode {
  const { status, user } = useAuth();
  const link = useAuthDeepLink();
  const [minSplashDone, setMinSplashDone] = useState(false);
  const [permsDone, setPermsDone] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const timer = setTimeout(() => setMinSplashDone(true), SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  // (Re)check the one-time permissions-setup flag on every auth transition so
  // a sign-out → sign-in within the same app run sees the persisted value.
  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;
    (async () => {
      const done = await isPermissionsSetupDone();
      if (!cancelled) setPermsDone(done);
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  // Show the splash until BOTH the app is ready (session restore + deep-link
  // probe + permissions flag) AND the minimum animation window has elapsed.
  if (
    status === "loading" ||
    link === undefined ||
    permsDone === undefined ||
    !minSplashDone
  ) {
    return <SplashScreen />;
  }

  if (status === "signedIn") {
    const target = signedInTarget(
      link,
      user?.emailVerified ?? false,
      user?.email,
      permsDone,
    );
    // Re-key on an inbound deep link so the stack jumps to it.
    return (
      <AppStack
        key={link?.kind === "verify-email" ? `dl-${link.token}` : "app"}
        initialRoute={target.route}
        initialParams={target.params}
        screens={appScreens}
      />
    );
  }

  const target = signedOutTarget(link);
  return (
    <Stack
      key={link ? `dl-${link.kind}-${link.token}` : "auth"}
      initialRoute={target.route}
      initialParams={target.params}
      screens={authScreens}
    />
  );
}
