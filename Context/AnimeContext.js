// Context/AnimeContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { Alert } from 'react-native';
import { fetchTopCharacters, fetchAnimeById } from '../screens/api/AnimeDB'; // Adjust the path as needed
import { batchProcess } from '../utils/batchRequests'; // Ensure this path is correct
import { useUser } from '../Context/UserContext'; // Import useUser to access userId

const AnimeContext = createContext();

export const AnimeProvider = ({ children }) => {
    const { userId } = useUser(); // Access userId from UserContext

    // -----------------------
    // State for All Animes
    // -----------------------
    const [allAnimes, setAllAnimes] = useState([]);
    const [allAnimeLoading, setAllAnimeLoading] = useState(false);
    const [allAnimeLoadingMore, setAllAnimeLoadingMore] = useState(false);
    const [allAnimeError, setAllAnimeError] = useState(null);
    const [allAnimePage, setAllAnimePage] = useState(1);
    const [allAnimeHasNextPage, setAllAnimeHasNextPage] = useState(true);

    // -----------------------
    // State for Last Updates
    // -----------------------
    const [lastUpdates, setLastUpdates] = useState([]);
    const [lastUpdatesLoading, setLastUpdatesLoading] = useState(false);
    const [lastUpdatesError, setLastUpdatesError] = useState(null);
    const [lastUpdatesRefreshing, setLastUpdatesRefreshing] = useState(false);

    // -----------------------
    // State for Top Rate Animes
    // -----------------------
    const [topRateAnimes, setTopRateAnimes] = useState([]);
    const [topRateLoading, setTopRateLoading] = useState(false);
    const [topRateLoadingMore, setTopRateLoadingMore] = useState(false);
    const [topRateError, setTopRateError] = useState(null);
    const [topRatePage, setTopRatePage] = useState(1);
    const [topRateHasNextPage, setTopRateHasNextPage] = useState(true);

    // -----------------------
    // State for Top Characters
    // -----------------------
    const [topCharacters, setTopCharacters] = useState([]);
    const [topCharactersLoading, setTopCharactersLoading] = useState(false);
    const [topCharactersLoadingMore, setTopCharactersLoadingMore] = useState(false);
    const [topCharactersError, setTopCharactersError] = useState(null);
    const [topCharactersPage, setTopCharactersPage] = useState(1);
    const [topCharactersHasNextPage, setTopCharactersHasNextPage] = useState(true);

    // -----------------------
    // State for Last Watch
    // -----------------------
    const [lastWatchAnimes, setLastWatchAnimes] = useState([]);
    const [lastWatchLoading, setLastWatchLoading] = useState(true);
    const [lastWatchError, setLastWatchError] = useState(null);
    const [lastWatchRefreshing, setLastWatchRefreshing] = useState(false);

    // -----------------------
    // Function to Fetch All Animes
    // -----------------------
    const fetchAllAnimes = async (pageNumber = 1) => {
        if (allAnimeLoading || allAnimeLoadingMore) return;

        if (pageNumber === 1) {
            setAllAnimeLoading(true);
        } else {
            setAllAnimeLoadingMore(true);
        }

        try {
            setAllAnimeError(null);
            const response = await axios.get(
                `http://192.168.43.44:1000/api/v2/hianime/azlist/all?page=${pageNumber}`
            );

            if (response.data.success) {
                const fetchedAnimes = response.data.data.animes;

                // Fetch details for each anime to get malId
                const detailedAnimes = await Promise.all(
                    fetchedAnimes.map(async (anime) => {
                        try {
                            const detailResponse = await axios.get(
                                `http://192.168.43.44:1000/api/v2/hianime/anime/${anime.id}`
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

                setAllAnimes((prevAnimes) =>
                    pageNumber === 1 ? validAnimes : [...prevAnimes, ...validAnimes]
                );
                setAllAnimePage(pageNumber);
                setAllAnimeHasNextPage(response.data.data.hasNextPage);
            } else {
                setAllAnimeError('Failed to fetch data.');
            }
        } catch (err) {
            console.error('Error fetching All Anime:', err);
            setAllAnimeError('An error occurred while fetching data.');
        } finally {
            if (pageNumber === 1) {
                setAllAnimeLoading(false);
            } else {
                setAllAnimeLoadingMore(false);
            }
        }
    };

    // -----------------------
    // Function to Fetch Last Updates
    // -----------------------
    const fetchLastUpdates = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setLastUpdatesRefreshing(true);
            } else {
                setLastUpdatesLoading(true);
            }
            setLastUpdatesError(null);
            const response = await axios.get(`http://192.168.43.44:1000/api/v2/hianime/category/recently-updated`);

            if (response.data.success) {
                setLastUpdates(response.data.data.animes);
            } else {
                setLastUpdatesError('Failed to fetch data.');
            }
        } catch (err) {
            console.error('Error fetching Last Updates:', err);
            setLastUpdatesError('An error occurred while fetching data.');
        } finally {
            if (isRefresh) {
                setLastUpdatesRefreshing(false);
            } else {
                setLastUpdatesLoading(false);
            }
        }
    };

    // -----------------------
    // Function to Fetch Top Rate Animes
    // -----------------------
    const fetchTopRate = async (pageNumber = 1) => {
        if (topRateLoading || topRateLoadingMore) return;

        if (pageNumber === 1) {
            setTopRateLoading(true);
        } else {
            setTopRateLoadingMore(true);
        }

        try {
            setTopRateError(null);
            const response = await axios.get(
                `http://192.168.43.44:1000/api/v2/hianime/category/most-popular`,
                {
                    params: { page: pageNumber },
                }
            );

            if (response.data.success) {
                const fetchedAnimes = response.data.data.animes;

                setTopRateAnimes((prevAnimes) =>
                    pageNumber === 1 ? fetchedAnimes : [...prevAnimes, ...fetchedAnimes]
                );
                setTopRatePage(pageNumber);
                setTopRateHasNextPage(response.data.data.hasNextPage);
            } else {
                setTopRateError('Failed to fetch data.');
            }
        } catch (err) {
            console.error('Error fetching Top Rate Animes:', err);
            setTopRateError('An error occurred while fetching data.');
        } finally {
            if (pageNumber === 1) {
                setTopRateLoading(false);
            } else {
                setTopRateLoadingMore(false);
            }
        }
    };

    // -----------------------
    // Function to Fetch Top Characters
    // -----------------------
    const fetchTopCharactersData = async (pageNumber = 1) => {
        if (topCharactersLoading || topCharactersLoadingMore) return;

        if (pageNumber === 1) {
            setTopCharactersLoading(true);
        } else {
            setTopCharactersLoadingMore(true);
        }

        try {
            setTopCharactersError(null);
            const data = await fetchTopCharacters(pageNumber);

            if (data && data.data && Array.isArray(data.data)) {
                if (data.data.length > 0) {
                    // Filter out duplicates based on mal_id
                    setTopCharacters((prevCharacters) => {
                        const newCharacters = data.data.filter(
                            (newItem) => !prevCharacters.some((existingItem) => existingItem.mal_id === newItem.mal_id)
                        );
                        return pageNumber === 1 ? newCharacters : [...prevCharacters, ...newCharacters];
                    });
                } else {
                    setTopCharactersHasNextPage(false); // No more data to load
                }
            } else {
                setTopCharactersError('Failed to fetch data.');
            }
        } catch (err) {
            console.error('Error fetching Top Characters:', err);
            setTopCharactersError('An error occurred while fetching data.');
        } finally {
            if (pageNumber === 1) {
                setTopCharactersLoading(false);
            } else {
                setTopCharactersLoadingMore(false);
            }
        }
    };

    // -----------------------
    // Function to Fetch Last Watch
    // -----------------------
    const fetchLastWatch = async () => {
        if (!userId) {
            setLastWatchAnimes([]);
            setLastWatchLoading(false);
            return;
        }

        try {
            setLastWatchLoading(true);
            setLastWatchError(null);

            const response = await axios.get(`http://192.168.43.44:3000/last-watch?userId=${userId}`);

            if (response.data && response.data.animeIds) {
                let animeIds = response.data.animeIds;

                if (animeIds.length === 0) {
                    setLastWatchAnimes([]);
                    setLastWatchLoading(false);
                    return;
                }

                animeIds = animeIds.slice().reverse(); // Reverse to show last watched first

                // Define the processing function with retry logic
                const processFn = async (animeId, retries = 3) => {
                    try {
                        const res = await fetchAnimeById(animeId);
                        const animeData = res.data;

                        return {
                            mal_id: animeData.mal_id,
                            title: animeData.title || animeData.title_english || 'No Title',
                            images: animeData.images,
                        };
                    } catch (err) {
                        if (err.response && err.response.status === 429 && retries > 0) {
                            // Wait before retrying
                            await new Promise(res => setTimeout(res, 2000)); // Wait 2 seconds
                            return processFn(animeId, retries - 1);
                        } else {
                            console.error(`Error fetching details for anime ID ${animeId}:`, err);
                            return null;
                        }
                    }
                };

                // Use batchProcess to limit concurrent requests
                const detailedAnimes = await batchProcess(animeIds, processFn, 5); // 5 concurrent requests

                const filteredAnimes = detailedAnimes.filter(anime => anime !== null);
                setLastWatchAnimes(filteredAnimes);
            } else {
                setLastWatchError('Failed to fetch data.');
            }
        } catch (err) {
            console.error('Error fetching Last Watch:', err);
            setLastWatchError('An error occurred while fetching data.');
        } finally {
            setLastWatchLoading(false);
        }
    };

    // -----------------------
    // Function to Refresh Last Watch
    // -----------------------
    const onRefreshLastWatch = async () => {
        setLastWatchRefreshing(true);
        await fetchLastWatch();
        setLastWatchRefreshing(false);
    };

    // -----------------------
    // Shared Function: Handle Anime Press
    // -----------------------
    const handleAnimePress = async (animeId, navigation) => {
        try {
            const response = await axios.get(
                `http://192.168.43.44:1000/api/v2/hianime/anime/${animeId}`
            );

            if (response.data.success) {
                const malId = response.data.data.anime.info.malId;

                if (malId) {
                    navigation.push('Anime', { malId });
                } else {
                    Alert.alert('Error', 'malId not found for this anime.');
                }
            } else {
                Alert.alert('Error', 'Failed to fetch anime details.');
            }
        } catch (err) {
            console.error('Error fetching anime details:', err);
            Alert.alert('Error', 'An error occurred while fetching anime details.');
        }
    };

    // -----------------------
    // Effects: Automatically Fetch Data on Component Mount
    // -----------------------
    useEffect(() => {
        if (allAnimes.length === 0) {
            fetchAllAnimes();
        }
    }, []);

    useEffect(() => {
        if (lastUpdates.length === 0) {
            fetchLastUpdates();
        }
    }, []);

    useEffect(() => {
        if (topRateAnimes.length === 0) {
            fetchTopRate();
        }
    }, []);

    useEffect(() => {
        if (topCharacters.length === 0) {
            fetchTopCharactersData();
        }
    }, []);

    useEffect(() => {
        fetchLastWatch();
    }, [userId]);

    return (
        <AnimeContext.Provider
            value={{
                // -----------------------
                // All Animes
                // -----------------------
                allAnimes,
                fetchAllAnimes,
                allAnimeLoading,
                allAnimeLoadingMore,
                allAnimeError,
                allAnimePage,
                allAnimeHasNextPage,

                // -----------------------
                // Last Updates
                // -----------------------
                lastUpdates,
                fetchLastUpdates,
                lastUpdatesLoading,
                lastUpdatesError,
                lastUpdatesRefreshing,

                // -----------------------
                // Top Rate Animes
                // -----------------------
                topRateAnimes,
                fetchTopRate,
                topRateLoading,
                topRateLoadingMore,
                topRateError,
                topRatePage,
                topRateHasNextPage,

                // -----------------------
                // Top Characters
                // -----------------------
                topCharacters,
                fetchTopCharactersData,
                topCharactersLoading,
                topCharactersLoadingMore,
                topCharactersError,
                topCharactersPage,
                topCharactersHasNextPage,

                // -----------------------
                // Last Watch
                // -----------------------
                lastWatchAnimes,
                fetchLastWatch,
                lastWatchLoading,
                lastWatchError,
                lastWatchRefreshing,
                onRefreshLastWatch,

                // -----------------------
                // Shared Function
                // -----------------------
                handleAnimePress,
            }}
        >
            {children}
        </AnimeContext.Provider>
    );
};

export const useAnime = () => useContext(AnimeContext);
