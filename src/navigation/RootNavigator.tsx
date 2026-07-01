import { type ComponentType, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { Stack, useNavigation } from './Navigator';
import { useAuthDeepLink, type AuthDeepLink } from './deeplink';
import { BottomTabBar } from './BottomTabNavigator';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { VerifyEmailScreen } from '../screens/VerifyEmailScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { TripsScreen } from '../screens/TripsScreen';
import { GroupsScreen } from '../screens/GroupsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { EmergencyContactsScreen } from '../screens/EmergencyContactsScreen';
import { GarageScreen } from '../screens/GarageScreen';
import { BikeFormScreen } from '../screens/BikeFormScreen';
import { BikeDetailScreen } from '../screens/BikeDetailScreen';
import { ServiceRecordFormScreen } from '../screens/ServiceRecordFormScreen';
import { colors, spacing } from '../theme';

const authScreens: Record<string, ComponentType> = {
  welcome: WelcomeScreen,
  login: LoginScreen,
  register: RegisterScreen,
  forgot: ForgotPasswordScreen,
  reset: ResetPasswordScreen,
  verify: VerifyEmailScreen,
};

const appScreens: Record<string, ComponentType> = {
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
};

interface Target {
  route: string;
  params?: Record<string, unknown>;
}

function signedOutTarget(link: AuthDeepLink | null): Target {
  if (link?.kind === 'reset-password') return { route: 'reset', params: { token: link.token } };
  if (link?.kind === 'verify-email') return { route: 'verify', params: { token: link.token } };
  return { route: 'welcome' };
}

function signedInTarget(
  link: AuthDeepLink | null,
  emailVerified: boolean,
  email: string | undefined,
): Target {
  if (link?.kind === 'verify-email') return { route: 'verify', params: { token: link.token } };
  if (!emailVerified) return { route: 'verify', params: { email } };
  return { route: 'home' };
}

function Splash(): ReactNode {
  const { t } = useTranslation();
  return (
    <View style={styles.splash}>
      <Text style={styles.logo}>{t('app.title')}</Text>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

/** Wrapper that renders Stack + BottomTabBar inside the navigation context */
function AppStack({ initialRoute, initialParams, screens }: {
  initialRoute: string;
  initialParams?: Record<string, unknown>;
  screens: Record<string, ComponentType>;
}): ReactNode {
  return (
    <Stack
      initialRoute={initialRoute}
      initialParams={initialParams}
      screens={screens}
      renderNav={(nav) => <BottomTabBar nav={nav} />}
    />
  );
}


export function RootNavigator(): ReactNode {
  const { status, user } = useAuth();
  const link = useAuthDeepLink();

  // Wait for both the session restore and the initial deep-link probe.
  if (status === 'loading' || link === undefined) {
    return <Splash />;
  }

  if (status === 'signedIn') {
    const target = signedInTarget(link, user?.emailVerified ?? false, user?.email);
    // Re-key on an inbound deep link so the stack jumps to it.
    return (
      <AppStack
        key={link?.kind === 'verify-email' ? `dl-${link.token}` : 'app'}
        initialRoute={target.route}
        initialParams={target.params}
        screens={appScreens}
      />
    );
  }

  const target = signedOutTarget(link);
  return (
    <Stack
      key={link ? `dl-${link.kind}-${link.token}` : 'auth'}
      initialRoute={target.route}
      initialParams={target.params}
      screens={authScreens}
    />
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    gap: spacing(2),
  },
  logo: { fontSize: 44, fontWeight: '800', color: colors.primary },
});
