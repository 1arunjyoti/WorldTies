// src/contexts/ThemeContext.tsx

import React, { createContext, useState, useEffect, useMemo, type ReactNode } from 'react';

// Define the shape of the context data
type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// Create the context with a default value.
// The toggleTheme function is a no-op by default to prevent errors
// if a component accidentally renders outside the provider.
export const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => console.warn('toggleTheme was called outside of ThemeProvider'),
});

// Create the Provider component which will wrap our application
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State to hold the current theme.
  // The initial state is determined by the same logic as our inline script,
  // ensuring React's state is in sync with the DOM from the very start.
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // The function to toggle between light and dark themes
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Effect to apply changes whenever the theme state changes
  useEffect(() => {
    const root = window.document.documentElement;

    // Remove the old theme class and add the new one
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    // Save the user's preference to localStorage for future visits
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Memoize the context value to prevent unnecessary re-renders of consuming components.
  // The value object is only recreated when the `theme` state changes.
  const value = useMemo(() => ({ theme, toggleTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};