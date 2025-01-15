// screens/AllAnimeScreen.js

import React, { useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    Image, 
    ActivityIndicator, 
    TouchableOpacity,
    Dimensions,
    Alert,
} from 'react-native';
import Layout from '../Layouts/Layout'; // Adjust the path as necessary
import { useUser } from '../Context/UserContext';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const AllAnimeScreen = () => {
    const {
        animes,
        fetchAnimes,
        animeLoading,
        animeLoadingMore,
        animeError,
        animePage,
        animeHasNextPage,
        handleAnimePress,
        authToken, // Ensure authToken is available
    } = useUser();

    const navigation = useNavigation();

    useEffect(() => {
        // Fetch anime data only if not already fetched
        if (animes.length === 0) {
            fetchAnimes();
        }
    }, []);

    const renderAnimeItem = ({ item }) => {
        return (
            <TouchableOpacity 
                onPress={() => handleAnimePress(item.id, navigation)} 
                style={styles.itemContainer}
            >
                <Image
                    source={{ uri: item.poster }}
                    style={styles.image}
                />
                <Text style={styles.itemTitle}>
                    {item.name?.length > 14 ? `${item.name.slice(0, 14)}...` : item.name}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderFooter = () => {
        if (!animeLoadingMore) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color="#5abf75" />
            </View>
        );
    };

    if (animeLoading && animePage === 1) {
        return (
            <Layout>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#5abf75" />
                </View>
            </Layout>
        );
    }

    if (animeError && animePage === 1) {
        return (
            <Layout>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{animeError}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => fetchAnimes(1)}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </Layout>
        );
    }

    return (
        <Layout>
            {animes.length > 0 ? (
                <FlatList
                    data={animes}
                    renderItem={renderAnimeItem}
                    keyExtractor={(item) => item.id.toString()} // Ensure id is a string
                    numColumns={2}
                    contentContainerStyle={styles.grid}
                    onEndReached={() => {
                        if (animeHasNextPage && !animeLoadingMore) {
                            fetchAnimes(animePage + 1);
                        }
                    }}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No anime available.</Text>
                </View>
            )}
        </Layout>
    );
};

const styles = StyleSheet.create({
    grid: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        justifyContent: 'space-between',
    },
    itemContainer: {
        width: width * 0.44,
        marginBottom: 24,
        marginRight: 10,
    },
    image: {
        borderRadius: 20,
        width: '100%',
        height: height * 0.3,
    },
    itemTitle: {
        color: '#a1a1aa',
        marginTop: 8,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
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
        color: '#FFFFFF', // White text
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        fontSize: 16,
        color: '#a1a1aa',
    },
    footer: {
        paddingVertical: 20,
    },
});

export default AllAnimeScreen;
