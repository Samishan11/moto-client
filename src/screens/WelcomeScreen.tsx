import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { Button } from '../components/ui';
import { useNavigation } from '../navigation/Navigator';
import { colors, spacing } from '../theme';

const slides = [
  {
    title: 'Every ride,\nbetter together.',
    description:
      'Plan trips, navigate as a group, share live location and ride safe — all in one place built for riders.',
  },
  {
    title: 'Navigate\nwith friends.',
    description: 'See your group on the map, know where everyone is, and regroup instantly.',
  },
  {
    title: 'Stay safe,\nride smart.',
    description: 'Emergency SOS, hazard alerts, and live location sharing keep you protected.',
  },
];

export function WelcomeScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slide = slides[currentSlide];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      nav.navigate('login');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={false}
      >
        {/* Hero Section with SVG visualization */}
        <View style={styles.heroSection}>
          {/* SVG Route Paths */}
          <Svg height="100%" width="100%" style={styles.svgContainer}>
            {/* Orange route path */}
            <Path
              d="M-20 500 C90 420 120 300 260 300 S380 180 440 60"
              stroke="#FF5A1F"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            {/* Blue secondary path */}
            <Path
              d="M-20 620 C120 560 160 460 300 470 S420 380 460 320"
              stroke="#2E8BFF"
              strokeWidth="2.5"
              fill="none"
              opacity="0.6"
              strokeLinecap="round"
            />
          </Svg>

          {/* Location marker (teardrop) */}
          <View style={styles.accentDot} />
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Main Title */}
          <Text style={styles.title}>{slide.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{slide.description}</Text>

          {/* Progress Indicators */}
          <View style={styles.indicatorsRow}>
            {slides.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.indicator,
                  idx === currentSlide ? styles.indicatorActive : styles.indicatorInactive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Bottom Buttons */}
        <View style={styles.buttonsSection}>
          <Button
            title={currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
            onPress={handleNext}
          />
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => nav.navigate('login')}
          >
            <Text style={styles.secondaryButtonText}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B0D',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    display: 'flex',
    flexDirection: 'column',
  },
  // Hero Section with radial gradient background
  heroSection: {
    flex: 1,
    backgroundColor: '#0A0B0D',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 280,
  },
  heroBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#0A0B0D',
  },
  svgContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.55,
  },
  accentDot: {
    width: 36,
    height: 36,
    borderRadius: 24,
    backgroundColor: '#FF5A1F',
    position: 'absolute',
    left: '52%',
    top: '44%',
    marginLeft: -18,
    marginTop: -18,
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },

  // Content Section
  contentSection: {
    paddingHorizontal: 26,
    paddingBottom: 44,
    paddingTop: 0,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F2F3F5',
    lineHeight: 35.2,
    marginBottom: 0,
    letterSpacing: -0.96,
  },
  description: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9AA0AB',
    lineHeight: 22.5,
    marginTop: 14,
    marginBottom: 26,
  },

  // Progress Indicators - EXACT VALUES
  indicatorsRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 26,
  },
  indicator: {
    height: 6,
    borderRadius: 3,
  },
  indicatorActive: {
    width: 22,
    backgroundColor: '#FF5A1F',
  },
  indicatorInactive: {
    width: 6,
    backgroundColor: '#2A2E37',
  },

  // Buttons Section
  buttonsSection: {
    paddingHorizontal: 26,
    paddingBottom: 44,
    gap: 0,
  },

  // Secondary Button
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
