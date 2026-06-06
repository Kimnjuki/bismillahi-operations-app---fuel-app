import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { securityService } from '../services/securityService';
import { secureApiService } from '../services/secureApiService';
import { supabase } from '../config/supabase';

// Security context types
interface SecurityContextType {
  // Security state
  isSecure: boolean;
  securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  lastSecurityCheck: Date | null;
  securityEvents: SecurityEvent[];
  securityMetrics: SecurityMetrics | null;

  // Security actions
  performSecurityCheck: () => Promise<void>;
  getSecurityEvents: (filters?: any) => Promise<void>;
  getSecurityMetrics: () => Promise<void>;
  clearSecurityEvents: () => void;
  reportSecurityIssue: (issue: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => Promise<void>;
}

// Security event interface
interface SecurityEvent {
  id: string;
  eventType: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
  metadata?: any;
}

// Security metrics interface
interface SecurityMetrics {
  totalEvents: number;
  eventsBySeverity: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  eventsByType: Record<string, number>;
  recentThreats: string[];
  lastUpdated: string;
}

// Create security context
const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

// Security provider component
interface SecurityProviderProps {
  children: ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  // Security state
  const [isSecure, setIsSecure] = useState<boolean>(true);
  const [securityLevel, setSecurityLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('LOW');
  const [lastSecurityCheck, setLastSecurityCheck] = useState<Date | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);

  // Perform security check
  const performSecurityCheck = async (): Promise<void> => {
    try {
      // Perform security check with current app state
      const appData = { 
        timestamp: new Date().toISOString(),
        userAgent: 'Bismillahi Operations App',
        version: '1.0.0'
      };
      const checkResult = await securityService.performSecurityCheck(appData);
      setIsSecure(checkResult.isSecure);
      setSecurityLevel(checkResult.isSecure ? 'HIGH' : 'MEDIUM');
      setLastSecurityCheck(new Date());

      // Log security check event
      await securityService.logSecurityEvent({
        eventType: 'SECURITY_CHECK',
        description: 'Security check performed',
        severity: 'LOW',
        metadata: { 
          isSecure: checkResult.isSecure, 
          issues: checkResult.issues 
        },
      });
    } catch (error) {
      console.error('Security check failed:', error);
      setIsSecure(false);
      setSecurityLevel('CRITICAL');
    }
  };

  // Get security events
  const getSecurityEvents = async (filters?: any): Promise<void> => {
    try {
      // Get current user ID from auth context
      const { data: { user } } = await (supabase as any).auth.getUser();
      if (!user) return;

      const { data, error } = await secureApiService.getSecurityEvents(user.id, filters);
      if (error) {
        console.error('Failed to fetch security events:', error);
        return;
      }

      setSecurityEvents(data || []);
    } catch (error) {
      console.error('Error fetching security events:', error);
    }
  };

  // Get security metrics
  const getSecurityMetrics = async (): Promise<void> => {
    try {
      // Get current user ID from auth context
      const { data: { user } } = await (supabase as any).auth.getUser();
      if (!user) return;

      const { data, error } = await secureApiService.getSecurityMetrics(user.id);
      if (error) {
        console.error('Failed to fetch security metrics:', error);
        return;
      }

      setSecurityMetrics(data);
    } catch (error) {
      console.error('Error fetching security metrics:', error);
    }
  };

  // Clear security events
  const clearSecurityEvents = (): void => {
    setSecurityEvents([]);
  };

  // Report security issue
  const reportSecurityIssue = async (issue: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): Promise<void> => {
    try {
      await securityService.logSecurityEvent({
        eventType: 'SECURITY_ISSUE_REPORTED',
        description: issue,
        severity,
        metadata: { reportedBy: 'user' },
      });

      // Refresh security events
      await getSecurityEvents();
    } catch (error) {
      console.error('Failed to report security issue:', error);
    }
  };

  // Initialize security context
  useEffect(() => {
    const initializeSecurity = async () => {
      // Perform initial security check
      await performSecurityCheck();

      // Set up periodic security checks (every 5 minutes)
      const securityCheckInterval = setInterval(performSecurityCheck, 5 * 60 * 1000);

      // Cleanup interval on unmount
      return () => {
        clearInterval(securityCheckInterval);
        secureApiService.cleanup();
      };
    };

    initializeSecurity();
  }, []);

  // Context value
  const contextValue: SecurityContextType = {
    isSecure,
    securityLevel,
    lastSecurityCheck,
    securityEvents,
    securityMetrics,
    performSecurityCheck,
    getSecurityEvents,
    getSecurityMetrics,
    clearSecurityEvents,
    reportSecurityIssue,
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
};

// Custom hook to use security context
export const useSecurity = (): SecurityContextType => {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

// Export types
export type { SecurityContextType, SecurityEvent, SecurityMetrics };


