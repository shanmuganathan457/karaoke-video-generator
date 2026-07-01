import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

function TabIcon({ name, label, focused, colors }: { name: any; label: string; focused: boolean, colors: ThemeColors }) {
  const tb = getStyles(colors);
  return (
    <View style={tb.item}>
      <Ionicons name={name} size={22} color={focused ? colors.primary : colors.tabBarInactive} />
      <Text style={[tb.label, focused && tb.labelActive]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const tb = getStyles(colors);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: tb.bar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="home" label="Home" focused={focused} colors={colors} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="folder" label="Projects" focused={focused} colors={colors} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={tb.createBtn}>
              <Ionicons name="add" size={28} color="#fff" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="bar-chart" label="Analytics" focused={focused} colors={colors} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="person" label="Profile" focused={focused} colors={colors} />,
        }}
      />
    </Tabs>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  bar: {
    backgroundColor: colors.tabBar,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  item: { alignItems: 'center', justifyContent: 'center', gap: 2, width: 65 },
  label: { fontSize: 10, fontWeight: '600', color: colors.tabBarInactive, textAlign: 'center' },
  labelActive: { color: colors.primary },
  createBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});
