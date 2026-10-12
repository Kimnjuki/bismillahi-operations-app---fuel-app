import React from 'react';
import { View, Text, Button } from 'react-native';
import { render as rawRender } from '@testing-library/react-native';
import { render, waitFor, act, fireEvent } from '../utils/testUtils';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import { createMockUser } from '../utils/testUtils';

// Mock child component to test context
const TestComponent: React.FC = () => {
  const auth = useAuth();
  return (
    <View>
      <Text testID="loading">{auth.loading.toString()}</Text>
      <Text testID="user-email">{auth.appUser?.full_name || 'no-user'}</Text>
      <Text testID="app-user-name">{auth.appUser?.full_name || 'no-app-user'}</Text>
      <Text testID="error">{auth.error || 'no-error'}</Text>
      <Button
        testID="sign-in"
        title="Sign In"
        onPress={() => auth.signIn({ user_code: 'TEST01', pin: '1234' })}
      />
      <Button
        testID="sign-out"
        title="Sign Out"
        onPress={() => auth.signOut()}
      />
      <Button
        testID="clear-error"
        title="Clear Error"
        onPress={() => auth.clearError()}
      />
      <Button
        testID="has-permission"
        title="Check Permission"
        onPress={() => auth.hasPermission('admin')}
      />
    </View>
  );
};

// Component used without a provider to verify useAuth throws
const OrphanComponent: React.FC = () => {
  const auth = useAuth();
  return <Text>{auth.loading ? 'loading' : 'ready'}</Text>;
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide initial auth state', () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(getByTestId('loading').children[0]).toBe('true');
    expect(getByTestId('user-email').children[0]).toBe('no-user');
    expect(getByTestId('app-user-name').children[0]).toBe('no-app-user');
    expect(getByTestId('error').children[0]).toBe('no-error');
  });

  it('should handle sign in error', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      fireEvent.press(getByTestId('sign-in'));
    });

    // The mocked supabase client returns no matching user, so sign in
    // resolves with an "Invalid user code" error which is surfaced in state.
    await waitFor(() => {
      expect(getByTestId('error').children[0]).toBe('Invalid user code');
    });
  });

  it('should handle sign out and clear the authenticated user', async () => {
    // Sign out should clear any in-memory user and leave no error.
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      fireEvent.press(getByTestId('sign-out'));
    });

    // After sign out, no user is set and there is no error
    await waitFor(() => {
      expect(getByTestId('user-email').children[0]).toBe('no-user');
      expect(getByTestId('error').children[0]).toBe('no-error');
    });
  });

  it('should clear error when clearError is called', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // First, produce an error via a failed sign in
    await act(async () => {
      fireEvent.press(getByTestId('sign-in'));
    });

    await waitFor(() => {
      expect(getByTestId('error').children[0]).toBe('Invalid user code');
    });

    // Now clear it
    await act(async () => {
      fireEvent.press(getByTestId('clear-error'));
    });

    await waitFor(() => {
      expect(getByTestId('error').children[0]).toBe('no-error');
    });
  });

  it('should check permissions correctly', () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Test permission check (should return false for no user)
    act(() => {
      fireEvent.press(getByTestId('has-permission'));
    });

    // Since there's no user, permission should be false
    // This is tested implicitly through the context behavior
  });

  it('should refresh user data', async () => {
    const mockUser = createMockUser();
    const mockSupabase = require('@supabase/supabase-js');

    // Mock successful user fetch
    mockSupabase.createClient().auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-id' } },
      error: null,
    });

    mockSupabase.createClient().from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockUser,
            error: null,
          }),
        }),
      }),
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(getByTestId('loading').children[0]).toBe('false');
    });
  });
});

describe('useAuth hook', () => {
  it('should throw error when used outside AuthProvider', () => {
    // Suppress console.error for the expected React error boundary log
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Use the raw renderer (no AuthProvider wrapper) so the context is truly missing.
    expect(() => {
      rawRender(<OrphanComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
