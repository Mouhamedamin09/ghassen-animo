// components/CategoryTab.js
import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Image, 
    ActivityIndicator, 
    TouchableOpacity,
    Dimensions,
    FlatList,
    Alert,
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const CategoryTab = ({ categoryName }) => {
    const [animes, setAnimes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(true); // Assume initially there's a next page
    const navigation = useNavigation();

    useEffect(() => {
        fetchAnimes(page);
    }, [page]);

    const fetchAnimes = async (currentPage) => {
        if (loading || !hasNextPage) return; // Prevent multiple requests

        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`http://192.168.43.44:1000/api/v2/hianime/category/${categoryName}?page=${currentPage}`);

            if (response.data.success) {
                const fetchedAnimes = response.data.data.animes;

                if (!fetchedAnimes || fetchedAnimes.length === 0) {
                    setHasNextPage(false);
                    return;
                }

                // Fetch malId for each anime
                const detailedAnimes = await fetchAnimesWithMalId(fetchedAnimes);

                // Append only animes with malId
                setAnimes(prevAnimes => [...prevAnimes, ...detailedAnimes]);

                setHasNextPage(response.data.data.hasNextPage);
            } else {
                setError('Failed to fetch data.');
            }
        } catch (err) {
            console.error(`Error fetching ${categoryName} data:`, err);
            setError('An error occurred while fetching data.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAnimesWithMalId = async (animesList) => {
        // Use Promise.allSettled to handle individual request failures
        const promises = animesList.map(anime => 
            axios.get(`http://192.168.43.44:1000/api/v2/hianime/anime/${anime.id}`)
                .then(detailResponse => {
                    if (detailResponse.data.success) {
                        const malId = detailResponse.data.data.anime.info.malId;
                        if (malId) {
                            return { ...anime, malId };
                        }
                    }
                    return null;
                })
                .catch(err => {
                    console.error(`Error fetching details for anime ID ${anime.id}:`, err);
                    return null;
                })
        );

        const results = await Promise.allSettled(promises);

        // Extract fulfilled results and filter out nulls
        const validAnimes = results
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => result.value);

        return validAnimes;
    };

    const handleAnimePress = async (animeId) => {
        try {
            const response = await axios.get(`http://192.168.43.44:1000/api/v2/hianime/anime/${animeId}`);

            if (response.data.success) {
                const malId = response.data.data.anime.info.malId;

                if (malId) {
                    navigation.push('Anime', { malId });
                } else {
                    Alert.alert('Error', 'malId not found for this anime.');
                    // Optionally, remove the anime from the list
                    setAnimes(prevAnimes => prevAnimes.filter(anime => anime.id !== animeId));
                }
            } else {
                Alert.alert('Error', 'Failed to fetch anime details.');
            }
        } catch (err) {
            console.error('Error fetching anime details:', err);
            Alert.alert('Error', 'An error occurred while fetching anime details.');
        }
    };

    const renderAnimeItem = ({ item }) => { 
        return (
            <TouchableOpacity onPress={() => handleAnimePress(item.id)} style={styles.itemContainer}>
                <View style={styles.item}>
                    <Image
                        source={{ uri: item.poster }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                    <Text style={styles.itemTitle}>
                        {item.name?.length > 14 ? `${item.name.slice(0, 14)}...` : item.name}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderFooter = () => {
        if (loading && page > 1) {
            return (
                <View style={styles.footer}>
                    <ActivityIndicator size="small" color="#5abf75" />
                </View>
            );
        }

        if (!hasNextPage) {
            return (
                <View style={styles.endMessageContainer}>
                    <Text style={styles.endMessageText}>No more animes to load.</Text>
                </View>
            );
        }

        return null;
    };

    const renderEmptyComponent = () => {
        if (loading && page === 1) {
            return (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#5abf75" />
                </View>
            );
        }

        if (error && page === 1) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={() => { setPage(1); setAnimes([]); }}>
                        <View style={styles.retryButton}>
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No animes found.</Text>
            </View>
        );
    };

    return (
        <FlatList 
            data={animes}
            renderItem={renderAnimeItem}
            keyExtractor={(item) => item.id.toString()} // Assuming 'id' is unique and numeric. Adjust if necessary.
            numColumns={2}
            contentContainerStyle={styles.grid}
            onEndReached={() => {
                if (hasNextPage && !loading) {
                    setPage(prevPage => prevPage + 1);
                }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmptyComponent}
            initialNumToRender={10}
            windowSize={21}
        />
    );
};

const styles = StyleSheet.create({
    grid: {
        backgroundColor: '#262626',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 20,
    },
    itemContainer: {
        flex: 1,
        margin: 8,
    },
    item: {
        backgroundColor: '#333333',
        borderRadius: 20,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: height * 0.3,
    },
    itemTitle: {
        color: '#a1a1aa',
        marginTop: 8,
        marginLeft: 8,
        marginRight: 8,
        marginBottom: 12,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: height * 0.8,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        height: height * 0.8,
    },
    errorText: {
        fontSize: 16,
        color: '#FF4D4D', // Red for errors
        marginBottom: 12,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#5abf75', // Green
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    retryButtonText: {
        color: '#FFFFFF', 
        fontSize: 16,
    },
    endMessageContainer: {
        alignItems: 'center',
        marginTop: 10,
    },
    endMessageText: {
        color: '#a1a1aa',
        fontSize: 14,
    },
    footer: {
        paddingVertical: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    emptyText: {
        fontSize: 16,
        color: '#a1a1aa',
        textAlign: 'center',
    },
});

export default CategoryTab;
