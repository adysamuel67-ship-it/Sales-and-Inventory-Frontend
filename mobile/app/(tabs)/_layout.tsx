import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors, FONTS } from '@/lib/constants'
import { StyleSheet, View } from 'react-native'

// Mirrors the web app's navy sidebar styling on a bottom tab bar:
// deep navy (#14213D) shell, muted inactive icons, blue active pill + white icon.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#8FA0BF',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconActive]}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={21} color={focused ? '#FFFFFF' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Sales',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconActive]}>
              <Ionicons name={focused ? 'cash' : 'cash-outline'} size={21} color={focused ? '#FFFFFF' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconActive]}>
              <Ionicons name={focused ? 'cube' : 'cube-outline'} size={21} color={focused ? '#FFFFFF' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconActive]}>
              <Ionicons name={focused ? 'people' : 'people-outline'} size={21} color={focused ? '#FFFFFF' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconActive]}>
              <Ionicons name={focused ? 'menu' : 'menu-outline'} size={21} color={focused ? '#FFFFFF' : color} />
            </View>
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.navy,
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    height: 64,
    elevation: 12,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: FONTS.semibold,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  iconWrap: {
    width: 34,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {
    backgroundColor: Colors.primary,
  },
})