import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useDashboardData } from '../hooks/useDashboardData';
import { SectionHeader } from '../components/SectionHeader';
import { EmptyState } from '../components/EmptyState';
import { Colors, Spacing, BorderRadius, Elevation, Typography } from '../constants/theme';

const { width } = Dimensions.get('window');

type FinanceTab = 'expenses' | 'transfers' | 'receivable' | 'payable';

export default function FinanceScreen() {
  const { hasPermission } = useAuth();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FinanceTab>('expenses');
  const { stats } = useDashboardData();

  const canManageFinance = hasPermission('manager');
  const isCashier = hasPermission('cashier');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshing(false);
  }, []);

  const handleNavigate = (screen: string) => {
    (navigation as any).navigate(screen);
  };

  // ===== TABS (Manager/Admin get all 4, Cashier gets only expenses) =====
  const availableTabs = hasPermission('manager') 
    ? [
        { key: 'expenses' as FinanceTab, label: 'Expenses', icon: 'receipt' },
        { key: 'transfers' as FinanceTab, label: 'Transfers', icon: 'bank-transfer' },
        { key: 'receivable' as FinanceTab, label: 'Receivable', icon: 'account-arrow-left' },
        { key: 'payable' as FinanceTab, label: 'Payable', icon: 'account-arrow-right' },
      ]
    : [{ key: 'expenses' as FinanceTab, label: 'Expenses', icon: 'receipt' }];

  const TabsRow = () => (
    <View style={styles.tabsRow}>
      {availableTabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          onPress={() => setActiveTab(tab.key)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={tab.icon as any}
            size={16}
            color={activeTab === tab.key ? Colors.brand.primary : Colors.neutral['400']}
          />
          <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ===== EXPENSES TAB =====
  const ExpensesTab = () => (
    <View>
      <TouchableOpacity style={styles.primaryAction} onPress={() => handleNavigate('ExpenseEntry')} activeOpacity={0.85}>
        <MaterialCommunityIcons name="receipt" size={32} color={Colors.white} />
        <View style={styles.primaryActionText}>
          <Text style={styles.primaryActionLabel}>Log an expense</Text>
          <Text style={styles.primaryActionSub}>Record and categorize expenses</Text>
        </View>
        <MaterialCommunityIcons name="arrow-right" size={24} color={Colors.white} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryAction} onPress={() => handleNavigate('ExpenseHistory')} activeOpacity={0.7}>
        <MaterialCommunityIcons name="history" size={22} color={Colors.semantic.warning} />
        <Text style={styles.secondaryActionLabel}>Expense History</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.neutral['500']} />
      </TouchableOpacity>

      <EmptyState icon="receipt" title="No expenses today" body="Record your first expense to see history here" />
    </View>
  );

  // ===== TRANSFERS TAB =====
  const TransfersTab = () => (
    <View>
      <TouchableOpacity
        style={[styles.primaryAction, { backgroundColor: Colors.semantic.warning }]}
        onPress={() => handleNavigate('NewTransfer')}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="bank-transfer" size={32} color={Colors.white} />
        <View style={styles.primaryActionText}>
          <Text style={styles.primaryActionLabel}>New transfer</Text>
          <Text style={styles.primaryActionSub}>Transfer funds between accounts</Text>
        </View>
        <MaterialCommunityIcons name="arrow-right" size={24} color={Colors.white} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryAction} onPress={() => handleNavigate('FundTransfer')} activeOpacity={0.7}>
        <MaterialCommunityIcons name="swap-horizontal" size={22} color={Colors.semantic.info} />
        <Text style={styles.secondaryActionLabel}>Transfer History</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.neutral['500']} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryAction} onPress={() => handleNavigate('ExchangeRate')} activeOpacity={0.7}>
        <MaterialCommunityIcons name="currency-usd" size={22} color={Colors.semantic.success} />
        <Text style={styles.secondaryActionLabel}>Exchange Rate</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.neutral['500']} />
      </TouchableOpacity>

      <EmptyState icon="bank-transfer" title="No transfers yet" body="Fund transfers will appear here" />
    </View>
  );

  // ===== RECEIVABLE TAB =====
  const ReceivableTab = () => (
    <View>
      <TouchableOpacity style={styles.primaryAction} onPress={() => handleNavigate('Accounts')} activeOpacity={0.85}>
        <MaterialCommunityIcons name="account-arrow-left" size={32} color={Colors.white} />
        <View style={styles.primaryActionText}>
          <Text style={styles.primaryActionLabel}>Accounts receivable</Text>
          <Text style={styles.primaryActionSub}>Money owed to the business</Text>
        </View>
        <MaterialCommunityIcons name="arrow-right" size={24} color={Colors.white} />
      </TouchableOpacity>
      <EmptyState icon="account-arrow-left" title="No receivables" body="AR records will appear here" />
    </View>
  );

  // ===== PAYABLE TAB =====
  const PayableTab = () => (
    <View>
      <TouchableOpacity style={[styles.primaryAction, { backgroundColor: Colors.semantic.warning }]} onPress={() => handleNavigate('Accounts')} activeOpacity={0.85}>
        <MaterialCommunityIcons name="account-arrow-right" size={32} color={Colors.white} />
        <View style={styles.primaryActionText}>
          <Text style={styles.primaryActionLabel}>Accounts payable</Text>
          <Text style={styles.primaryActionSub}>Money owed by the business</Text>
        </View>
        <MaterialCommunityIcons name="arrow-right" size={24} color={Colors.white} />
      </TouchableOpacity>
      <EmptyState icon="account-arrow-right" title="No payables" body="AP records will appear here" />
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Finance</Text>
            {canManageFinance && (
              <TouchableOpacity style={styles.rateButton} onPress={() => handleNavigate('ExchangeRate')} activeOpacity={0.7}>
                <MaterialCommunityIcons name="currency-usd" size={20} color={Colors.brand.primary} />
                <Text style={styles.rateButtonText}>Rate</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <MaterialCommunityIcons name="trending-down" size={22} color={Colors.semantic.danger} />
                <Text style={styles.summaryLabel}>Expenses</Text>
                <Text style={styles.summaryValue}>₣{(stats.todayExpenses || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <MaterialCommunityIcons name="account-arrow-left" size={22} color={Colors.semantic.info} />
                <Text style={styles.summaryLabel}>Receivable</Text>
                <Text style={styles.summaryValue}>₣0</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <MaterialCommunityIcons name="account-arrow-right" size={22} color={Colors.semantic.warning} />
                <Text style={styles.summaryLabel}>Payable</Text>
                <Text style={styles.summaryValue}>₣0</Text>
              </View>
            </View>
          </View>

          {/* Tabs */}
          <TabsRow />

          {/* Tab Content */}
          {activeTab === 'expenses' && <ExpensesTab />}
          {activeTab === 'transfers' && <TransfersTab />}
          {activeTab === 'receivable' && <ReceivableTab />}
          {activeTab === 'payable' && <PayableTab />}

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.app },
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  headerTitle: { fontSize: Typography.scale['2xl'], fontFamily: Typography.fontFamily.display, color: Colors.white },
  rateButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.brand.primarySurface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.round, borderWidth: 1, borderColor: Colors.brand.primary + '30' },
  rateButtonText: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.medium, color: Colors.brand.primary },

  summaryCard: { backgroundColor: Colors.background.card, marginHorizontal: Spacing.screenPadding, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.base, ...Elevation.sm },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center', flex: 1, gap: 4 },
  summaryLabel: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['400'] },
  summaryValue: { fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.display, color: Colors.white, fontVariant: ['tabular-nums'] },
  summaryDivider: { width: 1, backgroundColor: Colors.neutral['600'] },

  tabsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.screenPadding, marginBottom: Spacing.base, gap: Spacing.sm },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.round, backgroundColor: Colors.background.card, borderWidth: 1, borderColor: Colors.neutral['600'] },
  tabActive: { backgroundColor: Colors.brand.primarySurface, borderColor: Colors.brand.primary },
  tabLabel: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['400'] },
  tabLabelActive: { color: Colors.brand.primary },

  primaryAction: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.brand.primary, marginHorizontal: Spacing.screenPadding, marginBottom: Spacing.base, padding: Spacing.base, borderRadius: BorderRadius.lg, gap: Spacing.md, ...Elevation.md },
  primaryActionText: { flex: 1 },
  primaryActionLabel: { fontSize: Typography.scale.md, fontFamily: Typography.fontFamily.display, color: Colors.white },
  primaryActionSub: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.body, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  secondaryAction: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.screenPadding, marginBottom: Spacing.sm, paddingVertical: Spacing.md, paddingHorizontal: Spacing.base, backgroundColor: Colors.background.card, borderRadius: BorderRadius.md, gap: Spacing.md, borderWidth: 1, borderColor: Colors.neutral['600'] },
  secondaryActionLabel: { flex: 1, fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.medium, color: Colors.white },
});