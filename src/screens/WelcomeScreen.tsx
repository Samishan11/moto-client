import { useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useNavigation } from '../navigation/Navigator';

interface Slide {
  key: string;
  title: string;
  description: string;
  hero: ReactNode;
}

/** Per-slide hero visualizations — same palette/language as the design file
 *  (orange #FF5A1F routes, blue #2E8BFF secondary, rider markers, dark bg). */

function HeroRoutes(): ReactNode {
  return (
    <>
      <Svg height="100%" width="100%" style={styles.svgFill}>
        <Path
          d="M-20 500 C90 420 120 300 260 300 S380 180 440 60"
          stroke="#FF5A1F"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M-20 620 C120 560 160 460 300 470 S420 380 460 320"
          stroke="#2E8BFF"
          strokeWidth="2.5"
          fill="none"
          opacity="0.6"
          strokeLinecap="round"
        />
      </Svg>
      <View style={[styles.marker, { left: '52%', top: '44%', backgroundColor: '#FF5A1F' }]} />
    </>
  );
}

function HeroGroup(): ReactNode {
  return (
    <>
      <Svg height="100%" width="100%" style={styles.svgFill}>
        <Path
          d="M-20 560 C100 480 140 380 260 360 S400 260 460 180"
          stroke="#FF5A1F"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M-20 560 C100 480 140 380 260 360 S400 260 460 180"
          stroke="#FF5A1F"
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
          opacity="0.14"
        />
      </Svg>
      {/* Rider markers regrouping along the route */}
      <View style={[styles.riderMarker, { left: '24%', top: '58%', backgroundColor: '#FF9F0A' }]}>
        <Text style={styles.riderInitial}>A</Text>
      </View>
      <View style={[styles.riderMarker, { left: '48%', top: '44%', backgroundColor: '#2E8BFF' }]}>
        <Text style={[styles.riderInitial, { color: '#fff' }]}>M</Text>
      </View>
      <View style={[styles.riderMarker, { left: '68%', top: '30%', backgroundColor: '#30D158' }]}>
        <Text style={styles.riderInitial}>D</Text>
      </View>
    </>
  );
}

function HeroSafety(): ReactNode {
  return (
    <>
      <Svg height="100%" width="100%" style={styles.svgFill}>
        <Circle cx="50%" cy="46%" r="90" stroke="#FF453A" strokeWidth="1.5" fill="none" opacity="0.25" />
        <Circle cx="50%" cy="46%" r="60" stroke="#FF453A" strokeWidth="1.5" fill="none" opacity="0.45" />
      </Svg>
      <View style={styles.sosBadge}>
        <Text style={styles.sosText}>SOS</Text>
      </View>
    </>
  );
}

function HeroTrips(): ReactNode {
  return (
    <>
      <Svg height="100%" width="100%" style={styles.svgFill}>
        <Path
          d="M-10 520 C80 460 60 340 170 340 S300 220 440 140"
          stroke="#FF5A1F"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        {/* Checkpoint stops along the planned route (start → checkpoint → summit) */}
        <Circle cx="12%" cy="62%" r="7" fill="#30D158" />
        <Circle cx="44%" cy="43%" r="6" fill="#2E8BFF" />
        <Circle cx="86%" cy="22%" r="8" fill="#FF5A1F" />
      </Svg>
      <View style={styles.checkpointChip}>
        <Text style={styles.checkpointChipText}>🏁 Checkpoint 2 · 2.4 km</Text>
      </View>
    </>
  );
}

function HeroGarage(): ReactNode {
  return (
    <View style={styles.garageTile}>
      <Svg width="72" height="72" viewBox="0 0 24 24" fill="none">
        <Circle cx="5.5" cy="17" r="3.4" stroke="#fff" strokeWidth="1.8" />
        <Circle cx="18.5" cy="17" r="3.4" stroke="#fff" strokeWidth="1.8" />
        <Path
          d="M8.5 17h6l2.2-5.5H7m1.5 5.5l-2.2-5.5H4m10.2 0L16 8h2.4"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const slides: Slide[] = [
  {
    key: 'together',
    title: 'Every ride,\nbetter together.',
    description:
      'Plan trips, navigate as a group, share live location and ride safe — all in one place built for riders.',
    hero: <HeroRoutes />,
  },
  {
    key: 'navigate',
    title: 'Navigate\nwith friends.',
    description: 'See your group on the map, know where everyone is, and regroup instantly.',
    hero: <HeroGroup />,
  },
  {
    key: 'safety',
    title: 'Stay safe,\nride smart.',
    description: 'Emergency SOS, hazard alerts, and live location sharing keep you protected.',
    hero: <HeroSafety />,
  },
  {
    key: 'trips',
    title: 'Plan trips,\nnot spreadsheets.',
    description:
      'Build routes with checkpoints, vote on departure times, and keep the whole crew on the same page.',
    hero: <HeroTrips />,
  },
  {
    key: 'garage',
    title: 'Your garage,\nin your pocket.',
    description:
      'Track your bikes, log service records, and get reminders before maintenance is due.',
    hero: <HeroGarage />,
  },
];

export function WelcomeScreen(): ReactNode {
  const nav = useNavigation();
  const { width } = useWindowDimensions();
  const listRef = useRef<Animated.FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentSlide, setCurrentSlide] = useState(0);

  const isLast = currentSlide === slides.length - 1;

  function goTo(index: number): void {
    const clamped = Math.max(0, Math.min(index, slides.length - 1));
    // Animated paging scroll — the slide (hero + text) glides in.
    listRef.current?.scrollToOffset({ offset: clamped * width, animated: true });
  }

  // Tracked from onScroll (not onMomentumScrollEnd) — momentum events don't
  // fire reliably on react-native-web. React bails out on same-value updates.
  function onScrollUpdate(e: NativeSyntheticEvent<NativeScrollEvent>): void {
    setCurrentSlide(Math.round(e.nativeEvent.contentOffset.x / width));
  }

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          // JS driver: the dot width/color interpolations below aren't
          // transform/opacity, so they can't run on the native driver.
          { useNativeDriver: false, listener: onScrollUpdate },
        )}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => {
          // Parallax: hero and text drift at different speeds while swiping.
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          const heroTranslate = scrollX.interpolate({
            inputRange,
            outputRange: [width * 0.35, 0, -width * 0.35],
          });
          const textOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0, 1, 0],
          });
          return (
            <View style={[styles.slide, { width }]}>
              <Animated.View
                style={[styles.heroSection, { transform: [{ translateX: heroTranslate }] }]}
              >
                {item.hero}
              </Animated.View>
              <Animated.View style={[styles.contentSection, { opacity: textOpacity }]}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </Animated.View>
            </View>
          );
        }}
      />

      {/* Animated progress indicators — active dot stretches 6 → 22px */}
      <View style={styles.indicatorsRow}>
        {slides.map((slide, idx) => {
          const inputRange = [(idx - 1) * width, idx * width, (idx + 1) * width];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [6, 22, 6],
            extrapolate: 'clamp',
          });
          const dotColor = scrollX.interpolate({
            inputRange,
            outputRange: ['#2A2E37', '#FF5A1F', '#2A2E37'],
            extrapolate: 'clamp',
          });
          return (
            <TouchableOpacity
              key={slide.key}
              onPress={() => goTo(idx)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Slide ${idx + 1} of ${slides.length}`}
            >
              <Animated.View
                style={[styles.indicator, { width: dotWidth, backgroundColor: dotColor }]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom Buttons — Next advances the carousel; last slide starts signup */}
      <View style={styles.buttonsSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => (isLast ? nav.navigate('register') : goTo(currentSlide + 1))}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Get Started' : 'Next'}
        >
          <Text style={styles.primaryButtonText}>{isLast ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => nav.navigate('login')}>
          <Text style={styles.secondaryButtonText}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B0D',
  },
  slide: {
    flex: 1,
  },

  // Hero Section
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 280,
  },
  svgFill: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.55,
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 24,
    position: 'absolute',
    marginLeft: -18,
    marginTop: -18,
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  riderMarker: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#0A0B0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderInitial: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111',
  },
  sosBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FF453A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF453A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 12,
  },
  sosText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  checkpointChip: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(46,139,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(46,139,255,0.3)',
  },
  checkpointChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E8BFF',
  },
  garageTile: {
    width: 128,
    height: 128,
    borderRadius: 36,
    backgroundColor: '#FF5A1F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 50,
    elevation: 16,
  },

  // Content Section
  contentSection: {
    paddingHorizontal: 26,
    paddingBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F2F3F5',
    lineHeight: 35.2,
    letterSpacing: -0.96,
  },
  description: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9AA0AB',
    lineHeight: 22.5,
    marginTop: 14,
  },

  // Progress Indicators
  indicatorsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 26,
    marginVertical: 26,
  },
  indicator: {
    height: 6,
    borderRadius: 3,
  },

  // Buttons Section
  buttonsSection: {
    paddingHorizontal: 26,
    paddingBottom: 44,
  },
  primaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: '#FF5A1F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 26,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    width: '100%',
    height: 52,
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9AA0AB',
  },
});
