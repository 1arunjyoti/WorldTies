// src/components/Header.tsx
import React, { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

const Header: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  return (
    <header className="text-center p-4 border-b border-gray-200 dark:border-gray-700 shadow-lg relative bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <h1 
        className="text-3xl lg:text-4xl font-black bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent"
        style={{ textShadow: '0 2px 10px rgba(66, 153, 225, 0.2)' }}
      >
        Global Relationship Explorer
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Select a country to explore its diplomatic relations.</p>
      <button
        onClick={toggleTheme}
        className="absolute top-1/2 right-4 -translate-y-1/2 p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 transition-colors duration-300"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </header>
  );
};

export default Header;