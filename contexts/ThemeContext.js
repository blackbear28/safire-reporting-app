import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('darkMode');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'true');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const toggleDarkMode = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      await AsyncStorage.setItem('darkMode', newMode.toString());
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const colors = {
    background: isDarkMode ? '#000' : '#fff',
    surface: isDarkMode ? '#1a1a1a' : '#fff',
    card: isDarkMode ? '#2a2a2a' : '#f0f4ff',
    text: isDarkMode ? '#fff' : '#000',
    textSecondary: isDarkMode ? '#b0b0b0' : '#666',
    border: isDarkMode ? '#3a3a3a' : '#e0e0e0',
    primary: '#2667ff',
    error: '#ff6b6b',
    success: '#4CAF50',
    warning: '#ffc107',
    inputBackground: isDarkMode ? '#2a2a2a' : '#f5f5f5',
    inputBorder: isDarkMode ? '#3a3a3a' : '#ddd',
    placeholder: isDarkMode ? '#666' : '#999',
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
