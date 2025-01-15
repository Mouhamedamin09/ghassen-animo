// screens/SettingsScreen.js

import React, { useEffect, useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Switch, 
    ScrollView, 
    Alert, 
    Share, 
    ActivityIndicator 
} from 'react-native';
import Layout from '../Layouts/Layout'; // Adjust the path as necessary
import Icon from 'react-native-vector-icons/Ionicons'; // Ensure you have this library installed
import { useNavigation } from '@react-navigation/native'; // Import navigation if needed
import { useUser } from '../Context/UserContext'; // Import UserContext
import { themes } from './theme'; // Import themes
import AsyncStorage from '@react-native-async-storage/async-storage'; // For persisting settings

const SettingsScreen = () => {
    const navigation = useNavigation(); // Initialize navigation
    const { theme, setTheme, userId, setUserId } = useUser(); 
    const currentTheme = themes[theme] || themes.dark;

    // State for notifications
    const [dailyQuizNotifications, setDailyQuizNotifications] = useState(true);
    const [newCommentNotifications, setNewCommentNotifications] = useState(true);
    const [loadingDonors, setLoadingDonors] = useState(true);
    const [topDonors, setTopDonors] = useState([]);

    // Fetch notification preferences from AsyncStorage
    useEffect(() => {
        const fetchPreferences = async () => {
            try {
                const daily = await AsyncStorage.getItem('dailyQuizNotifications');
                const comment = await AsyncStorage.getItem('newCommentNotifications');
                if (daily !== null) setDailyQuizNotifications(JSON.parse(daily));
                if (comment !== null) setNewCommentNotifications(JSON.parse(comment));
            } catch (error) {
                console.error("Error fetching notification preferences:", error);
            }
        };

        fetchPreferences();
    }, []);

    // Fetch Top Donors from API or Context
    useEffect(() => {
        const fetchTopDonors = async () => {
            try {
                // Replace with your API endpoint or context fetch
                // Example using fetch:
                const response = await fetch('https://yourapi.com/top-donors');
                const data = await response.json();
                setTopDonors(data.donors);
            } catch (error) {
                console.error("Error fetching top donors:", error);
                // Fallback to static data if API fails
                setTopDonors([
                    { name: 'Alice', amount: 100 },
                    { name: 'Bob', amount: 80 },
                    { name: 'Charlie', amount: 60 },
                ]);
            } finally {
                setLoadingDonors(false);
            }
        };

        fetchTopDonors();
    }, []);

    // Function to toggle theme
    const toggleTheme = async () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        try {
            await AsyncStorage.setItem('theme', newTheme);
        } catch (error) {
            console.error("Error saving theme preference:", error);
        }
    };

    // Handlers for notification toggles
    const toggleDailyQuizNotifications = async () => {
        const newValue = !dailyQuizNotifications;
        setDailyQuizNotifications(newValue);
        try {
            await AsyncStorage.setItem('dailyQuizNotifications', JSON.stringify(newValue));
        } catch (error) {
            console.error("Error saving daily quiz notifications preference:", error);
        }
    };

    const toggleNewCommentNotifications = async () => {
        const newValue = !newCommentNotifications;
        setNewCommentNotifications(newValue);
        try {
            await AsyncStorage.setItem('newCommentNotifications', JSON.stringify(newValue));
        } catch (error) {
            console.error("Error saving new comment notifications preference:", error);
        }
    };

    // Updated logout function to set userId to null
    const handleLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                { 
                    text: "OK", 
                    onPress: () => {
                        // Clear user ID to log out
                        setUserId(null);

                        // Navigate to Login screen or Home screen
                        navigation.replace('LoggedHome'); // Ensure 'Home' is your login screen

                        console.log("User logged out");
                    } 
                }
            ],
            { cancelable: false }
        );
    };

    // Handle Share functionality
    const handleShare = async () => {
        try {
            const result = await Share.share({
                message: 'Check out this awesome app!',
                url: 'https://yourappurl.com', // Optional
                title: 'Awesome App',
            });

            if (result.action === Share.sharedAction) {
                if (result.activityType) {
                    // Shared with activity type of result.activityType
                } else {
                    // Shared
                }
            } else if (result.action === Share.dismissedAction) {
                // Dismissed
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred while trying to share the app.');
            console.error("Share error:", error);
        }
    };

    return (
        <Layout>
            <ScrollView contentContainerStyle={[styles.container, { backgroundColor: currentTheme.background }]}>
                <Text style={[styles.heading, { color: currentTheme.text }]}>Settings</Text>

                {/* Appearance Section */}
                <View style={[styles.section, { backgroundColor: currentTheme.sectionBackground }]}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Appearance</Text>
                    <View style={styles.toggleContainer}>
                        <View style={styles.toggleLabelContainer}>
                            <Icon 
                                name={theme === 'dark' ? "moon-outline" : "sunny-outline"} 
                                size={24} 
                                color={currentTheme.iconColor} 
                                style={styles.icon}
                            />
                            <Text style={[styles.toggleLabel, { color: currentTheme.text }]}>Dark Mode</Text>
                        </View>
                        <Switch 
                            value={theme === 'dark'} 
                            onValueChange={toggleTheme} 
                            trackColor={{ false: currentTheme.toggleTrackFalse, true: currentTheme.toggleTrackTrue }}
                            thumbColor={currentTheme.toggleThumb}
                            accessibilityLabel="Toggle Dark Mode"
                        />
                    </View>
                </View>

                {/* Notifications Section */}
                <View style={[styles.section, { backgroundColor: currentTheme.sectionBackground }]}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Notifications</Text>
                    
                    <View style={styles.toggleContainer}>
                        <View style={styles.toggleLabelContainer}>
                            <Icon 
                                name="notifications-outline" 
                                size={24} 
                                color={currentTheme.iconColor} 
                                style={styles.icon}
                            />
                            <Text style={[styles.toggleLabel, { color: currentTheme.text }]}>Daily Quiz Notifications</Text>
                        </View>
                        <Switch 
                            value={dailyQuizNotifications} 
                            onValueChange={toggleDailyQuizNotifications} 
                            trackColor={{ false: currentTheme.toggleTrackFalse, true: currentTheme.toggleTrackTrue }}
                            thumbColor={currentTheme.toggleThumb}
                            accessibilityLabel="Toggle Daily Quiz Notifications"
                        />
                    </View>
                    
                    <View style={styles.toggleContainer}>
                        <View style={styles.toggleLabelContainer}>
                            <Icon 
                                name="chatbubble-outline" 
                                size={24} 
                                color={currentTheme.iconColor} 
                                style={styles.icon}
                            />
                            <Text style={[styles.toggleLabel, { color: currentTheme.text }]}>New Comment Notifications</Text>
                        </View>
                        <Switch 
                            value={newCommentNotifications} 
                            onValueChange={toggleNewCommentNotifications} 
                            trackColor={{ false: currentTheme.toggleTrackFalse, true: currentTheme.toggleTrackTrue }}
                            thumbColor={currentTheme.toggleThumb}
                            accessibilityLabel="Toggle New Comment Notifications"
                        />
                    </View>
                </View>

                {/* About Section */}
                <View style={[styles.section, { backgroundColor: currentTheme.sectionBackground }]}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>About</Text>
                    <TouchableOpacity 
                        style={styles.aboutItem} 
                        onPress={() => navigation.navigate('About')} // Ensure you have an About screen in your navigator
                        accessibilityLabel="Navigate to About This App"
                    >
                        <View style={styles.aboutContent}>
                            <Icon 
                                name="information-circle-outline" 
                                size={24} 
                                color={currentTheme.iconColor} 
                                style={styles.icon}
                            />
                            <Text style={[styles.aboutText, { color: currentTheme.text }]}>About This App</Text>
                        </View>
                        <Icon 
                            name="chevron-forward" 
                            size={24} 
                            color={currentTheme.iconColor} 
                        />
                    </TouchableOpacity>
                </View>

                {/* App Info Section */}
                <View style={[styles.section, { backgroundColor: currentTheme.sectionBackground }]}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>App Info</Text>
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: currentTheme.text }]}>Version</Text>
                        <Text style={[styles.infoValue, { color: currentTheme.text }]}>1.0.0</Text>
                    </View>
                </View>

                {/* Top Donors Section */}
                <View style={[styles.section, { backgroundColor: currentTheme.sectionBackground }]}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Top Donors</Text>
                    {loadingDonors ? (
                        <ActivityIndicator size="small" color={currentTheme.text} />
                    ) : (
                        topDonors.map((donor, index) => (
                            <View key={index} style={styles.donorItem}>
                                <Text style={[styles.donorName, { color: currentTheme.text }]}>{donor.name}</Text>
                                <Text style={[styles.donorAmount, { color: currentTheme.text }]}>${donor.amount}</Text>
                            </View>
                        ))
                    )}
                </View>

                {/* Share App Section */}
                <View style={[styles.section, { backgroundColor: currentTheme.sectionBackground }]}>
                    <TouchableOpacity 
                        style={[styles.shareButton, { backgroundColor: currentTheme.buttonBackground }]} 
                        onPress={handleShare}
                        accessibilityLabel="Share This App"
                    >
                        <View style={styles.shareContent}>
                            <Icon 
                                name="share-social-outline" 
                                size={24} 
                                color={currentTheme.buttonText} 
                                style={styles.icon}
                            />
                            <Text style={[styles.shareText, { color: currentTheme.buttonText }]}>Share This App</Text>
                        </View>
                        <Icon 
                            name="chevron-forward" 
                            size={24} 
                            color={currentTheme.buttonText} 
                        />
                    </TouchableOpacity>
                </View>

                {/* Account Section */}
                <View style={[styles.section, { backgroundColor: currentTheme.sectionBackground }]}>
                    <TouchableOpacity 
                        style={[styles.logoutButton, { backgroundColor: currentTheme.logoutBackground }]} 
                        onPress={handleLogout}
                        accessibilityLabel="Logout"
                    >
                        <View style={styles.logoutContent}>
                            <Icon 
                                name="log-out-outline" 
                                size={24} 
                                color={currentTheme.logoutText} 
                                style={styles.icon}
                            />
                            <Text style={[styles.logoutText, { color: currentTheme.logoutText }]}>Logout</Text>
                        </View>
                        <Icon 
                            name="chevron-forward" 
                            size={24} 
                            color={currentTheme.logoutText} 
                        />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </Layout>
    );

};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        flexGrow: 1,
    },
    heading: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    section: {
        marginBottom: 30,
        borderRadius: 10,
        padding: 10,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    toggleLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    toggleLabel: {
        fontSize: 16,
        marginLeft: 10,
    },
    icon: {
        width: 24,
        height: 24,
    },
    aboutItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 10,
    },
    aboutContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    aboutText: {
        fontSize: 16,
        marginLeft: 10,
    },
    infoItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 10,
    },
    infoLabel: {
        fontSize: 16,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    donorItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginBottom: 8,
    },
    donorName: {
        fontSize: 16,
    },
    donorAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    shareButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 10,
    },
    shareContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    shareText: {
        fontSize: 16,
        marginLeft: 10,
        fontWeight: 'bold',
    },
    logoutButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 10,
    },
    logoutContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoutText: {
        fontSize: 16,
        marginLeft: 10,
        fontWeight: 'bold',
    },
});

export default SettingsScreen;
