// app/(tabs)/_layout.tsx (FIȘIER EXISTENT - LAYOUT PENTRU TABURI)

import { Tabs } from 'expo-router';
import React, { useContext } from 'react';
import { Platform } from 'react-native';

// Asigură-te că aceste căi sunt corecte relativ la app/(tabs)/_layout.tsx
import { HapticTab } from '@/components/HapticTab';            // Probabil '../../components/HapticTab' ?
import { IconSymbol } from '@/components/ui/IconSymbol';      // Probabil '../../components/ui/IconSymbol' ?
import TabBarBackground from '@/components/ui/TabBarBackground';// Probabil '../../components/ui/TabBarBackground' ?
import { Colors } from '@/constants/Colors';                // Probabil '../../constants/Colors' ?
import { useColorScheme } from '@/hooks/useColorScheme';      // Probabil '../../hooks/useColorScheme' ?
// În app/_layout.tsx
export const useAuth = () => { // <-- Cuvântul 'export' este ESENȚIAL
  return useContext(AuthContext);
};
export default function TabLayout() { // Poți păstra numele funcției
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: { position: 'absolute', },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index" // Asigură-te că ai fișierul app/(tabs)/index.tsx
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore" // Asigură-te că ai fișierul app/(tabs)/explore.tsx
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      {/* Alte tab-uri aici */}
    </Tabs>
  );
}