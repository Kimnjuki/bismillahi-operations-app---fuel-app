import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { assetService, AssetMetadata } from '../services/assetService';

export default function AssetManagementScreen() {
  const { appUser } = useAuth();
  const [assets, setAssets] = useState<AssetMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AssetMetadata['category'] | 'all'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [stats, setStats] = useState({
    totalAssets: 0,
    totalSize: 0,
    categories: {} as Record<string, { count: number; size: number }>,
  });

  const categories = [
    { key: 'all', label: 'All Assets' },
    { key: 'receipt', label: 'Receipts' },
    { key: 'invoice', label: 'Invoices' },
    { key: 'document', label: 'Documents' },
    { key: 'profile', label: 'Profiles' },
    { key: 'logo', label: 'Logos' },
    { key: 'other', label: 'Other' },
  ];

  useEffect(() => {
    initializeAssetService();
    loadAssets();
    loadStats();
  }, []);

  const initializeAssetService = async () => {
    try {
      await assetService.initialize();
    } catch (error) {
      console.error('Asset service initialization error:', error);
      Alert.alert('Error', 'Failed to initialize asset service');
    }
  };

  const loadAssets = async () => {
    setLoading(true);
    try {
      const allAssets = await assetService.getAllAssets();
      setAssets(allAssets);
    } catch (error) {
      console.error('Load assets error:', error);
      Alert.alert('Error', 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const storageStats = await assetService.getStorageStats();
      setStats(storageStats);
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const handlePickImage = async (category: AssetMetadata['category']) => {
    try {
      const imageUri = await assetService.pickImage({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (imageUri) {
        const metadata = await assetService.processAndSaveAsset(
          imageUri,
          category,
          undefined,
          `Uploaded ${category} image`,
          [category]
        );

        setAssets(prev => [metadata, ...prev]);
        loadStats();
        Alert.alert('Success', 'Image uploaded and processed successfully!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload image');
    }
  };

  const handleTakePhoto = async (category: AssetMetadata['category']) => {
    try {
      const imageUri = await assetService.takePhoto({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (imageUri) {
        const metadata = await assetService.processAndSaveAsset(
          imageUri,
          category,
          undefined,
          `Captured ${category} photo`,
          [category]
        );

        setAssets(prev => [metadata, ...prev]);
        loadStats();
        Alert.alert('Success', 'Photo captured and processed successfully!');
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    Alert.alert(
      'Delete Asset',
      'Are you sure you want to delete this asset?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const deleted = await assetService.deleteAsset(assetId);
              if (deleted) {
                setAssets(prev => prev.filter(asset => asset.id !== assetId));
                loadStats();
                Alert.alert('Success', 'Asset deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete asset');
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete asset');
            }
          },
        },
      ]
    );
  };

  const handleCleanup = async () => {
    Alert.alert(
      'Cleanup Old Assets',
      'This will delete assets older than 30 days. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cleanup',
          onPress: async () => {
            try {
              const deletedCount = await assetService.cleanupOldAssets(30);
              Alert.alert('Cleanup Complete', `Deleted ${deletedCount} old assets`);
              loadAssets();
              loadStats();
            } catch (error) {
              console.error('Cleanup error:', error);
              Alert.alert('Error', 'Failed to cleanup old assets');
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredAssets = selectedCategory === 'all' 
    ? assets 
    : assets.filter(asset => asset.category === selectedCategory);

  const renderAssetItem = ({ item }: { item: AssetMetadata }) => (
    <View style={styles.assetItem}>
      <View style={styles.assetImageContainer}>
        <Image
          source={{ uri: (assetService.getAssetUri(item.id, true) as any) || '' }}
          style={styles.assetThumbnail}
          defaultSource={require('../../assets/icon.png')}
        />
      </View>
      <View style={styles.assetInfo}>
        <Text style={styles.assetFilename} numberOfLines={1}>
          {item.filename}
        </Text>
        <Text style={styles.assetCategory}>
          {item.category.toUpperCase()}
        </Text>
        <Text style={styles.assetSize}>
          {formatFileSize(item.compressedSize)} • {item.width}x{item.height}
        </Text>
        <Text style={styles.assetDate}>
          {new Date(item.uploadedAt).toLocaleDateString()}
        </Text>
        {item.description && (
          <Text style={styles.assetDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteAsset(item.id)}
      >
        <Text style={styles.deleteButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  const renderUploadModal = () => (
    <Modal
      visible={showUploadModal}
      transparent
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Upload Asset</Text>
          
          <View style={styles.uploadSection}>
            <Text style={styles.uploadSectionTitle}>Select Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryButtons}>
                {categories.slice(1).map((category) => (
                  <TouchableOpacity
                    key={category.key}
                    style={styles.categoryButton}
                    onPress={() => {
                      setShowUploadModal(false);
                      Alert.alert(
                        'Upload Method',
                        'Choose how you want to add the image',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Camera',
                            onPress: () => handleTakePhoto(category.key as AssetMetadata['category']),
                          },
                          {
                            text: 'Gallery',
                            onPress: () => handlePickImage(category.key as AssetMetadata['category']),
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.categoryButtonText}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowUploadModal(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderStatsModal = () => (
    <Modal
      visible={showStatsModal}
      transparent
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Storage Statistics</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Assets</Text>
              <Text style={styles.statValue}>{stats.totalAssets}</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Size</Text>
              <Text style={styles.statValue}>{formatFileSize(stats.totalSize)}</Text>
            </View>
          </View>

          <View style={styles.categoryStats}>
            <Text style={styles.categoryStatsTitle}>By Category</Text>
            {Object.entries(stats.categories).map(([category, data]) => (
              <View key={category} style={styles.categoryStatItem}>
                <Text style={styles.categoryStatLabel}>
                  {category.toUpperCase()}
                </Text>
                <Text style={styles.categoryStatValue}>
                  {data.count} files • {formatFileSize(data.size)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cleanupButton}
              onPress={handleCleanup}
            >
              <Text style={styles.cleanupButtonText}>Cleanup Old Files</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowStatsModal(false)}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Asset Management</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.statsButton}
              onPress={() => setShowStatsModal(true)}
            >
              <Text style={styles.statsButtonText}>Stats</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => setShowUploadModal(true)}
            >
              <Text style={styles.uploadButtonText}>Upload</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.categoryFilter}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryFilterButtons}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.key}
                  style={[
                    styles.categoryFilterButton,
                    selectedCategory === category.key && styles.activeCategoryFilterButton,
                  ]}
                  onPress={() => setSelectedCategory(category.key as any)}
                >
                  <Text style={[
                    styles.categoryFilterButtonText,
                    selectedCategory === category.key && styles.activeCategoryFilterButtonText,
                  ]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.assetsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.loadingText}>Loading assets...</Text>
            </View>
          ) : filteredAssets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No assets found</Text>
              <Text style={styles.emptySubtext}>
                Upload some images to get started
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredAssets}
              renderItem={renderAssetItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.assetsList}
            />
          )}
        </View>

        {renderUploadModal()}
        {renderStatsModal()}
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
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  statsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statsButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  uploadButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  categoryFilter: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  categoryFilterButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryFilterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  activeCategoryFilterButton: {
    backgroundColor: '#ffffff',
  },
  categoryFilterButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  activeCategoryFilterButtonText: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  assetsContainer: {
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
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  emptySubtext: {
    color: '#ffffff',
    opacity: 0.7,
    fontSize: 14,
  },
  assetsList: {
    paddingBottom: 20,
  },
  assetItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetImageContainer: {
    marginRight: 15,
  },
  assetThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  assetInfo: {
    flex: 1,
  },
  assetFilename: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  assetCategory: {
    color: '#ffffff',
    opacity: 0.8,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  assetSize: {
    color: '#ffffff',
    opacity: 0.7,
    fontSize: 12,
    marginBottom: 2,
  },
  assetDate: {
    color: '#ffffff',
    opacity: 0.6,
    fontSize: 11,
    marginBottom: 4,
  },
  assetDescription: {
    color: '#ffffff',
    opacity: 0.8,
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  uploadSection: {
    marginBottom: 20,
  },
  uploadSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryStats: {
    marginBottom: 20,
  },
  categoryStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  categoryStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryStatLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  categoryStatValue: {
    fontSize: 14,
    color: '#666',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cleanupButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cleanupButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
