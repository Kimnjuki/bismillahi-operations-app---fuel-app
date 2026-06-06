import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Button, List, IconButton, Searchbar } from 'react-native-paper';

// Security help component
const SecurityHelp: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Help categories and content
  const helpCategories = [
    {
      id: 'general',
      name: 'General Security',
      icon: 'shield',
      items: [
        {
          id: 'what-is-security',
          title: 'What is Security?',
          content: 'Security refers to the protection of your system, data, and users from unauthorized access, threats, and vulnerabilities. It includes measures to prevent, detect, and respond to security incidents.',
        },
        {
          id: 'security-levels',
          title: 'Security Levels',
          content: 'Security levels indicate the current state of your system security:\n\n• LOW: Minimal security concerns\n• MEDIUM: Some security issues that need attention\n• HIGH: Significant security threats detected\n• CRITICAL: Immediate security action required',
        },
        {
          id: 'security-check',
          title: 'Security Check',
          content: 'A security check analyzes your system for potential vulnerabilities and threats. It examines authentication, authorization, data protection, and other security measures.',
        },
      ],
    },
    {
      id: 'authentication',
      name: 'Authentication',
      icon: 'account-key',
      items: [
        {
          id: 'login-security',
          title: 'Login Security',
          content: 'Secure login practices include:\n\n• Use strong, unique passwords\n• Enable two-factor authentication\n• Never share login credentials\n• Log out when finished\n• Report suspicious login attempts',
        },
        {
          id: 'password-requirements',
          title: 'Password Requirements',
          content: 'Strong passwords should:\n\n• Be at least 8 characters long\n• Include uppercase and lowercase letters\n• Include numbers and special characters\n• Be unique for each account\n• Be changed regularly',
        },
        {
          id: 'session-management',
          title: 'Session Management',
          content: 'Session security includes:\n\n• Automatic session timeout\n• Secure session storage\n• Session invalidation on logout\n• Protection against session hijacking\n• Regular session cleanup',
        },
      ],
    },
    {
      id: 'data-protection',
      name: 'Data Protection',
      icon: 'database',
      items: [
        {
          id: 'data-encryption',
          title: 'Data Encryption',
          content: 'Data encryption protects sensitive information by converting it into a secure format that can only be read with the proper decryption key. This ensures data remains secure even if intercepted.',
        },
        {
          id: 'data-backup',
          title: 'Data Backup',
          content: 'Regular data backups are essential for:\n\n• Protecting against data loss\n• Recovering from security incidents\n• Maintaining business continuity\n• Complying with regulations\n• Testing disaster recovery procedures',
        },
        {
          id: 'data-access-control',
          title: 'Data Access Control',
          content: 'Access control ensures that only authorized users can access specific data. This includes:\n\n• Role-based permissions\n• Principle of least privilege\n• Regular access reviews\n• Audit logging\n• Data classification',
        },
      ],
    },
    {
      id: 'threats',
      name: 'Security Threats',
      icon: 'alert-circle',
      items: [
        {
          id: 'common-threats',
          title: 'Common Security Threats',
          content: 'Common threats include:\n\n• Malware and viruses\n• Phishing attacks\n• SQL injection\n• Cross-site scripting (XSS)\n• Brute force attacks\n• Social engineering\n• Insider threats',
        },
        {
          id: 'threat-prevention',
          title: 'Threat Prevention',
          content: 'Prevent threats by:\n\n• Keeping software updated\n• Using strong authentication\n• Implementing firewalls\n• Regular security training\n• Monitoring system activity\n• Using antivirus software\n• Implementing access controls',
        },
        {
          id: 'incident-response',
          title: 'Incident Response',
          content: 'When a security incident occurs:\n\n• Immediately report the incident\n• Isolate affected systems\n• Preserve evidence\n• Notify relevant parties\n• Implement containment measures\n• Conduct post-incident review\n• Update security measures',
        },
      ],
    },
    {
      id: 'monitoring',
      name: 'Security Monitoring',
      icon: 'monitor',
      items: [
        {
          id: 'security-monitoring',
          title: 'Security Monitoring',
          content: 'Security monitoring involves:\n\n• Continuous system surveillance\n• Real-time threat detection\n• Automated alerting\n• Log analysis\n• Performance monitoring\n• User activity tracking\n• Network monitoring',
        },
        {
          id: 'security-alerts',
          title: 'Security Alerts',
          content: 'Security alerts notify you of:\n\n• Failed login attempts\n• Unusual user activity\n• System vulnerabilities\n• Security policy violations\n• Data access anomalies\n• Network intrusions\n• Malware detection',
        },
        {
          id: 'security-reports',
          title: 'Security Reports',
          content: 'Security reports provide:\n\n• System security status\n• Threat analysis\n• Compliance status\n• Performance metrics\n• Incident summaries\n• Recommendations\n• Trend analysis',
        },
      ],
    },
    {
      id: 'best-practices',
      name: 'Best Practices',
      icon: 'check-circle',
      items: [
        {
          id: 'security-policies',
          title: 'Security Policies',
          content: 'Effective security policies include:\n\n• Clear security objectives\n• Defined roles and responsibilities\n• Incident response procedures\n• Regular policy reviews\n• Employee training requirements\n• Compliance requirements\n• Enforcement measures',
        },
        {
          id: 'user-training',
          title: 'User Training',
          content: 'Security training should cover:\n\n• Password security\n• Phishing awareness\n• Safe browsing practices\n• Data handling procedures\n• Incident reporting\n• Security policies\n• Regular updates',
        },
        {
          id: 'regular-maintenance',
          title: 'Regular Maintenance',
          content: 'Regular security maintenance includes:\n\n• Software updates\n• Security patches\n• System backups\n• Access reviews\n• Security assessments\n• Policy updates\n• Training refreshers',
        },
      ],
    },
  ];

  // Filter help items based on search and category
  const filteredCategories = helpCategories.filter(category => {
    if (selectedCategory !== 'all' && category.id !== selectedCategory) {
      return false;
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return category.items.some(item => 
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const renderCategoryFilter = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Categories</Title>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
          <Button
            mode={selectedCategory === 'all' ? 'contained' : 'outlined'}
            onPress={() => setSelectedCategory('all')}
            style={styles.categoryButton}
          >
            All
          </Button>
          {helpCategories.map((category) => (
            <Button
              key={category.id}
              mode={selectedCategory === category.id ? 'contained' : 'outlined'}
              onPress={() => setSelectedCategory(category.id)}
              style={styles.categoryButton}
            >
              {category.name}
            </Button>
          ))}
        </ScrollView>
      </Card.Content>
    </Card>
  );

  const renderSearchBar = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Searchbar
          placeholder="Search help topics..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </Card.Content>
    </Card>
  );

  const renderHelpContent = () => (
    <View style={styles.helpContent}>
      {filteredCategories.map((category) => (
        <Card key={category.id} style={styles.card}>
          <Card.Content>
            <View style={styles.categoryHeader}>
              <IconButton
                icon={category.icon}
                size={24}
                iconColor="#2196F3"
              />
              <Title style={styles.categoryTitle}>{category.name}</Title>
            </View>
            
            {category.items.map((item) => (
              <View key={item.id} style={styles.helpItem}>
                <TouchableOpacity
                  style={styles.helpItemHeader}
                  onPress={() => toggleExpanded(item.id)}
                >
                  <Text style={styles.helpItemTitle}>{item.title}</Text>
                  <IconButton
                    icon={expandedItems.has(item.id) ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    iconColor="#666"
                  />
                </TouchableOpacity>
                
                {expandedItems.has(item.id) && (
                  <View style={styles.helpItemContent}>
                    <Text style={styles.helpItemText}>{item.content}</Text>
                  </View>
                )}
              </View>
            ))}
          </Card.Content>
        </Card>
      ))}
    </View>
  );

  const renderQuickActions = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Quick Actions</Title>
        <Button
          mode="outlined"
          onPress={() => setSelectedCategory('threats')}
          style={styles.quickActionButton}
        >
          View Security Threats
        </Button>
        <Button
          mode="outlined"
          onPress={() => setSelectedCategory('best-practices')}
          style={styles.quickActionButton}
        >
          Security Best Practices
        </Button>
        <Button
          mode="outlined"
          onPress={() => setSelectedCategory('incident-response')}
          style={styles.quickActionButton}
        >
          Incident Response Guide
        </Button>
      </Card.Content>
    </Card>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderSearchBar()}
      {renderCategoryFilter()}
      {renderQuickActions()}
      {renderHelpContent()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  searchBar: {
    marginBottom: 0,
  },
  categoryFilter: {
    flexDirection: 'row',
  },
  categoryButton: {
    marginRight: 8,
  },
  helpContent: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryTitle: {
    marginLeft: 8,
  },
  helpItem: {
    marginBottom: 16,
  },
  helpItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  helpItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  helpItemContent: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  helpItemText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  quickActionButton: {
    marginBottom: 8,
  },
});

export default SecurityHelp;

