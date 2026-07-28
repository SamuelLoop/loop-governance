import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../theme/tokens';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = { Chat: '💬', Power: '⚡', Profile: '👤' };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>{icons[label] ?? label}</Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bg.elevated, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.tier.gold,
        tabBarInactiveTintColor: colors.text.muted,
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused }) => <TabIcon label="Chat" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="power"
        options={{
          title: 'Power',
          tabBarIcon: ({ focused }) => <TabIcon label="Power" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon label="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
