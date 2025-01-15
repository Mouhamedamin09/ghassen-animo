// screens/LastWatch.js

import React from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Image, 
    ActivityIndicator, 
    TouchableOpacity,
    Dimensions,
    TouchableWithoutFeedback,
    ScrollView,
    RefreshControl,
} from 'react-native';
import Layout from '../Layouts/Layout';
import { useAnime } from '../Context/AnimeContext'; // Import useAnime
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const LastWatch = () => {
    const navigation = useNavigation();
    const {
        lastWatchAnimes,
        lastWatchLoading,
        lastWatchError,
        lastWatchRefreshing,
        onRefreshLastWatch,
    } = useAnime();

    const renderAnimeItem = (anime) => {
        return (
            <TouchableWithoutFeedback
                key={anime.mal_id}
                onPress={() => navigation.push('Anime', { malId: anime.mal_id })}
            >
                <View style={styles.item}>
                    <Image
                        source={{ uri: anime.images?.jpg?.large_image_url || anime.images?.webp?.image_url || null }}
                        style={styles.image}
                    />
                    <Text style={styles.itemTitle}>
                        {anime.title?.length > 14 ? `${anime.title.slice(0, 14)}...` : anime.title}
                    </Text>
                </View>
            </TouchableWithoutFeedback>
        );
    };

    if (lastWatchLoading) {
        return (
            <Layout>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#5abf75" />
                </View>
            </Layout>
        );
    }

    if (lastWatchError) {
        return (
            <Layout>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{lastWatchError}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={onRefreshLastWatch}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </Layout>
        );
    }

    return (
        <Layout>
            {lastWatchAnimes.length > 0 ? (
                <ScrollView
                    contentContainerStyle={styles.grid}
                    refreshControl={
                        <RefreshControl
                            refreshing={lastWatchRefreshing}
                            onRefresh={onRefreshLastWatch}
                            colors={['#5abf75']}
                            tintColor="#5abf75"
                        />
                    }
                >
                    {lastWatchAnimes.map(renderAnimeItem)}
                </ScrollView>
            ) : (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                        You haven't watched any anime yet.
                    </Text>
                </View>
            )}
        </Layout>
    );
};

const styles = StyleSheet.create({
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
        color: '#FF4D4D',
        marginBottom: 12,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#5abf75',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    retryButtonText: {
        color: '#FFFFFF',
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
        color: '#666666',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    item: {
        width: width * 0.44,
        marginBottom: 24,
    },
    image: {
        borderRadius: 20,
        width: '100%',
        height: height * 0.3,
    },
    itemTitle: {
        color: '#a1a1aa',
        marginTop: 8,
        marginLeft: 4,
        fontSize: 16,
        fontWeight: '600',
    },
});

export default LastWatch;
