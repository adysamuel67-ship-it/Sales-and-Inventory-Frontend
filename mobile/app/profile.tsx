import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { profileAPI, businessAPI } from '@/lib/api'
import { parseApiError, formatDate, isAdminRole } from '@/lib/utils'
import { Colors } from '@/lib/constants'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import AlertBadge from '@/components/ui/AlertBadge'

export default function ProfileScreen() {
  const router = useRouter()
  const { user, currentBusiness, fetchBusinesses, logout } = useAuth()
  const isAdmin = isAdminRole(user?.business_role) || isAdminRole(user?.role)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const [bizName, setBizName] = useState('')
  const [bizMembers, setBizMembers] = useState<number | null>(null)
  const [bizKey, setBizKey] = useState('')

  const fetchData = useCallback(async () => {
    if (!user) return
    setError('')
    try {
      const res = await profileAPI.getMyProfile()
      const data = res.data
      setName(data.name || data.full_name || '')
      setPhone(data.phone || '')
      setEmail(data.email || user.email || '')

      if (currentBusiness) {
        const bizRes = await businessAPI.get(currentBusiness.business_id)
        const bizData = bizRes.data?.data || bizRes.data
        setBizName(bizData?.name || currentBusiness.name || '')
        setBizMembers(bizData?.members || currentBusiness.members || null)
        try {
          const keyRes = await businessAPI.getBusinessKey(currentBusiness.business_id)
          setBizKey(keyRes.data?.business_key || keyRes.data?.key || '')
        } catch {}
      }
    } catch {
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [user, currentBusiness])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await profileAPI.updateProfile(user.id, { name: name.trim(), phone: phone.trim() })
      setSuccess('Profile updated successfully')
      await fetchBusinesses()
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleCopyKey = () => {
    if (bizKey) {
      Alert.alert('Business Key', bizKey)
    }
  }

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/(auth)/login') },
      },
    ])
  }

  if (loading) return <LoadingSpinner fullScreen message="Loading profile..." />

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <AlertBadge message={error} type="error" /> : null}
        {success ? <AlertBadge message={success} type="success" /> : null}

        <Card style={styles.card}>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(name || user?.email || '?')[0]?.toUpperCase()}</Text>
            </View>
            <Text style={styles.userName}>{name || 'User'}</Text>
            <Text style={styles.userEmail}>{email}</Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor={Colors.textLight}
          />
          <Text style={styles.fieldLabel}>Email</Text>
          <View style={[styles.textInput, { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt }]}>
            <Text style={{ flex: 1, color: Colors.textLight, fontSize: 16 }}>{email}</Text>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
          </View>
          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={styles.textInput}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            placeholderTextColor={Colors.textLight}
            keyboardType="phone-pad"
          />
          <Text style={styles.fieldLabel}>Role</Text>
          <View style={[styles.textInput, { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt }]}>
            <Text style={{ flex: 1, color: Colors.text, fontSize: 16, textTransform: 'capitalize' }}>
              {user?.business_role || user?.role || 'member'}
            </Text>
          </View>
          <Text style={styles.fieldLabel}>Member Since</Text>
          <Text style={styles.infoValue}>{user?.created_at ? formatDate(user.created_at) : 'N/A'}</Text>

          <View style={{ marginTop: 20 }}>
            <Button title="Save Changes" onPress={handleSave} loading={saving} disabled={saving} size="lg" />
          </View>
        </Card>

        {currentBusiness && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Business</Text>
            <Text style={styles.fieldLabel}>Name</Text>
            <Text style={styles.infoValue}>{bizName || 'N/A'}</Text>
            {bizMembers !== null && (
              <>
                <Text style={styles.fieldLabel}>Team Members</Text>
                <Text style={styles.infoValue}>{bizMembers}</Text>
              </>
            )}
            {bizKey ? (
              <>
                <Text style={styles.fieldLabel}>Business Key</Text>
                <View style={styles.keyRow}>
                  <Text style={styles.keyValue}>{bizKey}</Text>
                  <TouchableOpacity onPress={handleCopyKey} style={styles.copyBtn}>
                    <Ionicons name="copy-outline" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </Card>
        )}

        {isAdmin && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Admin Tools</Text>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push('/admin')}
            >
              <Ionicons name="shield-checkmark-outline" size={22} color={Colors.primary} />
              <Text style={styles.menuLabel}>Admin Panel</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          </Card>
        )}

        <Card style={[styles.card, { borderColor: Colors.danger, borderWidth: 1 }]}>
          <Text style={[styles.sectionTitle, { color: Colors.danger }]}>Account</Text>
          <TouchableOpacity style={styles.menuRow} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
            <Text style={[styles.menuLabel, { color: Colors.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.surface,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  content: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 16, padding: 16 },
  avatarSection: { alignItems: 'center', paddingVertical: 12 },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: Colors.primary },
  userName: { fontSize: 18, fontWeight: '700', color: Colors.text },
  userEmail: { fontSize: 14, color: Colors.textLight, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  textInput: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: Colors.text, marginBottom: 16,
  },
  infoValue: { fontSize: 15, color: Colors.text, marginBottom: 12 },
  keyRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt,
    borderRadius: 10, padding: 10, marginBottom: 12,
  },
  keyValue: { flex: 1, fontSize: 13, color: Colors.text, fontFamily: 'monospace' },
  copyBtn: { padding: 4 },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  menuLabel: { flex: 1, fontSize: 16, color: Colors.text, fontWeight: '500' },
})
