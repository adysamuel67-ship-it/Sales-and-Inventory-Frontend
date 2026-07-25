import React, { useState, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import BusinessBotLogo from '@/components/BusinessBotLogo'
import { Colors } from '@/lib/constants'

const { width, height } = Dimensions.get('window')

const slides = [
  {
    id: '1',
    icon: 'bar-chart' as const,
    iconColor: '#3B82F6',
    iconBg: '#EFF6FF',
    accentColor: '#2563EB',
    title: 'Track Every Sale',
    subtitle: 'Monitor your sales in real-time. Know what sells, when it sells, and who buys it.',
    emoji: '📊',
  },
  {
    id: '2',
    icon: 'cube' as const,
    iconColor: '#059669',
    iconBg: '#ECFDF5',
    accentColor: '#059669',
    title: 'Manage Inventory',
    subtitle: 'Never run out of stock. Get low-stock alerts and manage products effortlessly.',
    emoji: '📦',
  },
  {
    id: '3',
    icon: 'rocket' as const,
    iconColor: '#7C3AED',
    iconBg: '#F5F3FF',
    accentColor: '#7C3AED',
    title: 'Grow Your Business',
    subtitle: 'AI-powered insights and smart analytics to help you make better decisions.',
    emoji: '🚀',
  },
]

export default function OnboardingScreen() {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x
    const index = Math.round(offsetX / width)
    setCurrentIndex(index)
  }

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      scrollRef.current?.scrollTo({ x: width * (currentIndex + 1), animated: true })
    }
  }

  const handleGetStarted = async () => {
    await AsyncStorage.setItem('has_seen_onboarding', 'true')
    router.replace('/(auth)/login')
  }

  const handleSkip = async () => {
    await AsyncStorage.setItem('has_seen_onboarding', 'true')
    router.replace('/(auth)/login')
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {slides.map((slide, index) => (
          <View key={slide.id} style={[styles.slide, { width }]}>
            <View style={styles.topSection}>
              <View style={[styles.iconContainer, { backgroundColor: slide.iconBg }]}>
                <Ionicons name={slide.icon} size={64} color={slide.iconColor} />
              </View>
            </View>

            <View style={styles.bottomSection}>
              <View style={[styles.card, styles.elevatedCard]}>
                <View style={[styles.accentBar, { backgroundColor: slide.accentColor }]} />
                <Text style={styles.slideTitle}>{slide.title}</Text>
                <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>

                {index === slides.length - 1 && (
                  <TouchableOpacity
                    style={[styles.getStartedButton, { backgroundColor: slide.accentColor }]}
                    onPress={handleGetStarted}
                  >
                    <Text style={styles.getStartedText}>Get Started</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.logoRow}>
          <BusinessBotLogo size={32} />
          <Text style={styles.brandName}>BusinessBot</Text>
        </View>

        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex
                  ? [styles.activeDot, { backgroundColor: slides[currentIndex].accentColor }]
                  : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {currentIndex < slides.length - 1 && (
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: slides[currentIndex].accentColor }]}
            onPress={handleNext}
          >
            <Text style={styles.nextText}>Next</Text>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </TouchableOpacity>
        )}
        {currentIndex === slides.length - 1 && <View style={{ height: 52 }} />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skipButton: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  scrollContent: {
    alignItems: 'stretch',
  },
  slide: {
    flex: 1,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  iconContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
  },
  elevatedCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  accentBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  slideSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginTop: 28,
    gap: 8,
  },
  getStartedText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 48,
    paddingTop: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 28,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: Colors.border,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 14,
    gap: 6,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
