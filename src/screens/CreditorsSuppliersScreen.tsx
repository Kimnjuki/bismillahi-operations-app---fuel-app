import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { creditorSupplierService } from '../services/creditorSupplierService';
import { Creditor, Supplier, CreditorSupplierSummary, CreditorSupplierType } from '../types';

type TabType = 'creditors' | 'suppliers';

export default function CreditorsSuppliersScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabType>('creditors');
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [summary, setSummary] = useState<CreditorSupplierSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Sample data
  const sampleCreditors: Creditor[] = [
    {
      id: '1',
      name: 'ABC Fuel Suppliers',
      type: 'creditor',
      currency: 'CDF',
      memo: 'Primary fuel supplier',
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'XYZ Equipment Co.',
      type: 'creditor',
      currency: 'CDF',
      memo: 'Equipment maintenance supplier',
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
    },
  ];

  const sampleSuppliers: Supplier[] = [
    {
      id: '1',
      name: 'DEF Transport Services',
      type: 'supplier',
      currency: 'CDF',
      memo: 'Reliable transport services',
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'GHI Service Providers',
      type: 'supplier',
      currency: 'CDF',
      memo: 'General service provider',
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
    },
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load creditors
      const creditorsResponse = await creditorSupplierService.getCreditors();
      if (creditorsResponse.success && creditorsResponse.data) {
        setCreditors(creditorsResponse.data);
      } else {
        setCreditors(sampleCreditors);
      }

      // Load suppliers
      const suppliersResponse = await creditorSupplierService.getSuppliers();
      if (suppliersResponse.success && suppliersResponse.data) {
        setSuppliers(suppliersResponse.data);
      } else {
        setSuppliers(sampleSuppliers);
      }

      // Load summary
      const summaryResponse = await creditorSupplierService.getCreditorSupplierSummary();
      if (summaryResponse.success && summaryResponse.data) {
        setSummary(summaryResponse.data);
      } else {
        setSummary({
          total_creditors: sampleCreditors.length,
          total_suppliers: sampleSuppliers.length,
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Use sample data on error
      setCreditors(sampleCreditors);
      setSuppliers(sampleSuppliers);
      setSummary({
        total_creditors: sampleCreditors.length,
        total_suppliers: sampleSuppliers.length,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sampleCreditors, sampleSuppliers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleAddNew = () => {
    (navigation as any).navigate('AddCreditorSupplier', { type: activeTab.slice(0, -1) as 'creditor' | 'supplier' });
  };

  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab);
    setSearchQuery('');
    setShowSearch(false);
  };

  const handleItemPress = (item: Creditor | Supplier) => {
    Alert.alert(
      item.name,
      `Type: ${item.type}\nCurrency: ${item.currency}\nMemo: ${item.memo || 'N/A'}\nCreated: ${new Date(item.created_at).toLocaleDateString()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => console.log('Edit item') },
        { text: 'Delete', onPress: () => handleDeleteItem(item) },
      ]
    );
  };

  const handleDeleteItem = async (item: Creditor | Supplier) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete ${item.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = item.type === 'creditor' 
                ? await creditorSupplierService.deleteCreditor(item.id)
                : await creditorSupplierService.deleteSupplier(item.id);
              
              if (response.success) {
                // Update local state
                if (item.type === 'creditor') {
                  setCreditors(prev => prev.filter(c => c.id !== item.id));
                } else {
                  setSuppliers(prev => prev.filter(s => s.id !== item.id));
                }
                
                Alert.alert('Success', 'Item deleted successfully');
              } else {
                Alert.alert('Error', response.error || 'Failed to delete item');
              }
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          }
        },
      ]
    );
  };

  const getTypeColor = (type: 'creditor' | 'supplier') => {
    switch (type) {
      case 'creditor':
        return '#FF6B35';
      case 'supplier':
        return '#4CAF50';
      default:
        return '#F0C38E';
    }
  };

  const getTypeText = (type: 'creditor' | 'supplier') => {
    switch (type) {
      case 'creditor':
        return 'Creditor';
      case 'supplier':
        return 'Supplier';
      default:
        return type;
    }
  };

  const renderTabButton = (tab: TabType, label: string) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => handleTabPress(tab)}
    >
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label}
      </Text>
      {activeTab === tab && <View style={styles.tabUnderline} />}
    </TouchableOpacity>
  );

  const renderSummaryCard = () => {
    if (!summary) return null;

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Overview</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Creditors</Text>
            <Text style={styles.summaryValue}>{summary.total_creditors}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Suppliers</Text>
            <Text style={styles.summaryValue}>{summary.total_suppliers}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderItemCard = (item: Creditor | Supplier) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.itemCard}
      onPress={() => handleItemPress(item)}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) }]}>
          <Text style={styles.typeText}>{getTypeText(item.type)}</Text>
        </View>
      </View>
      
      <Text style={styles.currency}>Currency: {item.currency}</Text>
      {item.memo && <Text style={styles.memo}>Memo: {item.memo}</Text>}
      
      <Text style={styles.createdDate}>
        Created: {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  const filteredItems = () => {
    const items = activeTab === 'creditors' ? creditors : suppliers;
    if (!searchQuery.trim()) return items;
    
    return items.filter(item => {
      const query = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(query) || 
             (item.memo && item.memo.toLowerCase().includes(query));
    });
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <LinearGradient colors={['#312C51', '#48426D']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Creditors & Suppliers</Text>
          <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
            <Ionicons name="search" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        {showSearch && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={`Search ${activeTab}...`}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close" size={20} color="#F0C38E" />
            </TouchableOpacity>
          </View>
        )}

        {/* Summary Card */}
        {renderSummaryCard()}

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {renderTabButton('creditors', 'Creditors')}
          {renderTabButton('suppliers', 'Suppliers')}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeTab === 'creditors' ? 'Creditors' : 'Suppliers'} 
              ({filteredItems().length})
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
              <Ionicons name="add" size={20} color="#312C51" />
              <Text style={styles.addButtonText}>Add New</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.itemsList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : filteredItems().length > 0 ? (
              filteredItems().map(renderItemCard)
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No matching items found' : `No ${activeTab} found`}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? 'Try a different search term' : `Add a new ${activeTab.slice(0, -1)} to get started`}
                </Text>
              </View>
            )}
          </ScrollView>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    paddingVertical: 8,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F0C38E',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  activeTabButton: {
    // Active tab styling handled by text color
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  activeTabText: {
    color: '#F0C38E',
    fontWeight: 'bold',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#F0C38E',
    borderRadius: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0C38E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#312C51',
    marginLeft: 4,
  },
  itemsList: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  currency: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  memo: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  createdDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
