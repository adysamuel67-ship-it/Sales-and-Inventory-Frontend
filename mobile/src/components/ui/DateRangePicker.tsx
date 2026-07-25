import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, BORDER_RADIUS, FONT_SIZE } from '@/lib/constants'

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
]

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onSelect: (start: string, end: string) => void
  label?: string
}

export default function DateRangePicker({ startDate, endDate, onSelect, label }: DateRangePickerProps) {
  const [showModal, setShowModal] = useState(false)
  const [startInput, setStartInput] = useState(startDate)
  const [endInput, setEndInput] = useState(endDate)

  const applyPreset = (days: number) => {
    const end = new Date()
    const start = new Date()
    if (days === 0) {
      start.setHours(0, 0, 0, 0)
    } else {
      start.setDate(start.getDate() - days)
    }
    setStartInput(start.toISOString().split('T')[0])
    setEndInput(end.toISOString().split('T')[0])
  }

  const handleApply = () => {
    onSelect(startInput, endInput)
    setShowModal(false)
  }

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setShowModal(true)} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
        <Text style={styles.triggerText}>
          {label || `${startDate} — ${endDate}`}
        </Text>
        <Ionicons name="chevron-down" size={14} color={Colors.textLight} />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Date Range</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetBody} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.sectionLabel}>Quick Select</Text>
              <View style={styles.presetGrid}>
                {PRESETS.map((p) => {
                  const end = new Date()
                  const start = new Date()
                  if (p.days === 0) start.setHours(0, 0, 0, 0)
                  else start.setDate(start.getDate() - p.days)
                  const isActive = startInput === start.toISOString().split('T')[0] && endInput === end.toISOString().split('T')[0]
                  return (
                    <TouchableOpacity key={p.label} style={[styles.presetChip, isActive && styles.presetChipActive]} onPress={() => applyPreset(p.days)}>
                      <Text style={[styles.presetText, isActive && styles.presetTextActive]}>{p.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Custom Range</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.dateLabel}>Start Date</Text>
                  <TextInput style={styles.dateInput} value={startInput} onChangeText={setStartInput} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textLight} />
                </View>
                <Ionicons name="arrow-forward" size={16} color={Colors.textLight} style={{ marginTop: 20 }} />
                <View style={styles.dateField}>
                  <Text style={styles.dateLabel}>End Date</Text>
                  <TextInput style={styles.dateInput} value={endInput} onChangeText={setEndInput} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textLight} />
                </View>
              </View>

              <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primaryLight, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: Colors.primary + '30',
  },
  triggerText: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: Colors.primary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  sheetTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: Colors.text },
  sheetBody: { padding: 20 },
  sectionLabel: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: BORDER_RADIUS.full,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border,
  },
  presetChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  presetText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: Colors.textLight },
  presetTextActive: { color: '#FFF' },
  dateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dateField: { flex: 1 },
  dateLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  dateInput: {
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.text,
  },
  applyBtn: {
    backgroundColor: Colors.primary, borderRadius: BORDER_RADIUS.lg, paddingVertical: 14, alignItems: 'center', marginTop: 20,
  },
  applyBtnText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: '#FFF' },
})
