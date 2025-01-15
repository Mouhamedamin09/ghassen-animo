// AnimeScreen.js

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
  Animated,
  Image,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import {
  useNavigation,
  useRoute,
  useFocusEffect
} from '@react-navigation/native'; // useFocusEffect for re-fetch
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import axios from 'axios';

import {
  ChevronLeftIcon,
  StarIcon,
  ClockIcon,
  EyeIcon,
  PlayIcon,
  PlusIcon,
  XMarkIcon,
  ChatBubbleLeftIcon,
  BookmarkIcon,
  CheckCircleIcon,
  XCircleIcon
} from 'react-native-heroicons/outline';

import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Loading from './loading';
import { fetchAnimeById, fetchAnimeCharecters } from './api/AnimeDB';
import Cast from '../components/cast';
import { useUser } from '../Context/UserContext';

const { width, height } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const topMargin = isIOS ? 20 : 25;

const STATUS_OPTIONS = [
  { label: 'Want to Watch', value: 'want_to_watch' },
  { label: 'Watching Now', value: 'watching_now' },
  { label: 'Done Watching', value: 'done_watching' },
  { label: 'Complete it Later', value: 'complete_later' },
  { label: "I Don't Want to Complete It", value: 'dont_want' }
];

// Define the icon mapping
const STATUS_ICON_MAPPING = {
  want_to_watch: <EyeIcon size={20} color="#ffffff" />,
  watching_now: <BookmarkIcon size={20} color="#ffffff" />,
  done_watching: <CheckCircleIcon size={20} color="#ffffff" />,
  complete_later: <ClockIcon size={20} color="#ffffff" />,
  dont_want: <XCircleIcon size={20} color="#ffffff" />
};

export default function AnimeScreen() {
  const { params: item } = useRoute();
  const navigation = useNavigation();
  const { userId } = useUser();

  // Basic states
  const [animeDetails, setAnimeDetails] = useState(null);
  const [cast, setCast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(false);

  // New State for Related Seasons
  const [relatedSeasons, setRelatedSeasons] = useState([]);

  // UI states
  const [activeTab, setActiveTab] = useState('Description');
  const [showAll, setShowAll] = useState(false);

  // "My List" feature
  const [myListStatus, setMyListStatus] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Watched-episodes map
  const [watchedEpisodesMap, setWatchedEpisodesMap] = useState({});

  // Derive the current MAL ID from either item.mal_id or item.malId
  const currentMalId = item?.mal_id ?? item?.malId;

  // Favorite animation (optional)
  const [heartScale] = useState(new Animated.Value(1));

  // Local server (HiAnime) episodes
  const [localEpisodes, setLocalEpisodes] = useState([]);
  const [slugFetching, setSlugFetching] = useState(false);

  // **NEW**: Separate loader for the Watch tab
  const [isEpisodesLoading, setIsEpisodesLoading] = useState(false);

  // Loader state for episode selection
  const [isEpisodeLoading, setIsEpisodeLoading] = useState(false);

  // Subtitle selection modal state
  const [isSubtitleModalVisible, setIsSubtitleModalVisible] = useState(false);
  const [availableSubtitles, setAvailableSubtitles] = useState([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState(null);

  // Current HLS Source
  const [currentHlsSource, setCurrentHlsSource] = useState(null);

  // **NEW**: Episode order preference (asc/desc)
  const [episodesOrder, setEpisodesOrder] = useState('asc');

  // Key for watched episodes
  const animeIdKey = String(currentMalId || 'invalid');

  // **NEW**: Key for cached episodes
  const EPISODES_KEY = `EPISODES_${animeIdKey}`;

  // -----------------------------------------------------------
  // useFocusEffect => re-run fetches every time screen is focused
  // -----------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      if (currentMalId) {
        fetchData(currentMalId);
      } else {
        setLoading(false);
        console.log('No valid MAL ID found, cannot fetch data.');
      }
    }, [currentMalId])
  );

  // Once we have animeDetails, also fetch local episodes
  useEffect(() => {
    if (animeDetails?.title_english) {
      fetchLocalEpisodes(animeDetails.title_english);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animeDetails]);

  // Load from AsyncStorage and MyList once
  useEffect(() => {
    fetchMyListStatus();
    fetchUserWatchedEpisodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If animeDetails changes, fetch related seasons
  useEffect(() => {
    if (animeDetails?.mal_id) {
      fetchRelatedSeasons(animeDetails.mal_id);
    }
  }, [animeDetails]);

  // -----------------------------------------------------------
  // 1) FETCH ANIME DETAILS
  // -----------------------------------------------------------
  const fetchData = async (malId) => {
    console.log('Fetching data for MAL ID:', malId);
    setLoading(true);
    setRetry(false);

    try {
      // Attempt fetching from local "item" if it matches the malId
      const displayItem =
        item?.approved && item?.mal_id === malId
          ? item
          : // Otherwise fetch from the API
            await fetchAnimeById(malId).then((res) => res.data);

      setAnimeDetails(displayItem);

      // fetch cast
      const characterData = await fetchAnimeCharecters(displayItem.mal_id);
      if (characterData && characterData.data) {
        setCast(characterData.data);
      }
    } catch (error) {
      // If it's 404 or 429, silently ignore logging & alert
      if (
        error?.response &&
        [404, 429].includes(error.response.status)
      ) {
        // No log / No alert
      } else {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to fetch anime details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------
  // Sleep helper (for potential 429 retry logic, if needed)
  // -----------------------------------------------------------
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // -----------------------------------------------------------
  // 1.1) FETCH RELATED SEASONS
  // -----------------------------------------------------------
  async function fetchRelatedSeasons() {
    try {
      const response = await axios.get(
        `https://api.jikan.moe/v4/anime/${animeDetails.mal_id}/relations`
      );

      if (!response.data || !response.data.data) {
        setRelatedSeasons([]);
        return;
      }

      // Flatten all relations
      const allRelations = response.data.data.flatMap(
        (relation) => relation.entry
      );

      // Filter out duplicates + the current anime
      const uniqueRelations = allRelations.filter(
        (entry, index, self) =>
          index === self.findIndex((t) => t.mal_id === entry.mal_id) &&
          entry.mal_id !== animeDetails.mal_id
      );

      // We’ll fetch each anime detail in small chunks
      const chunkSize = 3;
      let allFetchedResults = [];

      for (let i = 0; i < uniqueRelations.length; i += chunkSize) {
        const chunk = uniqueRelations.slice(i, i + chunkSize);

        // For each chunk, do concurrent requests
        const chunkPromises = chunk.map((anime) =>
          axios
            .get(`https://api.jikan.moe/v4/anime/${anime.mal_id}`)
            .then((res) => res.data.data)
            .catch((err) => {
              // If 404 or 429 => ignore silently
              if (
                err?.response &&
                [404, 429].includes(err.response.status)
              ) {
                return null;
              }
              // Otherwise log
              console.error(
                `Error fetching details for mal_id ${anime.mal_id}:`,
                err
              );
              return null;
            })
        );

        // Wait for chunk to finish
        const chunkResults = await Promise.all(chunkPromises);
        // Store valid results
        allFetchedResults = allFetchedResults.concat(
          chunkResults.filter((r) => r !== null)
        );

        // Optional: Add a delay if you want to avoid 429
        // if (i + chunkSize < uniqueRelations.length) {
        //   await sleep(1000);
        // }
      }

      // Map final results to your needed structure
      const relatedSeasonsData = allFetchedResults.map((item) => ({
        mal_id: item.mal_id,
        title: item.title,
        image_url: item.images?.jpg?.image_url || ''
      }));

      setRelatedSeasons(relatedSeasonsData);
    } catch (error) {
      if (
        error?.response &&
        [404, 429].includes(error.response.status)
      ) {
        // silently ignore
      } else {
        console.error('Error fetching related seasons:', error);
      }
    }
  }

  // -----------------------------------------------------------
  // 2) FETCH EPISODES FROM YOUR LOCAL SERVER (/fetchEpisodes)
  // -----------------------------------------------------------
  const fetchLocalEpisodes = async (animeTitle) => {
    if (!currentMalId) return;
    setIsEpisodesLoading(true); // show watch loader

    try {
      // **NEW**: Try to load episodes from AsyncStorage first
      const cachedEpisodes = await AsyncStorage.getItem(EPISODES_KEY);
      if (cachedEpisodes !== null) {
        console.log('Loading episodes from cache');
        setLocalEpisodes(JSON.parse(cachedEpisodes));
      } else {
        console.log('Fetching episodes from server');
        setSlugFetching(true);

        const response = await axios.get(
          `http://192.168.43.44:3000/fetchEpisodes?name=${encodeURIComponent(
            animeTitle
          )}&mal_id=${currentMalId}`
        );

        if (response.data.success) {
          const episodesData = response.data.data.episodes || [];
          setLocalEpisodes(episodesData);

          // **NEW**: Save episodes to AsyncStorage
          await AsyncStorage.setItem(EPISODES_KEY, JSON.stringify(episodesData));
        } else {
          console.warn('Local server returned success=false for /fetchEpisodes');
        }
      }
    } catch (error) {
      // If 404 or 429 => ignore silently
      if (
        error?.response &&
        [404, 429].includes(error.response.status)
      ) {
        // do nothing
      } else {
        console.error('Error fetching local episodes:', error);
      }
    } finally {
      setSlugFetching(false);
      setIsEpisodesLoading(false); // hide watch loader
    }
  };

  // -----------------------------------------------------------
  // 3) LOAD & SAVE WATCHED EPISODES (PER ANIME)
  // -----------------------------------------------------------

  const saveWatchedEpisodesMap = async (updatedMap) => {
    try {
      await AsyncStorage.setItem('ANIME_WATCHED_MAP', JSON.stringify(updatedMap));
    } catch (err) {
      console.error('Failed to save watched episodes map:', err);
    }
  };

  // For the local UI, see if we have any for this anime
  const getLocalWatchedSet = () => {
    return new Set(watchedEpisodesMap[animeIdKey] || []);
  };

  // -----------------------------------------------------------
  // 4) FETCH USER’S WATCHED EPISODES FROM YOUR SERVER (OPTIONAL)
  // -----------------------------------------------------------
  const fetchUserWatchedEpisodes = async () => {
    if (!userId) return; // If user is not logged in, skip
    try {
      const response = await axios.get(
        `http://192.168.43.44:3000/data?userId=${userId}`
      );
      const { userData } = response.data;
      if (userData?.watchedEpisodes) {
        /**
         * userData.watchedEpisodes = [
         *   { animeId: '12345', episodes: [1,2,3] },
         *   { animeId: '67890', episodes: [1,2] }
         * ]
         */
        const serverMap = {};
        userData.watchedEpisodes.forEach((entry) => {
          serverMap[entry.animeId] = entry.episodes || [];
        });

        // Merge server data with local data
        setWatchedEpisodesMap((prevMap) => {
          const merged = { ...prevMap };
          Object.keys(serverMap).forEach((id) => {
            const serverEpisodes = new Set(serverMap[id]);
            const localEpisodes = new Set(merged[id] || []);
            const combined = new Set([...serverEpisodes, ...localEpisodes]);
            merged[id] = Array.from(combined);
          });
          saveWatchedEpisodesMap(merged);
          return merged;
        });
      }
    } catch (err) {
      console.error('Failed to fetch user’s watched episodes:', err);
    }
  };

  // -----------------------------------------------------------
  // 5) HANDLE EPISODE CLICK => GET STREAM => MARK AS WATCHED
  // -----------------------------------------------------------
  const handleEpisodePress = async (episodeItem) => {
    const episodeNumber = episodeItem.number;
    const episodeId = episodeItem.episodeId;

    setIsEpisodeLoading(true); // Show loader

    try {
      // (a) If user is logged in, update “watched” on your server
      if (userId) {
        await axios.post('http://192.168.43.44:3000/watched', {
          userId,
          animeId: currentMalId,
          episodeNumber
        });
      }

      // (b) Update local watched map
      setWatchedEpisodesMap((prevMap) => {
        const updated = { ...prevMap };
        const currentList = new Set(updated[animeIdKey] || []);
        currentList.add(episodeNumber);
        updated[animeIdKey] = Array.from(currentList);
        saveWatchedEpisodesMap(updated);
        return updated;
      });

      // (c) fetch servers from /fetchEpisode?episodeId=...
      const serverRes = await axios.get(
        `http://192.168.43.44:3000/fetchEpisode?episodeId=${encodeURIComponent(
          episodeId
        )}`
      );

      if (!serverRes.data.success) {
        Alert.alert('Error', 'Failed to fetch servers for this episode.');
        setIsEpisodeLoading(false);
        return;
      }

      const serversData = serverRes.data.data;
      const hlsSource = serversData.sources[0]?.url;
      if (!hlsSource) {
        Alert.alert('Error', 'No HLS source found');
        setIsEpisodeLoading(false);
        return;
      }

      // Extract caption tracks (kind: 'captions')
      const captionTracks = serversData.tracks.filter(
        (track) => track.kind === 'captions'
      );

      if (!captionTracks.length) {
        Alert.alert('No Subtitles', 'No subtitles available for this episode.');
        setIsEpisodeLoading(false);
        return;
      }

      // Prepare available subtitles
      const subtitles = captionTracks.map((track, index) => ({
        id: index.toString(),
        label: track.label,
        file: track.file
      }));

      setAvailableSubtitles(subtitles);
      setCurrentHlsSource(hlsSource); // Set the HLS source in state

      if (subtitles.length === 1) {
        // If only one subtitle is available, proceed directly
        openVideoWithStreamScreen(hlsSource, subtitles[0].file);
      } else {
        // Show subtitle selection modal
        setIsSubtitleModalVisible(true);
      }
    } catch (err) {
      // If 404 or 429 => ignore silently
      if (
        err?.response &&
        [404, 429].includes(err.response.status)
      ) {
        // no alert, just ignore
      } else {
        console.error('Error in handleEpisodePress:', err);
        Alert.alert('Error', 'Failed to fetch episode sources');
      }
    } finally {
      setIsEpisodeLoading(false); // Hide loader
    }
  };

  // -----------------------------------------------------------
  // 6) OPEN VIDEO + SUBTITLES IN STREAM SCREEN
  // -----------------------------------------------------------
  const openVideoWithStreamScreen = (videoUrl, subtitleUrl) => {
    try {
      if (!videoUrl || !subtitleUrl) {
        Alert.alert('Error', 'Video URL or Subtitle URL is missing.');
        return;
      }
      // Navigate to the StreamScreen with the provided URLs
      navigation.navigate('Stream', { videoUrl, subtitleUrl });
    } catch (err) {
      console.error('Error navigating to StreamScreen:', err);
      Alert.alert('Error', 'Failed to navigate to the video player.');
    }
  };

  // -----------------------------------------------------------
  // 7) MY LIST LOGIC
  // -----------------------------------------------------------
  const fetchMyListStatus = async () => {
    if (!currentMalId) return;
    try {
      const response = await fetch(
        `http://192.168.43.44:3000/list?userId=${userId}&animeId=${currentMalId}`,
        { method: 'GET' }
      );
      if (!response.ok) {
        // Silently ignore if not 200
        return;
      }
      const data = await response.json();
      const foundAnime = data.animeStatus;
      if (foundAnime?.status) {
        setMyListStatus(foundAnime.status);
      }
    } catch (error) {
      console.error('Error fetching My List status:', error);
    }
  };

  const updateMyListStatus = async (status) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'No token found. Please log in again.');
        navigation.replace('Login');
        return;
      }
      const response = await fetch('http://192.168.43.44:3000/list', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          animeId: currentMalId,
          status
        })
      });
      if (!response.ok) {
        // Silently ignore if not 200
        return;
      }
      setMyListStatus(status);
    } catch (error) {
      console.error('Error updating My List status:', error);
    }
  };

  const handleStatusSelection = (status) => {
    updateMyListStatus(status);
    setIsModalVisible(false);
  };

  const getMyListLabel = () => {
    const statusOption = STATUS_OPTIONS.find(
      (option) => option.value === myListStatus
    );
    return statusOption ? statusOption.label : 'Add to My List';
  };

  const getStatusColor = () => {
    switch (myListStatus) {
      case 'want_to_watch':
        return '#fbc02d';
      case 'watching_now':
        return '#42a5f5';
      case 'done_watching':
        return '#66bb6a';
      case 'complete_later':
        return '#ab47bc';
      case 'dont_want':
        return '#ef5350';
      default:
        return '#ffffff';
    }
  };

  // -----------------------------------------------------------
  // RENDERING
  // -----------------------------------------------------------
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {retry ? (
          <TouchableOpacity
            onPress={() => currentMalId && fetchData(currentMalId)}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        ) : (
          <Loading />
        )}
      </View>
    );
  }

  if (!animeDetails) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Anime details not available. Check your connection or MAL ID.
        </Text>
      </View>
    );
  }

  const {
    title_english,
    images,
    aired,
    duration,
    genres = [],
    episodes,
    synopsis,
    trailer,
    score,
    scored_by
  } = animeDetails;

  const AnimeProp = {
    name: title_english,
    background: images?.jpg?.large_image_url,
    Airing: {
      status: aired ? 'Aired' : 'Not released',
      Time: aired?.from?.slice(0, 4) || ''
    },
    duration,
    genres,
    ep: episodes || 0,
    story: synopsis
  };

  // We'll rely on localEpisodes from the local server, not MAL's "episodes"
  const currentAnimeWatchedSet = getLocalWatchedSet();

  // ----------------------------------
  // Render single episode item
  // ----------------------------------
  const renderEpisodeItem = ({ item }) => {
    const episodeNumber = item.number;
    const isCompleted = currentAnimeWatchedSet.has(episodeNumber);

    return (
      <TouchableOpacity
        style={[
          styles.episodeCard,
          isCompleted && styles.episodeCardCompleted
        ]}
        onPress={() => handleEpisodePress(item)}
        disabled={isEpisodeLoading}
      >
        <View style={styles.episodeInfo}>
          <EyeIcon
            size={24}
            color={isCompleted ? '#4caf50' : '#ffffff'}
            style={{ marginRight: 10 }}
          />
          <Text
            style={[
              styles.episodeText,
              isCompleted && styles.episodeTextCompleted
            ]}
          >
            Episode {episodeNumber} {item.isFiller ? '(Filler)' : ''}
          </Text>
        </View>
        <View style={styles.playIconContainer}>
          <PlayIcon size={20} color="#ffffff" />
        </View>
      </TouchableOpacity>
    );
  };

  // ----------------------------------
  // Shared Header
  // ----------------------------------
  const renderHeader = () => {
    return (
      <>
        {/* Top Image */}
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: AnimeProp.background }}
            style={{ width, height: height * 0.55 }}
          />
          <LinearGradient
            colors={['transparent', 'rgba(23,23,23,0.8)', 'rgba(23,23,23,1)']}
            style={{
              width,
              height: height * 0.4,
              position: 'absolute',
              bottom: 0
            }}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />

          {/* Top row (Back + Comments) */}
          <View
            style={{
              position: 'absolute',
              zIndex: 20,
              width: '100%',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              top: topMargin
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <ChevronLeftIcon size={28} strokeWidth={2.5} color="#ffffff" />
            </TouchableOpacity>

            {/* Enhanced comment button */}
            <TouchableOpacity
              style={styles.commentButton}
              onPress={() =>
                navigation.navigate('comments', {
                  animeId: AnimeProp?.Airing?.Time || '',
                  title: AnimeProp?.name || ''
                })
              }
            >
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <ChatBubbleLeftIcon size={35} color="#ffffff" />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Container */}
        <View style={styles.infoContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.titleText}>{AnimeProp.name}</Text>

            {/* My List Button */}
            <View style={styles.myListContainer}>
              <TouchableOpacity
                onPress={() => {
                  if (!userId) {
                    Alert.alert(
                      'Login Required',
                      'Please log in to add anime to your list.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Login', onPress: () => navigation.navigate('Login') }
                      ]
                    );
                  } else {
                    setIsModalVisible(true);
                  }
                }}
                style={[
                  styles.myListButton,
                  myListStatus && { backgroundColor: getStatusColor() }
                ]}
              >
                {/* Render dynamic icon based on status */}
                {myListStatus ? (
                  STATUS_ICON_MAPPING[myListStatus] || (
                    <PlusIcon size={20} color="#ffffff" />
                  )
                ) : (
                  <PlusIcon size={20} color="#000000" />
                )}
                <Text
                  style={[
                    styles.myListText,
                    myListStatus && { color: '#ffffff' }
                  ]}
                >
                  {myListStatus ? getMyListLabel() : 'Add to My List'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.subInfoText}>
              {AnimeProp.Airing.status} • {AnimeProp.Airing.Time} •{' '}
              {AnimeProp.ep} episodes
            </Text>

            {/* Genres */}
            <View style={styles.genresContainer}>
              {AnimeProp.genres.map((genre, idx) => (
                <View key={idx} style={styles.genreBadge}>
                  <Text style={styles.genreText}>{genre.name}</Text>
                </View>
              ))}
            </View>

            {/* Score + Duration */}
            <View style={styles.scoreDurationContainer}>
              <StarIcon size={22} color="#FFD700" />
              <Text style={styles.scoreText}>
                {score == null ? '?' : score} ({scored_by} ratings)
              </Text>
            </View>
            <View style={styles.scoreDurationContainer}>
              <ClockIcon size={22} color="#90ee90" />
              <Text style={styles.durationText}>{duration || 'N/A'}</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'Description' && styles.activeTab
              ]}
              onPress={() => setActiveTab('Description')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'Description' && styles.activeTabText
                ]}
              >
                Description
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'Watch' && styles.activeTab
              ]}
              onPress={() => setActiveTab('Watch')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'Watch' && styles.activeTabText
                ]}
              >
                Watch
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  };

  // ----------------------------------
  // Description tab content
  // ----------------------------------
  const renderDescriptionTab = () => {
    return (
      <View style={{ paddingHorizontal: 10, marginTop: 10 }}>
        {/* Synopsis */}
        <TouchableOpacity onPress={() => setShowAll(!showAll)}>
          <Text style={styles.synopsisText}>
            {showAll
              ? AnimeProp.story
              : AnimeProp.story?.length > 450
              ? AnimeProp.story.slice(0, 450) + '...'
              : AnimeProp.story}
          </Text>
          {AnimeProp.story?.length > 450 && (
            <Text style={styles.showMoreText}>
              {showAll ? 'Show Less' : 'Show More'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Trailer */}
        {trailer?.embed_url ? (
          <View style={styles.trailerContainer}>
            <Text style={styles.sectionTitle}>Trailer</Text>
            <WebView
              source={{ uri: trailer.embed_url }}
              style={styles.webView}
              javaScriptEnabled
              domStorageEnabled
            />
          </View>
        ) : null}

        {/* Cast */}
        <Cast cast={cast} navigation={navigation} />

        {/* Related Seasons */}
        <View style={styles['S-container']}>
          <Text style={styles['S-title']}>Related</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles['S-scrollContainer']}
          >
            {relatedSeasons.length === 0 ? (
              <Text style={{ color: 'white', marginLeft: 16 }}>
                No related seasons found.
              </Text>
            ) : (
              relatedSeasons.map((season) => (
                <TouchableOpacity
                  key={season.mal_id}
                  style={styles['S-touchable']}
                  onPress={() =>
                    navigation.push('Anime', { malId: season.mal_id })
                  }
                >
                  <Image
                    style={styles['S-image']}
                    source={{ uri: season.image_url }}
                  />
                  <Text style={styles['S-characterName']}>
                    {season.title.length < 15
                      ? season.title
                      : season.title.slice(0, 15) + '...'}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    );
  };

  // ----------------------------------
  // Watch tab content (episodes list)
  // ----------------------------------
  function renderWatchTab() {
    // Sort episodes first
    const sortedEpisodes =
      episodesOrder === 'asc' ? localEpisodes : [...localEpisodes].reverse();
  
    return (
      <View style={styles.watchTabContainer}>
        <FlatList
          data={sortedEpisodes}
          keyExtractor={(ep) => ep.number.toString()}
          renderItem={renderEpisodeItem}
          contentContainerStyle={styles.episodesList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Keep the header so it doesn't get replaced by the loader */}
              {renderHeader()}

              {/* Episode Order Toggle */}
              <View style={styles.episodeOrderContainer}>
                <Text style={styles.episodeOrderLabel}>Episode Order:</Text>
                <TouchableOpacity
                  style={[
                    styles.episodeOrderButton,
                    episodesOrder === 'asc' && styles.episodeOrderButtonActive
                  ]}
                  onPress={() => setEpisodesOrder('asc')}
                >
                  <Text
                    style={[
                      styles.episodeOrderButtonText,
                      episodesOrder === 'asc' && styles.episodeOrderButtonTextActive
                    ]}
                  >
                    Asc
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.episodeOrderButton,
                    episodesOrder === 'desc' && styles.episodeOrderButtonActive
                  ]}
                  onPress={() => setEpisodesOrder('desc')}
                >
                  <Text
                    style={[
                      styles.episodeOrderButtonText,
                      episodesOrder === 'desc' && styles.episodeOrderButtonTextActive
                    ]}
                  >
                    Desc
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          }
        />

        {/* Only cover the watch tab area with the loader */}
        {isEpisodesLoading && (
          <View style={styles.watchLoaderOverlay}>
            <ActivityIndicator size="large" color="#5abf75" />
            <Text style={styles.loadingText}>Loading episodes...</Text>
          </View>
        )}
      </View>
    );
  }

  // ----------------------------------
  // Subtitle Selection Modal
  // ----------------------------------
  const renderSubtitleSelectionModal = () => {
    return (
      <Modal
        visible={isSubtitleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSubtitleModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsSubtitleModalVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.subtitleModalContainer}>
          <View style={styles.subtitleModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Subtitle Language</Text>
              <TouchableOpacity
                onPress={() => setIsSubtitleModalVisible(false)}
              >
                <XMarkIcon size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableSubtitles}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.statusOption}
                  onPress={() => {
                    if (currentHlsSource) {
                      setSelectedSubtitle(item);
                      setIsSubtitleModalVisible(false);
                      openVideoWithStreamScreen(currentHlsSource, item.file);
                    } else {
                      Alert.alert('Error', 'Streaming source is not available.');
                    }
                  }}
                >
                  <Text style={styles.statusText}>{item.label}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(option) => option.id}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </View>
      </Modal>
    );
  };

  // ----------------------------------
  // RETURN: Conditionally render each tab
  // ----------------------------------
  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#171717" />
      <SafeAreaView style={styles.container}>
        {activeTab === 'Description' ? (
          <ScrollView style={{ backgroundColor: '#171717' }}>
            {renderHeader()}
            {renderDescriptionTab()}
          </ScrollView>
        ) : (
          renderWatchTab()
        )}

        {/* Subtitle Selection Modal */}
        {renderSubtitleSelectionModal()}

        {/* Loading Indicator for Episode Selection */}
        {isEpisodeLoading && (
          <View style={styles.episodeLoadingOverlay}>
            <ActivityIndicator size="large" color="#5abf75" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {/* My List Status Modal */}
        <Modal
          visible={isModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Status</Text>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <XMarkIcon size={24} color="#000000" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={STATUS_OPTIONS}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.statusOption}
                    onPress={() => handleStatusSelection(item.value)}
                  >
                    <Text style={styles.statusText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
                keyExtractor={(option) => option.value}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ----------------------------------
// STYLES
// ----------------------------------
const styles = StyleSheet.create({
  container: { flex: 1 },

  loadingContainer: {
    position: 'absolute',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#262626',
    width: '100%',
    height: '100%'
  },
  retryButton: {
    padding: 15,
    backgroundColor: '#5abf75',
    borderRadius: 30
  },
  retryText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: { color: '#ffffff', fontSize: 18, textAlign: 'center' },

  backButton: {
    borderRadius: 25,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  commentButton: {
    borderRadius: 25,
    padding: 6,
    backgroundColor: '#5abf75',
    // Make it more visible
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5
  },

  infoContainer: {
    paddingHorizontal: 20,
    paddingTop: 10
  },
  titleContainer: {
    marginTop: -height * 0.09,
    marginBottom: 20
  },
  titleText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5
  },
  myListContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10
  },
  myListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20
  },
  myListText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#000000'
  },
  subInfoText: {
    color: '#b0b0b0',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 10
  },
  genresContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 15
  },
  genreBadge: {
    backgroundColor: '#333333',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginHorizontal: 5,
    marginVertical: 3
  },
  genreText: { color: '#b0b0b0', fontSize: 14, fontWeight: '600' },
  scoreDurationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  scoreText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 5
  },
  durationText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 5
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20
  },
  tabButton: {
    marginHorizontal: 20,
    paddingBottom: 5
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#5abf75'
  },
  tabText: {
    color: '#ffffff',
    fontSize: 18
  },
  activeTabText: {
    opacity: 1
  },
  synopsisText: {
    color: '#b0b0b0',
    fontSize: 16,
    lineHeight: 22
  },
  showMoreText: {
    color: '#5abf75',
    marginTop: 5,
    fontSize: 16,
    fontWeight: '600'
  },
  trailerContainer: {
    marginTop: 20
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10
  },
  webView: {
    width: '100%',
    height: 200,
    borderRadius: 10
  },
  episodesList: {
    paddingBottom: 20,
    backgroundColor: '#171717'
  },
  episodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    marginHorizontal: 10
  },
  episodeCardCompleted: {
    backgroundColor: '#3a3a3a'
  },
  episodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  episodeText: {
    color: '#ffffff',
    fontSize: 16
  },
  episodeTextCompleted: {
    color: '#4caf50',
    textDecorationLine: 'line-through'
  },
  playIconContainer: {
    backgroundColor: '#5abf75',
    borderRadius: 20,
    padding: 5
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContainer: {
    position: 'absolute',
    top: height / 4,
    left: width * 0.1,
    right: width * 0.1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    elevation: 5
  },
  subtitleModalContainer: {
    position: 'absolute',
    top: height / 3,
    left: width * 0.05,
    right: width * 0.05,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    elevation: 5
  },
  modalContent: {},
  subtitleModalContent: {},
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000'
  },
  statusOption: {
    paddingVertical: 12,
    paddingHorizontal: 10
  },
  statusText: {
    fontSize: 16,
    color: '#000000'
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0'
  },

  // Loader for episode selection
  episodeLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100
  },
  loadingText: {
    color: '#5abf75',
    marginTop: 10,
    fontSize: 16
  },

  // **NEW** Watch-tab loader
  watchLoader: {
    flex: 1,
    backgroundColor: '#171717',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20
  },

  // Episode Order Toggle
  episodeOrderContainer: {
    marginBottom: 20,
    backgroundColor: '#171717',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20
  },
  episodeOrderLabel: {
    color: '#ffffff',
    fontSize: 16,
    marginRight: 8
  },
  episodeOrderButton: {
    borderWidth: 1,
    borderColor: '#5abf75',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 4
  },
  episodeOrderButtonText: {
    color: '#ffffff',
    fontSize: 14
  },
  episodeOrderButtonActive: {
    backgroundColor: '#5abf75'
  },
  episodeOrderButtonTextActive: {
    color: '#000000'
  },

  // Related Seasons Container
  'S-container': {
    marginVertical: 24
  },
  'S-title': {
    color: 'white',
    fontSize: 18,
    marginHorizontal: 16,
    marginBottom: 20
  },
  'S-scrollContainer': {
    paddingHorizontal: 15
  },
  'S-touchable': {
    marginRight: 16,
    alignItems: 'center'
  },
  'S-image': {
    borderRadius: 16,
    height: 128,
    width: 112
  },
  'S-characterName': {
    color: '#a0a0a0',
    fontSize: 12,
    margin: 4,
    textAlign: 'center',
    width: 112
  },
  watchTabContainer: {
    flex: 1,
    backgroundColor: '#171717',
    position: 'relative', // important for absolute child positioning
  },

  // Overlay that only covers the watch tab area (not the entire screen)
  watchLoaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
});
