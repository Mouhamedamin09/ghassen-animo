// App.js

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import AppNavigation from './navigation/AppNavigation';
import { UserProvider } from './Context/UserContext';
import { AnimeProvider } from './Context/AnimeContext'; // Import AnimeProvider

export default function App() {
  return (
    <UserProvider>
      <AnimeProvider>
        <AppNavigation />
      </AnimeProvider>
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
