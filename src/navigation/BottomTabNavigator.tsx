import { type ReactNode } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';

interface NavContextValue {
  route: string;
  params: Record<string, unknown>;
  reset(route: string, params?: Record<string, unknown>): void;
}

interface BottomTabBarProps {
  nav: NavContextValue;
}

export function BottomTabBar({ nav }: BottomTabBarProps): ReactNode {
  const tabs = [
    { route: 'home', label: 'Home', icon: 'home' },
    { route: 'trips', label: 'Trips', icon: 'trips' },
    { route: 'groups', label: 'Groups', icon: 'groups' },
    { route: 'garage', label: 'Garage', icon: 'garage' },
  ];

  const renderIcon = (type: string, isActive: boolean) => {
    const color = isActive ? '#FF5A1F' : '#F2F3F5';

    switch (type) {
      case 'home':
        return (
          <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <Path
              d="M3 10.5L12 3l9 7.5M5 9.5V20h5v-6h4v6h5V9.5"
              stroke={color}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );
      case 'trips':
        return (
          <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <Path
              d="M6 20V6a2 2 0 0 1 2-2h1M6 20l-2-2M6 20l2-2M18 4v14a2 2 0 0 1-2 2h-1m3-16l2 2m-2-2l-2 2M9 4h6M9 20h6"
              stroke={color}
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );
      case 'groups':
        return (
          <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <Circle cx="9" cy="8" r="3" stroke={color} strokeWidth="1.7" />
            <Path
              d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6a3 3 0 0 1 0 6m1.5 2.2A5.5 5.5 0 0 1 20.5 19"
              stroke={color}
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </Svg>
        );
      case 'garage':
        return (
          <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <Circle cx="5.5" cy="17" r="2.6" stroke={color} strokeWidth="1.7" />
            <Circle cx="18.5" cy="17" r="2.6" stroke={color} strokeWidth="1.7" />
            <Path
              d="M8 17h5l2-4.5H7.5m.5 4.5l-1.5-4.5H4m9.5 0L15 9h2.5"
              stroke={color}
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(10,11,13,0)', 'rgba(10,11,13,0.94)']}
        locations={[0, 0.4]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradientOverlay}
      />
      <View style={styles.tabBar}>
        {tabs.slice(0, 2).map((tab) => {
          const isActive = nav.route === tab.route;
          return (
            <TouchableOpacity
              key={tab.route}
              style={styles.tabButton}
              onPress={() => nav.reset(tab.route)}
            >
              {renderIcon(tab.icon, isActive)}
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        {/* Space for FAB */}
        <View style={styles.fabSpace} />
        {tabs.slice(2).map((tab) => {
          const isActive = nav.route === tab.route;
          return (
            <TouchableOpacity
              key={tab.route}
              style={styles.tabButton}
              onPress={() => nav.reset(tab.route)}
            >
              {renderIcon(tab.icon, isActive)}
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Floating Action Button */}
      <LinearGradient
        colors={['#FF6A2F', '#E8410C']}
        start={{ x: 0.2, y: 0.2 }}
        end={{ x: 0.8, y: 0.8 }}
        style={styles.fab}
      >
        <TouchableOpacity
          style={styles.fabContent}
          onPress={() => {
            /* Start ride */
          }}
        >
          <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <Path d="M12 2l7 18-7-4-7 4 7-18z" fill="#fff" />
          </Svg>
          <Text style={styles.fabLabel}>RIDE</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 26,
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    zIndex: 0,
  },
  tabBar: {
    height: 64,
    borderRadius: 24,
    backgroundColor: 'rgba(21,23,28,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    zIndex: 1,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  fabSpace: {
    width: 56,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F2F3F5',
  },
  tabLabelActive: {
    color: '#FF5A1F',
  },
  fab: {
    position: 'absolute',
    top: -14,
    left: '50%',
    marginLeft: -31,
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 4,
    borderColor: '#0A0B0D',
    zIndex: 2,
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 26,
    elevation: 13,
  },
  fabContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 31,
  },
  fabLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FF7A3F',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
