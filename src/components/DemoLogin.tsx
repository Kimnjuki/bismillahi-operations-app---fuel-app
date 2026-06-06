import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

const demoUsers = [
  {
    email: 'admin@bismillahi.com',
    password: 'admin123',
    role: 'admin',
    name: 'Admin User'
  },
  {
    email: 'manager@bismillahi.com',
    password: 'manager123',
    role: 'manager',
    name: 'Manager User'
  },
  {
    email: 'cashier@bismillahi.com',
    password: 'cashier123',
    role: 'cashier',
    name: 'Cashier User'
  },
  {
    email: 'viewer@bismillahi.com',
    password: 'viewer123',
    role: 'viewer',
    name: 'Viewer User'
  }
];

export default function DemoLogin() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleDemoLogin = async (user: typeof demoUsers[0]) => {
    try {
      setLoading(user.role);
      const result = await signIn({ user_code: user.email, pin: '1234' });
      if (result.error) {
        Alert.alert('Login Failed', result.error.message);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Demo Login</Text>
      <Text style={styles.subtitle}>Choose a demo user to login with:</Text>
      
      {demoUsers.map((user) => (
        <TouchableOpacity
          key={user.role}
          style={[styles.demoButton, styles[`${user.role}Button` as keyof typeof styles] as any]}
          onPress={() => handleDemoLogin(user)}
          disabled={loading === user.role}
        >
          <Text style={styles.buttonText}>
            {loading === user.role ? 'Logging in...' : `${user.name} (${user.role})`}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  demoButton: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  adminButton: {
    backgroundColor: '#FF6B6B',
  },
  managerButton: {
    backgroundColor: '#4ECDC4',
  },
  cashierButton: {
    backgroundColor: '#45B7D1',
  },
  viewerButton: {
    backgroundColor: '#96CEB4',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});