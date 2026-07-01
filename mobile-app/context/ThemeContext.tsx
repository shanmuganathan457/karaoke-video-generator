import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textSub: string;
  border: string;
  primary: string;
  primaryLight: string;
  tabBar: string;
  tabBarInactive: string;
  iconBg: string;
  inputBg: string;
  danger: string;
  dangerLight: string;
  success: string;
  successLight: string;
  overlay: string;
  pureWhite: string;
}

export const lightColors: ThemeColors = {
  background: '#FAFBFF',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textSub: '#6B7280',
  border: '#F3F4F6',
  primary: '#7B2FBE',
  primaryLight: '#F5F0FF',
  tabBar: '#FFFFFF',
  tabBarInactive: '#9CA3AF',
  iconBg: '#F3F4F6',
  inputBg: '#FFFFFF',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  success: '#10B981',
  successLight: '#ECFDF5',
  overlay: 'rgba(0,0,0,0.5)',
  pureWhite: '#FFFFFF',
};

export const darkColors: ThemeColors = {
  background: '#0F0F13',
  card: '#1C1C23',
  text: '#FFFFFF',
  textSub: '#A1A1AA',
  border: '#2A2A35',
  primary: '#8B5CF6',
  primaryLight: 'rgba(139, 92, 246, 0.15)',
  tabBar: '#0F0F13',
  tabBarInactive: '#A1A1AA',
  iconBg: '#1C1C23',
  inputBg: '#1C1C23',
  danger: '#EF4444',
  dangerLight: 'rgba(239, 68, 68, 0.15)',
  success: '#10B981',
  successLight: 'rgba(16, 185, 129, 0.15)',
  overlay: 'rgba(0,0,0,0.7)',
  pureWhite: '#FFFFFF',
};

interface ThemeContextType {
  theme: ThemeType;
  colors: ThemeColors;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: darkColors,
  toggleTheme: () => {},
  isDark: true,
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeType>('dark'); // Default to dark as per latest updates
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('app_theme').then((savedTheme) => {
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      }
      setMounted(true);
    });
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    await AsyncStorage.setItem('app_theme', newTheme);
  };

  if (!mounted) return null;

  const colors = theme === 'light' ? lightColors : darkColors;
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
