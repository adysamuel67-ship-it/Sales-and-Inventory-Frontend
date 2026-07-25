import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, SPACING, BORDER_RADIUS, FONT_SIZE } from '@/lib/constants'
import { cronAPI } from '@/lib/api'

interface Job {
  key: string
  label: string
  icon: 'mail' | 'calendar' | 'bar-chart'
  description: string
  lastRun?: string
  status?: 'idle' | 'running' | 'success' | 'error'
}

const JOBS: Job[] = [
  {
    key: 'daily_summery',
    label: 'Daily Summary',
    icon: 'mail',
    description: 'Sends daily business summary emails to all active business owners/admins.',
    lastRun: undefined,
    status: 'idle',
  },
  {
    key: 'weekly_summery',
    label: 'Weekly Summary',
    icon: 'calendar',
    description: 'Sends weekly business summary emails with aggregated data.',
    lastRun: undefined,
    status: 'idle',
  },
  {
    key: 'monthly_summery',
    label: 'Monthly Summary',
    icon: 'bar-chart',
    description: 'Sends monthly business summary emails with full analytics.',
    lastRun: undefined,
    status: 'idle',
  },
]

export default function AdminJobsScreen() {
  const [jobs, setJobs] = useState<Job[]>(JOBS)
  const [triggering, setTriggering] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [])

  const handleTrigger = (jobKey: string) => {
    const job = jobs.find((j) => j.key === jobKey)
    Alert.alert(
      'Trigger Job',
      `Run "${job?.label}" now? This will send summary emails to all businesses.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Trigger',
          onPress: async () => {
            setTriggering(jobKey)
            setJobs((prev) =>
              prev.map((j) => (j.key === jobKey ? { ...j, status: 'running' as const } : j))
            )
            try {
              await triggerJobApi(jobKey)
              setJobs((prev) =>
                prev.map((j) =>
                  j.key === jobKey
                    ? { ...j, status: 'success' as const, lastRun: new Date().toLocaleString() }
                    : j
                )
              )
              Alert.alert('Success', `${job?.label} triggered successfully`)
            } catch {
              setJobs((prev) =>
                prev.map((j) => (j.key === jobKey ? { ...j, status: 'error' as const } : j))
              )
              Alert.alert('Error', 'Failed to trigger job')
            } finally {
              setTriggering(null)
              if (timeoutRef.current) clearTimeout(timeoutRef.current)
              timeoutRef.current = setTimeout(() => {
                setJobs((prev) =>
                  prev.map((j) => (j.key === jobKey && j.status !== 'error' ? { ...j, status: 'idle' as const } : j))
                )
              }, 3000)
            }
          },
        },
      ]
    )
  }

  const triggerJobApi = async (jobKey: string) => {
    await cronAPI.triggerJob(jobKey)
  }

  const renderItem = ({ item }: { item: Job }) => {
    const statusColor =
      item.status === 'running'
        ? Colors.warning
        : item.status === 'success'
          ? Colors.success
          : item.status === 'error'
            ? Colors.danger
            : Colors.textLight

    const statusLabel =
      item.status === 'running'
        ? 'Running...'
        : item.status === 'success'
          ? 'Completed'
          : item.status === 'error'
            ? 'Failed'
            : 'Idle'

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.iconContainer, { backgroundColor: Colors.primaryLight }]}>
            <Ionicons name={item.icon} size={22} color={Colors.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.label}</Text>
            <Text style={styles.cardDesc}>{item.description}</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          {item.lastRun && (
            <Text style={styles.lastRun}>Last: {item.lastRun}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.triggerBtn,
            (item.status === 'running' || triggering === item.key) && { opacity: 0.5 },
          ]}
          onPress={() => handleTrigger(item.key)}
          disabled={item.status === 'running' || triggering === item.key}
        >
          <Ionicons
            name={item.status === 'running' ? 'hourglass' : 'play'}
            size={16}
            color="#FFF"
          />
          <Text style={styles.triggerBtnText}>
            {item.status === 'running' ? 'Running...' : 'Trigger Now'}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.count}>{jobs.length} scheduled job{jobs.length !== 1 ? 's' : ''}</Text>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No Jobs</Text>
            <Text style={styles.emptySubtitle}>No scheduled jobs available</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  count: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.sm, fontSize: FONT_SIZE.xs, color: Colors.textLight },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  cardTop: { flexDirection: 'row', marginBottom: SPACING.md },
  iconContainer: {
    width: 44, height: 44, borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: Colors.text },
  cardDesc: { fontSize: FONT_SIZE.sm, color: Colors.textLight, marginTop: 4, lineHeight: 18 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: '600' },
  lastRun: { fontSize: FONT_SIZE.xs, color: Colors.textLight },
  triggerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md,
  },
  triggerBtnText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: '#FFF' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: Colors.text, marginTop: SPACING.md },
  emptySubtitle: { fontSize: FONT_SIZE.sm, color: Colors.textLight, marginTop: SPACING.xs },
})
