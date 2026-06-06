import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

interface SaleItem {
  id: string;
  product: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface SalesReceipt {
  id: string;
  receiptNumber: string;
  date: string;
  time: string;
  station: string;
  cashier: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
}

export default function SalesReceiptScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { appUser } = useAuth();
  const [receipt, setReceipt] = useState<SalesReceipt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReceipt();
  }, []);

  const loadReceipt = () => {
    // Mock receipt data - in real app, this would come from route params or API
    const mockReceipt: SalesReceipt = {
      id: '1',
      receiptNumber: 'RCP-2024-001',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      station: 'ISSIRO STATION',
      cashier: appUser?.full_name || 'Cashier',
      items: [
        {
          id: '1',
          product: 'Petrol (Premium)',
          quantity: 25.5,
          unitPrice: 1500,
          total: 38250,
        },
        {
          id: '2',
          product: 'Diesel',
          quantity: 15.0,
          unitPrice: 1400,
          total: 21000,
        },
      ],
      subtotal: 59250,
      tax: 0,
      total: 59250,
      paymentMethod: 'Cash',
      customerName: 'John Doe',
      customerPhone: '+243 123 456 789',
    };

    setReceipt(mockReceipt);
    setLoading(false);
  };

  const handleShare = async () => {
    if (!receipt) return;

    try {
      const receiptText = generateReceiptText(receipt);
      await Share.share({
        message: receiptText,
        title: 'Sales Receipt',
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share receipt');
    }
  };

  const generateReceiptText = (receipt: SalesReceipt) => {
    let text = `BISMILLAHI OPERATIONS\n`;
    text += `Sales Receipt\n`;
    text += `Receipt #: ${receipt.receiptNumber}\n`;
    text += `Date: ${receipt.date} ${receipt.time}\n`;
    text += `Station: ${receipt.station}\n`;
    text += `Cashier: ${receipt.cashier}\n\n`;
    
    if (receipt.customerName) {
      text += `Customer: ${receipt.customerName}\n`;
    }
    if (receipt.customerPhone) {
      text += `Phone: ${receipt.customerPhone}\n`;
    }
    
    text += `\nItems:\n`;
    receipt.items.forEach(item => {
      text += `${item.product}\n`;
      text += `${item.quantity} x ${item.unitPrice.toLocaleString()} = ${item.total.toLocaleString()}\n`;
    });
    
    text += `\nSubtotal: ${receipt.subtotal.toLocaleString()}\n`;
    if (receipt.tax > 0) {
      text += `Tax: ${receipt.tax.toLocaleString()}\n`;
    }
    text += `Total: ${receipt.total.toLocaleString()}\n`;
    text += `Payment: ${receipt.paymentMethod}\n\n`;
    text += `Thank you for your business!`;
    
    return text;
  };

  const handlePrint = () => {
    Alert.alert(
      'Print Receipt',
      'Print functionality would be implemented here',
      [{ text: 'OK' }]
    );
  };

  const handleNewSale = () => {
    navigation.navigate('SalesEntry' as never);
  };

  if (loading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading receipt...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!receipt) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Receipt not found</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadReceipt}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sales Receipt</Text>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Receipt Card */}
          <View style={styles.receiptCard}>
            {/* Header */}
            <View style={styles.receiptHeader}>
              <Text style={styles.companyName}>BISMILLAHI OPERATIONS</Text>
              <Text style={styles.receiptTitle}>Sales Receipt</Text>
              <Text style={styles.receiptNumber}>#{receipt.receiptNumber}</Text>
            </View>

            {/* Receipt Info */}
            <View style={styles.receiptInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>{receipt.date}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Time:</Text>
                <Text style={styles.infoValue}>{receipt.time}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Station:</Text>
                <Text style={styles.infoValue}>{receipt.station}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cashier:</Text>
                <Text style={styles.infoValue}>{receipt.cashier}</Text>
              </View>
            </View>

            {/* Customer Info */}
            {(receipt.customerName || receipt.customerPhone) && (
              <View style={styles.customerInfo}>
                <Text style={styles.sectionTitle}>Customer Information</Text>
                {receipt.customerName && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Name:</Text>
                    <Text style={styles.infoValue}>{receipt.customerName}</Text>
                  </View>
                )}
                {receipt.customerPhone && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phone:</Text>
                    <Text style={styles.infoValue}>{receipt.customerPhone}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Items */}
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>Items</Text>
              {receipt.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.product}</Text>
                    <Text style={styles.itemDetails}>
                      {item.quantity} x {item.unitPrice.toLocaleString()}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>
                    {item.total.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>

            {/* Totals */}
            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal:</Text>
                <Text style={styles.totalValue}>
                  {receipt.subtotal.toLocaleString()}
                </Text>
              </View>
              {receipt.tax > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax:</Text>
                  <Text style={styles.totalValue}>
                    {receipt.tax.toLocaleString()}
                  </Text>
                </View>
              )}
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total:</Text>
                <Text style={styles.grandTotalValue}>
                  {receipt.total.toLocaleString()}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Payment:</Text>
                <Text style={styles.totalValue}>{receipt.paymentMethod}</Text>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.receiptFooter}>
              <Text style={styles.footerText}>Thank you for your business!</Text>
              <Text style={styles.footerText}>Visit us again soon</Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
            <Ionicons name="print" size={20} color="#667eea" />
            <Text style={styles.printButtonText}>Print</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newSaleButton} onPress={handleNewSale}>
            <Ionicons name="add-circle" size={20} color="#ffffff" />
            <Text style={styles.newSaleButtonText}>New Sale</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ffffff',
    fontSize: 18,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  shareButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  receiptCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 15,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  receiptTitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 5,
  },
  receiptNumber: {
    fontSize: 14,
    color: '#999999',
  },
  receiptInfo: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333333',
  },
  customerInfo: {
    marginBottom: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
  },
  itemsSection: {
    marginBottom: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: 12,
    color: '#666666',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  totalsSection: {
    marginBottom: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666666',
  },
  totalValue: {
    fontSize: 14,
    color: '#333333',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 8,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  receiptFooter: {
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 15,
  },
  printButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  printButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
  },
  newSaleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  newSaleButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});