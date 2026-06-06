import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { helpService, HelpTopic } from '../services/helpService';

interface HelpScreenProps {
  navigation: any;
}

export default function HelpScreen({ navigation }: HelpScreenProps) {
  const { appUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [helpTopics, setHelpTopics] = useState<HelpTopic[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<HelpTopic[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const categories = [
    { key: 'all', label: 'All Topics' },
    { key: 'getting-started', label: 'Getting Started' },
    { key: 'features', label: 'Features' },
    { key: 'troubleshooting', label: 'Troubleshooting' },
    { key: 'security', label: 'Security' },
    { key: 'reports', label: 'Reports' },
  ];

  useEffect(() => {
    loadHelpTopics();
  }, []);

  useEffect(() => {
    filterTopics();
  }, [helpTopics, searchQuery, selectedCategory]);

  const loadHelpTopics = async () => {
    setLoading(true);
    try {
      const topics = await helpService.getHelpTopics();
      setHelpTopics(topics);
    } catch (error) {
      console.error('Load help topics error:', error);
      Alert.alert('Error', 'Failed to load help topics');
    } finally {
      setLoading(false);
    }
  };

  const filterTopics = async () => {
    try {
      let filtered = helpTopics;

      // Filter by category
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(topic => topic.category === selectedCategory);
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const searchResults = await helpService.searchHelpTopics(searchQuery);
        filtered = filtered.filter(topic => 
          searchResults.some(result => result.id === topic.id)
        );
        
        // Record search
        await helpService.recordHelpSearch(searchQuery);
      }

      setFilteredTopics(filtered);
    } catch (error) {
      console.error('Filter topics error:', error);
    }
  };

  const handleTopicPress = async (topic: HelpTopic) => {
    try {
      // Record topic view
      await helpService.recordHelpTopicView(topic.id);
      
      // Navigate to topic detail
      navigation.navigate('HelpTopicDetail', { topic });
    } catch (error) {
      console.error('Handle topic press error:', error);
    }
  };

  const renderTopicItem = ({ item }: { item: HelpTopic }) => (
    <TouchableOpacity
      style={styles.topicItem}
      onPress={() => handleTopicPress(item)}
    >
      <View style={styles.topicHeader}>
        <Text style={styles.topicTitle}>{item.title}</Text>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
          <Text style={styles.categoryBadgeText}>
            {categories.find(cat => cat.key === item.category)?.label || item.category}
          </Text>
        </View>
      </View>
      <Text style={styles.topicPreview} numberOfLines={3}>
        {item.content.replace(/[#*`]/g, '').substring(0, 150)}...
      </Text>
      <View style={styles.topicFooter}>
        <Text style={styles.topicDate}>
          Updated: {new Date(item.lastUpdated).toLocaleDateString()}
        </Text>
        <View style={styles.topicTags}>
          {item.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'getting-started': '#4CAF50',
      'features': '#2196F3',
      'troubleshooting': '#FF9800',
      'security': '#F44336',
      'reports': '#9C27B0',
    };
    return colors[category] || '#607D8B';
  };

  const renderCategoryFilter = () => (
    <View style={styles.categoryFilter}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.categoryButtons}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.key}
              style={[
                styles.categoryButton,
                selectedCategory === category.key && styles.activeCategoryButton,
              ]}
              onPress={() => setSelectedCategory(category.key)}
            >
              <Text style={[
                styles.categoryButtonText,
                selectedCategory === category.key && styles.activeCategoryButtonText,
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Help Center</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search help topics..."
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {renderCategoryFilter()}

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading help topics...</Text>
            </View>
          ) : filteredTopics.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No topics found for your search' : 'No help topics available'}
              </Text>
              {searchQuery && (
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={styles.clearSearchButtonText}>Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredTopics}
              renderItem={renderTopicItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.topicsList}
            />
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => Alert.alert('Contact Support', 'For additional help, please contact our support team.')}
          >
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  categoryFilter: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  activeCategoryButton: {
    backgroundColor: '#ffffff',
  },
  categoryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  activeCategoryButtonText: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  clearSearchButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  clearSearchButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  topicsList: {
    paddingBottom: 20,
  },
  topicItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    marginRight: 10,
  },
  categoryBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  topicPreview: {
    color: '#ffffff',
    opacity: 0.8,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  topicFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicDate: {
    color: '#ffffff',
    opacity: 0.6,
    fontSize: 12,
  },
  topicTags: {
    flexDirection: 'row',
    gap: 5,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    color: '#ffffff',
    fontSize: 10,
    opacity: 0.8,
  },
  footer: {
    padding: 20,
  },
  contactButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
