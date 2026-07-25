import React, { useState } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { businessAPI } from '@/lib/api'
import { parseApiError } from '@/lib/utils'
import { Colors, BORDER_RADIUS, FONT_SIZE } from '@/lib/constants'
import { useAuth } from '@/lib/auth'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import AlertBadge from '@/components/ui/AlertBadge'

const ROLES = [
  { value: 'viewer', label: 'Viewer', icon: 'eye-outline' as const, color: Colors.warning },
  { value: 'cashier', label: 'Cashier', icon: 'cash-outline' as const, color: Colors.success },
  { value: 'manager', label: 'Manager', icon: 'briefcase-outline' as const, color: Colors.primary },
  { value: 'admin', label: 'Admin', icon: 'shield-checkmark-outline' as const, color: Colors.purple },
]

export default function JoinBusinessScreen() {
  const router = useRouter()
  const { currentBusiness } = useAuth()
  const [businessKey, setBusinessKey] = useState('')
  const [role, setRole] = useState('viewer')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!businessKey.trim()) { setError('Enter a business key'); return }
    if (!reason.trim()) { setError('Enter a reason for joining'); return }
    setLoading(true); setError('')
    try {
      await businessAPI.sendApproval({ business_key: businessKey.trim(), reason: reason.trim(), role })
      setSuccess(true)
    } catch (err: any) {
      setError(parseApiError(err))
    } finally { setLoading(false) }
  }

  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="paper-plane" size={40} color={Colors.primary} />
        </View>
        <Text style={styles.successTitle}>Request Sent!</Text>
        <Text style={styles.successMessage}>Your join request has been submitted. You will be notified once it is reviewed by the business admin.</Text>
        <View style={styles.successActions}>
          <Button title="Back to Home" onPress={() => router.replace('/(tabs)/dashboard')} size="lg" />
          <Button title="Submit Another" variant="outline" onPress={() => { setSuccess(false); setBusinessKey(''); setReason(''); setRole('viewer') }} size="lg" />
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Business</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {currentBusiness && (
          <Card style={styles.currentBizCard}>
            <View style={styles.currentBizRow}>
              <View style={styles.currentBizIcon}>
                <Text style={styles.currentBizInitial}>{(currentBusiness.name || '?')[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.currentBizLabel}>Current Business</Text>
                <Text style={styles.currentBizName}>{currentBusiness.name}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            </View>
          </Card>
        )}

        {error ? <AlertBadge message={error} type="error" /> : null}

        <Card style={styles.formCard}>
          <View style={styles.formIcon}>
            <Ionicons name="key-outline" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.formTitle}>Enter Business Key</Text>
          <Text style={styles.formSubtitle}>Ask the business owner for their unique key</Text>

          <Text style={styles.fieldLabel}>Business Key *</Text>
          <TextInput
            style={styles.keyInput}
            value={businessKey}
            onChangeText={setBusinessKey}
            placeholder="e.g. ABC-123-XYZ"
            placeholderTextColor={Colors.textLight}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <Text style={styles.fieldLabel}>Select Role *</Text>
          <View style={styles.roleGrid}>
            {ROLES.map((r) => (
              <TouchableOpacity key={r.value} style={[styles.roleChip, role === r.value && { backgroundColor: r.color + '20', borderColor: r.color }]} onPress={() => setRole(r.value)}>
                <Ionicons name={r.icon} size={16} color={role === r.value ? r.color : Colors.textLight} />
                <Text style={[styles.roleLabel, role === r.value && { color: r.color }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Reason *</Text>
          <TextInput
            style={[styles.textInput, styles.reasonInput]}
            value={reason}
            onChangeText={setReason}
            placeholder="Why do you want to join this business?"
            placeholderTextColor={Colors.textLight}
            multiline
            numberOfLines={3}
          />

          <View style={{ marginTop: 20 }}>
            <Button title="Submit Request" onPress={handleSubmit} loading={loading} disabled={loading} size="lg" />
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.surface },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  currentBizCard: { marginBottom: 16 },
  currentBizRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currentBizIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  currentBizInitial: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  currentBizLabel: { fontSize: FONT_SIZE.xs, color: Colors.textLight },
  currentBizName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: Colors.text },
  formCard: { alignItems: 'center' },
  formIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  formTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  formSubtitle: { fontSize: FONT_SIZE.sm, color: Colors.textLight, textAlign: 'center', marginTop: 4, marginBottom: 24 },
  fieldLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: Colors.text, marginBottom: 8, marginTop: 16, alignSelf: 'flex-start' },
  keyInput: {
    width: '100%', backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: Colors.text, letterSpacing: 2, textAlign: 'center',
  },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  roleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full, backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border,
  },
  roleLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: Colors.textLight },
  textInput: {
    width: '100%', backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.text,
  },
  reasonInput: { minHeight: 80, textAlignVertical: 'top' },
  successContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  successMessage: { fontSize: 15, color: Colors.textLight, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  successActions: { gap: 12, width: '100%' },
})
