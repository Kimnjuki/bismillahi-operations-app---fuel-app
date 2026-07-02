import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';
import { generateAssetId } from '../utils/uuid';

export interface AssetConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  compression: number;
}

export interface AssetMetadata {
  id: string;
  filename: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  format: string;
  uploadedAt: string;
  category: 'receipt' | 'invoice' | 'document' | 'profile' | 'logo' | 'other';
  description?: string;
  tags?: string[];
}

class AssetService {
  private readonly ASSETS_DIR = `assets/`;
  private readonly THUMBNAILS_DIR = `thumbnails/`;
  private readonly METADATA_FILE = `asset_metadata.json`;

  private defaultConfig: AssetConfig = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.8,
    format: 'jpeg',
    compression: 0.8,
  };

  async initialize(): Promise<void> {
    try {
      // Create directories if they don't exist
      await this.ensureDirectoryExists(this.ASSETS_DIR);
      await this.ensureDirectoryExists(this.THUMBNAILS_DIR);
      
      // Initialize metadata file if it doesn't exist
      const metadataExists = await FileSystem.getInfoAsync(this.METADATA_FILE);
      if (!metadataExists.exists) {
        await FileSystem.writeAsStringAsync(this.METADATA_FILE, JSON.stringify([]));
      }
    } catch (error) {
      console.error('Asset service initialization error:', error);
      throw error;
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(dirPath);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }
  }

  async pickImage(options?: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }): Promise<string | null> {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photo library');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options?.allowsEditing || true,
        aspect: options?.aspect || [4, 3],
        quality: options?.quality || 1,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
      return null;
    }
  }

  async takePhoto(options?: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }): Promise<string | null> {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your camera');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: options?.allowsEditing || true,
        aspect: options?.aspect || [4, 3],
        quality: options?.quality || 1,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
      return null;
    }
  }

  async processAndSaveAsset(
    imageUri: string,
    category: AssetMetadata['category'],
    config?: Partial<AssetConfig>,
    description?: string,
    tags?: string[]
  ): Promise<AssetMetadata> {
    try {
      const finalConfig = { ...this.defaultConfig, ...config };
      const assetId = this.generateAssetId();
      
      // Get original file info
      const originalInfo = await FileSystem.getInfoAsync(imageUri);
      if (!originalInfo.exists) {
        throw new Error('Original file not found');
      }

      // Process the image
      const processedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            resize: {
              width: finalConfig.maxWidth,
              height: finalConfig.maxHeight,
            },
          },
        ],
        {
          compress: finalConfig.compression,
          format: ImageManipulator.SaveFormat[finalConfig.format.toUpperCase() as keyof typeof ImageManipulator.SaveFormat],
        }
      );

      // Generate filenames
      const filename = `${assetId}.${finalConfig.format}`;
      const thumbnailFilename = `${assetId}_thumb.${finalConfig.format}`;
      
      // Save processed image
      const assetPath = `${this.ASSETS_DIR}${filename}`;
      await FileSystem.copyAsync({
        from: processedImage.uri,
        to: assetPath,
      });

      // Create thumbnail
      const thumbnail = await ImageManipulator.manipulateAsync(
        processedImage.uri,
        [
          {
            resize: {
              width: 300,
              height: 300,
            },
          },
        ],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      const thumbnailPath = `${this.THUMBNAILS_DIR}${thumbnailFilename}`;
      await FileSystem.copyAsync({
        from: thumbnail.uri,
        to: thumbnailPath,
      });

      // Get file sizes
      const assetInfo = await FileSystem.getInfoAsync(assetPath);
      const thumbnailInfo = await FileSystem.getInfoAsync(thumbnailPath);

      // Create metadata
      const metadata: AssetMetadata = {
        id: assetId,
        filename,
        originalSize: originalInfo.size || 0,
        compressedSize: (assetInfo as any).size || 0,
        width: processedImage.width,
        height: processedImage.height,
        format: finalConfig.format,
        uploadedAt: new Date().toISOString(),
        category,
        description,
        tags: tags || [],
      };

      // Save metadata
      await this.saveMetadata(metadata);

      return metadata;
    } catch (error) {
      console.error('Asset processing error:', error);
      throw error;
    }
  }

  async getAssetUri(assetId: string, thumbnail = false): Promise<string | null> {
    try {
      const metadata = await this.getMetadata(assetId);
      if (!metadata) {
        return null;
      }

      const dir = thumbnail ? this.THUMBNAILS_DIR : this.ASSETS_DIR;
      const filename = thumbnail ? metadata.filename.replace('.', '_thumb.') : metadata.filename;
      const filePath = `${dir}${filename}`;

      const fileInfo = await FileSystem.getInfoAsync(filePath);
      return fileInfo.exists ? filePath : null;
    } catch (error) {
      console.error('Get asset URI error:', error);
      return null;
    }
  }

  async getAllAssets(category?: AssetMetadata['category']): Promise<AssetMetadata[]> {
    try {
      const metadata = await this.loadAllMetadata();
      return category ? metadata.filter(asset => asset.category === category) : metadata;
    } catch (error) {
      console.error('Get all assets error:', error);
      return [];
    }
  }

  async deleteAsset(assetId: string): Promise<boolean> {
    try {
      const metadata = await this.getMetadata(assetId);
      if (!metadata) {
        return false;
      }

      // Delete asset files
      const assetPath = `${this.ASSETS_DIR}${metadata.filename}`;
      const thumbnailPath = `${this.THUMBNAILS_DIR}${metadata.filename.replace('.', '_thumb.')}`;

      await Promise.all([
        FileSystem.deleteAsync(assetPath, { idempotent: true }),
        FileSystem.deleteAsync(thumbnailPath, { idempotent: true }),
      ]);

      // Remove from metadata
      await this.removeMetadata(assetId);

      return true;
    } catch (error) {
      console.error('Delete asset error:', error);
      return false;
    }
  }

  async updateAssetMetadata(
    assetId: string,
    updates: Partial<Pick<AssetMetadata, 'description' | 'tags' | 'category'>>
  ): Promise<boolean> {
    try {
      const metadata = await this.loadAllMetadata();
      const assetIndex = metadata.findIndex(asset => asset.id === assetId);
      
      if (assetIndex === -1) {
        return false;
      }

      metadata[assetIndex] = { ...metadata[assetIndex], ...updates };
      await FileSystem.writeAsStringAsync(this.METADATA_FILE, JSON.stringify(metadata));

      return true;
    } catch (error) {
      console.error('Update asset metadata error:', error);
      return false;
    }
  }

  async getStorageStats(): Promise<{
    totalAssets: number;
    totalSize: number;
    categories: Record<string, { count: number; size: number }>;
  }> {
    try {
      const metadata = await this.loadAllMetadata();
      const stats = {
        totalAssets: metadata.length,
        totalSize: 0,
        categories: {} as Record<string, { count: number; size: number }>,
      };

      for (const asset of metadata) {
        stats.totalSize += asset.compressedSize;
        
        if (!stats.categories[asset.category]) {
          stats.categories[asset.category] = { count: 0, size: 0 };
        }
        
        stats.categories[asset.category].count++;
        stats.categories[asset.category].size += asset.compressedSize;
      }

      return stats;
    } catch (error) {
      console.error('Get storage stats error:', error);
      return { totalAssets: 0, totalSize: 0, categories: {} };
    }
  }

  async cleanupOldAssets(daysOld: number = 30): Promise<number> {
    try {
      const metadata = await this.loadAllMetadata();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const oldAssets = metadata.filter(asset => 
        new Date(asset.uploadedAt) < cutoffDate
      );

      let deletedCount = 0;
      for (const asset of oldAssets) {
        const deleted = await this.deleteAsset(asset.id);
        if (deleted) {
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Cleanup old assets error:', error);
      return 0;
    }
  }

  private generateAssetId(): string {
    return generateAssetId();
  }

  private async loadAllMetadata(): Promise<AssetMetadata[]> {
    try {
      const metadataString = await FileSystem.readAsStringAsync(this.METADATA_FILE);
      return JSON.parse(metadataString);
    } catch (error) {
      console.error('Load metadata error:', error);
      return [];
    }
  }

  private async saveMetadata(metadata: AssetMetadata): Promise<void> {
    try {
      const allMetadata = await this.loadAllMetadata();
      allMetadata.push(metadata);
      await FileSystem.writeAsStringAsync(this.METADATA_FILE, JSON.stringify(allMetadata));
    } catch (error) {
      console.error('Save metadata error:', error);
      throw error;
    }
  }

  private async getMetadata(assetId: string): Promise<AssetMetadata | null> {
    try {
      const allMetadata = await this.loadAllMetadata();
      return allMetadata.find(asset => asset.id === assetId) || null;
    } catch (error) {
      console.error('Get metadata error:', error);
      return null;
    }
  }

  private async removeMetadata(assetId: string): Promise<void> {
    try {
      const allMetadata = await this.loadAllMetadata();
      const filteredMetadata = allMetadata.filter(asset => asset.id !== assetId);
      await FileSystem.writeAsStringAsync(this.METADATA_FILE, JSON.stringify(filteredMetadata));
    } catch (error) {
      console.error('Remove metadata error:', error);
      throw error;
    }
  }

  // Utility methods for common asset operations
  async optimizeImageForReceipt(imageUri: string | null): Promise<string> {
    if (!imageUri) return 'default';
    const metadata = await this.processAndSaveAsset(imageUri, 'receipt', {
      maxWidth: 1200,
      maxHeight: 1600,
      quality: 0.9,
      format: 'jpeg',
      compression: 0.8,
    });
    const assetUri = await this.getAssetUri(metadata.id);
    return (assetUri ?? imageUri) as string;
  }

  async optimizeImageForProfile(imageUri: string | null): Promise<string> {
    if (!imageUri) return 'default';
    const metadata = await this.processAndSaveAsset(imageUri, 'profile', {
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.8,
      format: 'jpeg',
      compression: 0.7,
    });
    const assetUri = await this.getAssetUri(metadata.id);
    return (assetUri ?? imageUri) as string;
  }

  async optimizeImageForDocument(imageUri: string | null): Promise<string> {
    if (!imageUri) return 'default';
    const metadata = await this.processAndSaveAsset(imageUri, 'document', {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.85,
      format: 'jpeg',
      compression: 0.8,
    });
    const assetUri = await this.getAssetUri(metadata.id);
    return (assetUri ?? imageUri) as string;
  }
}

export const assetService = new AssetService();
