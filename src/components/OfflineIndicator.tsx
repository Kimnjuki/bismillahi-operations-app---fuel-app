import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useOffline } from '../hooks/useOffline';

interface OfflineIndicatorProps {
  onSyncPress?: () => void;
  showSyncButton?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  onSyncPress,
  showSyncButton = true,
}) => {
  const { isOnline, syncStatus, syncAllData } = useOffline();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-50));

  useEffect(() => {
    if (!isOnline) {
      // Show indicator when offline
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Hide indicator when online
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOnline, fadeAnim, slideAnim]);

  const handleSyncPress = async () => {
    if (onSyncPress) {
      onSyncPress();
    } else {
      try {
        await syncAllData();
        Alert.alert('Sync Complete', 'Data has been synchronized successfully.');
      } catch (error) {
        Alert.alert('Sync Failed', 'Failed to synchronize data. Please try again.');
      }
    }
  };

  if (isOnline) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.leftContent}>
          <MaterialIcons name="wifi-off" size={20} color="#FFF" />
          <Text style={styles.text}>You're offline</Text>
          {syncStatus?.pendingOperations && syncStatus.pendingOperations > 0 && (
            <Text style={styles.pendingText}>
              {syncStatus.pendingOperations} pending operations
            </Text>
          )}
        </View>

        {showSyncButton && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSyncPress}
            activeOpacity={0.7}
          >
            <MaterialIcons name="sync" size={20} color="#FFF" />
            <Text style={styles.syncText}>Sync</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 44, // Account for status bar
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  text: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  pendingText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 8,
    opacity: 0.8,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  syncText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});