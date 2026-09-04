import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors, SHADOW } from '@/lib/constants'
import { StyleSheet, View } from 'react-native'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.neutralLight,
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
              <Ionicons name={focused ? 'home' : 'home-outline'} size={21} color={focused ? Colors.primary : color} />
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
              <Ionicons name={focused ? 'cash' : 'cash-outline'} size={21} color={focused ? Colors.primary : color} />
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
              <Ionicons name={focused ? 'cube' : 'cube-outline'} size={21} color={focused ? Colors.primary : color} />
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
              <Ionicons name={focused ? 'people' : 'people-outline'} size={21} color={focused ? Colors.primary : color} />
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
              <Ionicons name={focused ? 'menu' : 'menu-outline'} size={21} color={focused ? Colors.primary : color} />
            </View>
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    height: 62,
    ...SHADOW.lg,
    elevation: 12,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  iconWrap: {
    width: 34,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {
    backgroundColor: Colors.primaryLight,
  },
})
