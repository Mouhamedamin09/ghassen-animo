// Context/UserContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  // Existing User States
  const colorScheme = Appearance.getColorScheme(); // 'light' or 'dark'
  const [userId, setUserId] = useState(null); // Default userId is null
  const [userName, setUserName] = useState('Guest');
  const [avatar, setAvatar] = useState(null);
  const [theme, setTheme] = useState('dark'); // Default to 'dark'
  const [notifications, setNotifications] = useState({
    dailyQuiz: true,
    newComments: true,
  });

  // New Anime States
  const [animes, setAnimes] = useState([]);
  const [animeLoading, setAnimeLoading] = useState(false);
  const [animeLoadingMore, setAnimeLoadingMore] = useState(false);
  const [animeError, setAnimeError] = useState(null);
  const [animePage, setAnimePage] = useState(1);
  const [animeHasNextPage, setAnimeHasNextPage] = useState(true);

  // Assuming authToken is part of UserContext
  const [authToken, setAuthToken] = useState(null); // Initialize as needed

  // Load theme from AsyncStorage on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('@user_theme');
        if (storedTheme !== null) {
          setTheme(storedTheme);
        } else {
          // If no theme is stored, use the system preference
          setTheme(colorScheme || 'dark');
        }
      } catch (e) {
        console.error('Failed to load theme.', e);
      }
    };

    loadTheme();
  }, [colorScheme]);

  // Save theme to AsyncStorage whenever it changes
  useEffect(() => {
    const saveTheme = async () => {
      try {
        await AsyncStorage.setItem('@user_theme', theme);
      } catch (e) {
        console.error('Failed to save theme.', e);
      }
    };

    saveTheme();
  }, [theme]);

  // Function to fetch anime data
  const fetchAnimes = async (pageNumber = 1) => {
    if (animeLoading || animeLoadingMore) return;

    if (pageNumber === 1) {
      setAnimeLoading(true);
    } else {
      setAnimeLoadingMore(true);
    }

    try {
      setAnimeError(null);
      const response = await axios.get(
        `http://192.168.43.44:1000/api/v2/hianime/azlist/all?page=${pageNumber}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`, // Ensure authToken is set
          },
        }
      );

      if (response.data.success) {
        const fetchedAnimes = response.data.data.animes;

        // Fetch details for each anime to get malId
        const detailedAnimes = await Promise.all(
          fetchedAnimes.map(async (anime) => {
            try {
              const detailResponse = await axios.get(
                `http://192.168.43.44:1000/api/v2/hianime/anime/${anime.id}`,
                {
                  headers: {
                    Authorization: `Bearer ${authToken}`,
                  },
                }
              );

              if (detailResponse.data.success) {
                const malId = detailResponse.data.data.anime.info.malId;
                if (malId) {
                  return { ...anime, malId };
                }
              }
              return null;
            } catch (err) {
              console.error(`Error fetching details for anime ${anime.id}:`, err);
              return null;
            }
          })
        );

        // Filter out animes without malId
        const validAnimes = detailedAnimes.filter((anime) => anime !== null);

        setAnimes((prevAnimes) =>
          pageNumber === 1 ? validAnimes : [...prevAnimes, ...validAnimes]
        );
        setAnimePage(pageNumber);
        setAnimeHasNextPage(response.data.data.hasNextPage);
      } else {
        setAnimeError('Failed to fetch data.');
      }
    } catch (err) {
      console.error('Error fetching All Anime:', err);
      setAnimeError('An error occurred while fetching data.');
    } finally {
      if (pageNumber === 1) {
        setAnimeLoading(false);
      } else {
        setAnimeLoadingMore(false);
      }
    }
  };

  // Function to handle anime press (navigation logic)
  const handleAnimePress = async (animeId, navigation) => {
    try {
      const response = await axios.get(
        `http://192.168.43.44:1000/api/v2/hianime/anime/${animeId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`, // Ensure authToken is set
          },
        }
      );

      if (response.data.success) {
        const malId = response.data.data.anime.info.malId;

        if (malId) {
          navigation.push('Anime', { malId });
        } else {
          // Remove the anime from the list if malId is not found
          setAnimes((prevAnimes) => prevAnimes.filter((anime) => anime.id !== animeId));
          Alert.alert('Error', 'malId not found for this anime and it has been removed from the list.');
        }
      } else {
        Alert.alert('Error', 'Failed to fetch anime details.');
      }
    } catch (err) {
      console.error('Error fetching anime details:', err);
      Alert.alert('Error', 'An error occurred while fetching anime details.');
    }
  };

  // Optionally, you can fetch anime data on context mount
  useEffect(() => {
    if (animes.length === 0) {
      fetchAnimes();
    }
  }, []);

  return (
    <UserContext.Provider
      value={{
        // Existing User States and Setters
        userId,
        setUserId,
        userName,
        setUserName,
        avatar,
        setAvatar,
        theme,
        setTheme,
        notifications,
        setNotifications,
        authToken,
        setAuthToken,

        // New Anime States and Functions
        animes,
        fetchAnimes,
        animeLoading,
        animeLoadingMore,
        animeError,
        animePage,
        animeHasNextPage,
        handleAnimePress,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
