import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

interface ReportData {
  id: string;
  type: 'sales' | 'expenses' | 'stock';
  title: string;
  date: string;
  amount: number;
  description: string;
}

export default function ReportsScreen() {
  const { appUser } = useAuth();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [showDateModal, setShowDateModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    loadReports();
  }, [selectedPeriod]);

  const loadReports = async () => {
    try {
      setLoading(true);
      
      // Mock data for demonstration
      const mockReports: ReportData[] = [
        {
          id: '1',
          type: 'sales',
          title: 'Daily Sales Report',
          date: new Date().toISOString(),
          amount: 150000,
          description: 'Total sales for today',
        },
        {
          id: '2',
          type: 'expenses',
          title: 'Daily Expenses Report',
          date: new Date().toISOString(),
          amount: 25000,
          description: 'Total expenses for today',
        },
        {
          id: '3',
          type: 'stock',
          title: 'Stock Level Report',
          date: new Date().toISOString(),
          amount: 0,
          description: 'Current stock levels',
        },
      ];

      setReports(mockReports);
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const handleExportFormat = (format: string) => {
    Alert.alert('Export', `Exporting reports in ${format} format...`);
      setShowExportModal(false);
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'sales': return '💰';
      case 'expenses': return '💸';
      case 'stock': return '📦';
      default: return '📊';
    }
  };

  const getReportColor = (type: string) => {
    switch (type) {
      case 'sales': return '#4CAF50';
      case 'expenses': return '#FF9800';
      case 'stock': return '#2196F3';
      default: return '#667eea';
    }
  };

  const renderReportItem = ({ item }: { item: ReportData }) => (
    <View style={styles.reportItem}>
      <View style={styles.reportHeader}>
        <Text style={styles.reportIcon}>{getReportIcon(item.type)}</Text>
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle}>{item.title}</Text>
          <Text style={styles.reportDate}>{new Date(item.date).toLocaleDateString()}</Text>
        </View>
        {item.amount > 0 && (
          <Text style={[styles.reportAmount, { color: getReportColor(item.type) }]}>
            ₦{item.amount.toLocaleString()}
      </Text>
        )}
      </View>
      <Text style={styles.reportDescription}>{item.description}</Text>
    </View>
  );

  const renderDateModal = () => (
      <Modal
        visible={showDateModal}
        animationType="slide"
      transparent={true}
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Period</Text>
          
          <View style={styles.periodOptions}>
            {['today', 'week', 'month', 'year'].map((period) => (
            <TouchableOpacity
                key={period}
                  style={[
                  styles.periodOption,
                  selectedPeriod === period && styles.periodOptionActive
              ]}
              onPress={() => {
                  setSelectedPeriod(period);
                  setShowDateModal(false);
              }}
            >
              <Text style={[
                  styles.periodOptionText,
                  selectedPeriod === period && styles.periodOptionTextActive
              ]}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        </View>
      </View>
    </Modal>
  );

  const renderExportModal = () => (
    <Modal
      visible={showExportModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowExportModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Export Format</Text>
          
          <View style={styles.exportOptions}>
            {['PDF', 'Excel', 'CSV'].map((format) => (
                <TouchableOpacity
                  key={format}
                style={styles.exportOption}
                onPress={() => handleExportFormat(format)}
              >
                <Text style={styles.exportOptionText}>{format}</Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reports</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.periodButton}
              onPress={() => setShowDateModal(true)}
            >
              <Text style={styles.periodButtonText}>
                {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
              <Text style={styles.exportButtonText}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={reports}
          renderItem={renderReportItem}
          keyExtractor={(item) => item.id}
          style={styles.reportsList}
          contentContainerStyle={styles.reportsListContent}
          showsVerticalScrollIndicator={false}
        />

        {renderDateModal()}
        {renderExportModal()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  periodButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  periodButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  exportButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exportButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  reportsList: {
    flex: 1,
  },
  reportsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  reportItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  reportDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  reportAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  reportDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  periodOptions: {
    padding: 20,
  },
  periodOption: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  periodOptionActive: {
    backgroundColor: '#667eea',
  },
  periodOptionText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  periodOptionTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  exportOptions: {
    padding: 20,
  },
  exportOption: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  exportOptionText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
});