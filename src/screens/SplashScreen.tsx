import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * App startup splash — matches the design's SPLASH screen:
 * warm radial glow, orange rounded-square bike logo with a pinging halo,
 * MOTO / RIDE TOGETHER wordmark, and a spinning ring loader.
 */
export function SplashScreen(): ReactNode {
  const fade = useRef(new Animated.Value(0)).current;
  const ping = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.timing(ping, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [fade, ping, spin]);

  const pingScale = ping.interpolate({ inputRange: [0, 1], outputRange: [0.9, 2.4] });
  const pingOpacity = ping.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[styles.root, { opacity: fade }]}>
      {/* Warm radial-ish glow (approximated with a vertical gradient) */}
      <LinearGradient
        colors={['#26160c', '#0b0705', '#050403']}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Logo + pinging halo */}
      <View style={styles.logoWrap}>
        <Animated.View
          style={[styles.ping, { transform: [{ scale: pingScale }], opacity: pingOpacity }]}
        />
        <LinearGradient
          colors={['#FF5A1F', '#E8410C']}
          start={{ x: 0.2, y: 0.2 }}
          end={{ x: 0.8, y: 0.8 }}
          style={styles.logo}
        >
          <Svg width={52} height={52} viewBox="0 0 24 24" fill="none">
            <Circle cx={5.5} cy={17} r={3.4} stroke="#fff" strokeWidth={1.8} />
            <Circle cx={18.5} cy={17} r={3.4} stroke="#fff" strokeWidth={1.8} />
            <Path
              d="M8.5 17h6l2.2-5.5H7m1.5 5.5l-2.2-5.5H4m10.2 0L16 8h2.4"
              stroke="#fff"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </LinearGradient>
      </View>

      <Text style={styles.wordmark}>MOTO</Text>
      <Text style={styles.tagline}>RIDE TOGETHER</Text>

      {/* Spinner */}
      <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050403',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ping: {
    position: 'absolute',
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: '#FF5A1F',
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 16,
  },
  wordmark: {
    fontSize: 30,
    fontWeight: '800',
    color: '#F2F3F5',
    letterSpacing: -0.6,
    marginTop: 26,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF5A1F',
    letterSpacing: 5,
    marginTop: 2,
  },
  spinner: {
    position: 'absolute',
    bottom: 70,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.15)',
    borderTopColor: '#FF5A1F',
  },
});
