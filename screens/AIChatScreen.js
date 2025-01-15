import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeftIcon } from 'react-native-heroicons/outline';
import { useUser } from '../Context/UserContext';


const { width } = Dimensions.get('window');
const ios = Platform.OS === 'ios';

const BASE_URL = 'http://192.168.43.44:3000';

export default function AIChatScreen({ route, navigation }) {
  const { character } = route.params || {};
  const [chatId, setChatId] = useState(null);
  const { userId } = useUser();
  const [coins, setCoins] = useState(50);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: `Hello, I am ${character?.name || 'Unknown'}. How can I help you today?`,
      sender: 'character',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Initialize chatId
  useEffect(() => {
    const initializeChatId = async () => {
      const storedChatId = await AsyncStorage.getItem(`${character?.name || 'Character'}-chatId`);
      if (storedChatId) {
        setChatId(storedChatId);
      } else {
        const newChatId = `${character?.name || 'Character'}-${Date.now()}`;
        await AsyncStorage.setItem(`${character?.name || 'Character'}-chatId`, newChatId);
        setChatId(newChatId);
      }
    };

    initializeChatId();
  }, [character?.name]);

  const sendMessage = async () => {
    if (!input.trim() || !chatId) return;

    const userMessage = input.trim();
    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, text: userMessage, sender: 'user' },
    ]);
    setInput('');

    const characterName = character?.name || 'Character';
    const biography = character?.bio || 'This character has no biography.';

    try {
      setMessages((prev) => [
        ...prev,
        { id: prev.length + 1, text: '', sender: 'character' },
      ]);

      const response = await axios.post(`${BASE_URL}/character-chat`, {
        userId,
        chatId,
        characterName,
        biography,
        userMessage,
      });

      const characterReply = response.data.response;
      simulateTyping(characterReply);
    } catch (error) {
      console.error('Error communicating with the server:', error?.message || error);
      setIsTyping(false);

      setMessages((prev) => {
        const updated = [...prev];
        if (updated[updated.length - 1].text === '') {
          updated.pop();
        }
        return updated;
      });

      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: "I'm having trouble understanding. Please try again.",
          sender: 'character',
        },
      ]);
    }
  };

  const simulateTyping = (fullText) => {
    setIsTyping(true);
    let index = 0;

    const interval = setInterval(() => {
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        const updatedText = lastMessage.text + (fullText[index] || '');
        const updatedMessages = [...prev];
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMessage,
          text: updatedText,
        };
        return updatedMessages;
      });

      index++;
      if (index >= fullText.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 5);
  };

  const parseText = (text) => {
    const regex = /\((.*?)\)|\[([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (lastIndex < match.index) {
        parts.push({ text: text.slice(lastIndex, match.index), type: 'normal' });
      }

      if (match[1]) {
        parts.push({ text: `(${match[1]})`, type: 'thought' });
      } else if (match[2]) {
        parts.push({ text: `[${match[2]}]`, type: 'action' });
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), type: 'normal' });
    }

    return parts;
  };

  const renderMessage = ({ item }) => {
    const parsedText = parseText(item.text);

    return (
      <View
        style={[
          styles.messageContainer,
          item.sender === 'user' ? styles.userMessage : styles.characterMessage,
        ]}
      >
        {item.sender === 'character' && (
          <Image
            source={{ uri: character?.images?.jpg?.image_url }}
            style={styles.characterImage}
          />
        )}
        <View
          style={[
            styles.messageBubble,
            item.sender === 'user' ? styles.userBubble : styles.characterBubble,
          ]}
        >
          {parsedText.map((part, index) => (
            <Text
              key={index}
              style={[
                part.type === 'thought' && styles.thoughtText,
                part.type === 'action' && styles.actionText,
                part.type === 'normal' && styles.normalText,
              ]}
            >
              {part.text}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeftIcon size={28} strokeWidth={2.5} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Chat with {character?.name || 'Character'}
        </Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContainer}
      />

      <KeyboardAvoidingView
        behavior={ios ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.textInput}
          placeholder="Type your message..."
          placeholderTextColor="#CCCCCC"
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            isTyping && { backgroundColor: '#AAAAAA' },
          ]}
          onPress={sendMessage}
          disabled={isTyping || coins < 10}
        >
          <Text style={styles.sendButtonText}>
            {isTyping ? 'Typing...' : 'Send'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
      {coins < 10 && (
        <View style={styles.noCoinsBanner}>
          <Text style={styles.noCoinsText}>
            You have {coins} coins left. Please add more coins to continue chatting.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddCoins')}
            style={styles.addCoinsButton}
          >
            <Text style={styles.addCoinsButtonText}>Add Coins</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#2A2A2A',
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },
  chatContainer: {
    flexGrow: 1,
    padding: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 5,
    alignItems: 'flex-end',
  },
  characterMessage: {
    alignSelf: 'flex-start',
  },
  userMessage: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  characterImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  messageBubble: {
    maxWidth: width * 0.7,
    padding: 10,
    borderRadius: 10,
  },
  characterBubble: {
    backgroundColor: '#333333',
  },
  userBubble: {
    backgroundColor: '#5abf75',
  },
  thoughtText: {
    color: '#AAAAAA',
    fontStyle: 'italic',
  },
  actionText: {
    color: 'white',
  },
  normalText: {
    color: 'white',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#2A2A2A',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#333333',
    color: 'white',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#5abf75',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  noCoinsBanner: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: '#5abf75',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noCoinsText: {
    color: 'white',
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  addCoinsButton: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addCoinsButtonText: {
    color: '#5abf75',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
