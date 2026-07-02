$path = "c:\Users\Administrator\Desktop\fuelr\src\screens\ExpenseEntryScreen.tsx"
$content = @"
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  StatusBar,
  Alert,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing } from '../constants/theme';
import {
  EXPENSE_CATEGORIES,
  getCategoryIcon,
  getCategoryColor,
} from '../constants/expenseCategories';
import { generateUUID } from '../utils/uuid';
import { internalAccountService } from '../services/internalAccountService';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
"@
Set-Content -Path $path -Value $content
