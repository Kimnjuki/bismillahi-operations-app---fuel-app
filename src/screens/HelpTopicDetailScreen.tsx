import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import { helpService, HelpTopic } from '../services/helpService';

interface RouteParams {
  topic: HelpTopic;
}

export default function HelpTopicDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { topic } = route.params as RouteParams;
  const [relatedTopics, setRelatedTopics] = useState<HelpTopic[]>([]);

  useEffect(() => {
    loadRelatedTopics();
  }, [topic]);

  const loadRelatedTopics = async () => {
    try {
      const allTopics = await helpService.getHelpTopics();
      const related = allTopics
        .filter(t => t.id !== topic.id && t.category === topic.category)
        .slice(0, 3);
      setRelatedTopics(related);
    } catch (error) {
      console.error('Load related topics error:', error);
    }
  };

  const formatContent = (content: string): string => {
    // Simple markdown-like formatting
    return content
      .replace(/^# (.*$)/gim, '$1') // Remove # headers
      .replace(/^## (.*$)/gim, '$1') // Remove ## headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold**
      .replace(/\*(.*?)\*/g, '$1') // Remove *italic*
      .replace(/`(.*?)`/g, '$1'); // Remove `code`
  };

  const renderContentSection = (content: string) => {
    const sections = content.split('\n\n');
    return sections.map((section, index) => {
      if (section.trim().startsWith('##')) {
        return (
          <Text key={index} style={styles.sectionTitle}>
            {section.replace(/^## /, '')}
          </Text>
        );
      } else if (section.trim().startsWith('#')) {
        return (
          <Text key={index} style={styles.mainTitle}>
            {section.replace(/^# /, '')}
          </Text>
        );
      } else if (section.trim().startsWith('- ')) {
        const items = section.split('\n').filter(item => item.trim().startsWith('- '));
        return (
          <View key={index} style={styles.bulletList}>
            {items.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.bulletItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.bulletText}>
                  {item.replace(/^- /, '')}
                </Text>
              </View>
            ))}
          </View>
        );
      } else if (section.trim().startsWith('1. ')) {
        const items = section.split('\n').filter(item => /^\d+\. /.test(item.trim()));
        return (
          <View key={index} style={styles.numberedList}>
            {items.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.numberedItem}>
                <Text style={styles.numberedNumber}>{itemIndex + 1}.</Text>
                <Text style={styles.numberedText}>
                  {item.replace(/^\d+\. /, '')}
                </Text>
              </View>
            ))}
          </View>
        );
      } else {
        return (
          <Text key={index} style={styles.paragraph}>
            {section.trim()}
          </Text>
        );
      }
    });
  };

  const handleRelatedTopicPress = (relatedTopic: HelpTopic) => {
    (navigation as any).navigate('HelpTopicDetail', { topic: relatedTopic });
  };

  const handleWasHelpful = async (helpful: boolean) => {
    try {
      // Record feedback (could be extended to send to analytics)
      Alert.alert(
        'Thank you!',
        helpful ? 'We\'re glad this was helpful!' : 'We\'ll work to improve this content.'
      );
    } catch (error) {
      console.error('Record feedback error:', error);
    }
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {topic.title}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topicHeader}>
            <Text style={styles.topicTitle}>{topic.title}</Text>
            <View style={styles.topicMeta}>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(topic.category) }]}>
                <Text style={styles.categoryBadgeText}>
                  {topic.category.replace('-', ' ').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.lastUpdated}>
                Updated: {new Date(topic.lastUpdated).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View style={styles.contentContainer}>
            {renderContentSection(topic.content)}
          </View>

          {topic.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              <Text style={styles.tagsTitle}>Tags:</Text>
              <View style={styles.tagsList}>
                {topic.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackTitle}>Was this helpful?</Text>
            <View style={styles.feedbackButtons}>
              <TouchableOpacity
                style={[styles.feedbackButton, styles.helpfulButton]}
                onPress={() => handleWasHelpful(true)}
              >
                <Text style={styles.feedbackButtonText}>👍 Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.feedbackButton, styles.notHelpfulButton]}
                onPress={() => handleWasHelpful(false)}
              >
                <Text style={styles.feedbackButtonText}>👎 No</Text>
              </TouchableOpacity>
            </View>
          </View>

          {relatedTopics.length > 0 && (
            <View style={styles.relatedContainer}>
              <Text style={styles.relatedTitle}>Related Topics</Text>
              {relatedTopics.map((relatedTopic) => (
                <TouchableOpacity
                  key={relatedTopic.id}
                  style={styles.relatedItem}
                  onPress={() => handleRelatedTopicPress(relatedTopic)}
                >
                  <Text style={styles.relatedItemTitle}>{relatedTopic.title}</Text>
                  <Text style={styles.relatedItemPreview} numberOfLines={2}>
                    {relatedTopic.content.replace(/[#*`]/g, '').substring(0, 100)}...
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headerSpacer: {
    width: 60, // Same width as back button to center the title
  },
  content: {
    flex: 1,
  },
  topicHeader: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  topicTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  topicMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lastUpdated: {
    color: '#ffffff',
    opacity: 0.7,
    fontSize: 12,
  },
  contentContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
    lineHeight: 24,
    marginBottom: 15,
  },
  bulletList: {
    marginBottom: 15,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bulletPoint: {
    color: '#ffffff',
    fontSize: 16,
    marginRight: 10,
    opacity: 0.8,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
    lineHeight: 22,
  },
  numberedList: {
    marginBottom: 15,
  },
  numberedItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  numberedNumber: {
    color: '#ffffff',
    fontSize: 16,
    marginRight: 10,
    opacity: 0.8,
    fontWeight: 'bold',
  },
  numberedText: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
    lineHeight: 22,
  },
  tagsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  tagsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    color: '#ffffff',
    fontSize: 12,
    opacity: 0.8,
  },
  feedbackContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    textAlign: 'center',
  },
  feedbackButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  feedbackButton: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  helpfulButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
  },
  notHelpfulButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
  },
  feedbackButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  relatedContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  relatedItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  relatedItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  relatedItemPreview: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
    lineHeight: 20,
  },
});
