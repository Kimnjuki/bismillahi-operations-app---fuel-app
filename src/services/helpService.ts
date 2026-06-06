import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HelpTopic {
  id: string;
  title: string;
  content: string;
  category: 'getting-started' | 'features' | 'troubleshooting' | 'security' | 'reports';
  tags: string[];
  lastUpdated: string;
  order: number;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  screen: string;
  required: boolean;
  completed: boolean;
  order: number;
}

export interface UserProgress {
  onboardingCompleted: boolean;
  completedSteps: string[];
  lastHelpTopicViewed?: string;
  helpSearches: string[];
  tutorialCompleted: boolean;
}

class HelpService {
  private readonly ONBOARDING_KEY = 'user_onboarding_progress';
  private readonly HELP_PROGRESS_KEY = 'user_help_progress';
  private readonly TUTORIAL_KEY = 'tutorial_completed';

  // Help topics data
  private helpTopics: HelpTopic[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      content: `
# Welcome to Bismillahi Operations

This petroleum operations management system helps you track sales, manage inventory, and monitor your business performance.

## Key Features:
- **Sales Entry**: Record pump and drum sales
- **Stock Management**: Track inventory and variances
- **Expense Tracking**: Log business expenses
- **Reports**: Generate comprehensive reports
- **User Management**: Manage team access and permissions

## First Steps:
1. Complete your profile setup
2. Configure your business settings
3. Add your first stock items
4. Record your first sale

Need help? Use the search function or browse topics by category.
      `,
      category: 'getting-started',
      tags: ['welcome', 'basics', 'setup'],
      lastUpdated: new Date().toISOString(),
      order: 1,
    },
    {
      id: 'sales-entry',
      title: 'Sales Entry Guide',
      content: `
# Sales Entry

Record both pump sales and drum sales efficiently.

## Pump Sales:
1. Select the pump number
2. Choose fuel type (Petrol, Diesel, Kerosene)
3. Enter volume in liters
4. Set price per liter
5. Select payment method
6. Confirm the sale

## Drum Sales:
1. Select drum type
2. Enter quantity
3. Set price per drum
4. Choose payment method
5. Confirm the sale

## Tips:
- Always verify quantities before confirming
- Use the calculator for quick calculations
- Check stock levels before recording sales
- Keep receipts for audit purposes
      `,
      category: 'features',
      tags: ['sales', 'pump', 'drum', 'recording'],
      lastUpdated: new Date().toISOString(),
      order: 2,
    },
    {
      id: 'stock-management',
      title: 'Stock Management',
      content: `
# Stock Management

Keep track of your inventory and identify discrepancies.

## Adding Stock Items:
1. Go to Stock Management
2. Tap "Add New Item"
3. Enter item details:
   - Name and category
   - Unit of measurement
   - Current stock level
   - Minimum stock threshold
   - Cost and selling prices
4. Save the item

## Recording Variances:
1. Select the item with variance
2. Enter expected vs actual quantities
3. Add reason for variance
4. Submit the variance report

## Stock Alerts:
- Low stock warnings
- Expired items notifications
- Variance alerts
      `,
      category: 'features',
      tags: ['stock', 'inventory', 'variances', 'alerts'],
      lastUpdated: new Date().toISOString(),
      order: 3,
    },
    {
      id: 'expense-tracking',
      title: 'Expense Tracking',
      content: `
# Expense Tracking

Monitor all business expenses and maintain financial records.

## Adding Expenses:
1. Select expense category
2. Add subcategory if needed
3. Enter amount
4. Add description
5. Include receipt number
6. Choose payment method
7. Set expense date

## Categories Available:
- Fuel expenses
- Maintenance and repairs
- Utilities and rent
- Salaries and wages
- Insurance and licenses
- Marketing and office supplies
- And many more...

## Best Practices:
- Record expenses immediately
- Keep digital copies of receipts
- Categorize expenses accurately
- Review expenses regularly
      `,
      category: 'features',
      tags: ['expenses', 'categories', 'receipts', 'tracking'],
      lastUpdated: new Date().toISOString(),
      order: 4,
    },
    {
      id: 'reports-generation',
      title: 'Reports and Analytics',
      content: `
# Reports and Analytics

Generate comprehensive reports for business insights.

## Available Reports:
- **Daily Sales Report**: Today's sales summary
- **Monthly Performance**: Monthly sales and expenses
- **Stock Report**: Current inventory status
- **Expense Analysis**: Expense breakdown by category
- **Profit & Loss**: Revenue vs expenses analysis

## Export Options:
- CSV format for spreadsheet analysis
- PDF format for presentations
- JSON format for data integration

## Custom Date Ranges:
- Today, this week, this month, this year
- Custom date range selection
- Historical data analysis

## Key Metrics:
- Total sales and expenses
- Net profit calculations
- Transaction counts
- Growth percentages
      `,
      category: 'reports',
      tags: ['reports', 'analytics', 'export', 'metrics'],
      lastUpdated: new Date().toISOString(),
      order: 5,
    },
    {
      id: 'user-management',
      title: 'User Management',
      content: `
# User Management

Manage team access and permissions effectively.

## User Roles:
- **Admin**: Full system access
- **Manager**: Sales, stock, and reports access
- **Cashier**: Sales entry and basic reports
- **Viewer**: Read-only access to reports

## Adding Users:
1. Go to User Management
2. Tap "Add New User"
3. Enter user details:
   - Full name and email
   - Assign appropriate role
   - Set initial password
4. Send invitation

## Managing Permissions:
- Update user roles as needed
- Activate/deactivate accounts
- Reset passwords
- Monitor user activity

## Security Features:
- Role-based access control
- Activity logging
- Session management
- Password policies
      `,
      category: 'features',
      tags: ['users', 'roles', 'permissions', 'security'],
      lastUpdated: new Date().toISOString(),
      order: 6,
    },
    {
      id: 'security-features',
      title: 'Security Features',
      content: `
# Security Features

Your data is protected with enterprise-grade security.

## Security Measures:
- **Data Encryption**: All data encrypted in transit and at rest
- **Input Validation**: Protection against malicious inputs
- **Session Management**: Secure user sessions
- **Access Control**: Role-based permissions
- **Audit Logging**: Complete activity tracking

## Security Dashboard:
- Real-time security monitoring
- Threat detection alerts
- Security event logs
- Performance metrics

## Best Practices:
- Use strong passwords
- Log out when finished
- Report suspicious activity
- Keep app updated
- Regular security reviews

## Privacy:
- Data stored securely
- No unauthorized access
- Compliance with regulations
- Regular security audits
      `,
      category: 'security',
      tags: ['security', 'encryption', 'privacy', 'protection'],
      lastUpdated: new Date().toISOString(),
      order: 7,
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      content: `
# Troubleshooting Guide

Common issues and their solutions.

## App Not Loading:
1. Check internet connection
2. Restart the app
3. Clear app cache
4. Update to latest version

## Login Issues:
1. Verify email and password
2. Check internet connection
3. Try password reset
4. Contact administrator

## Data Sync Problems:
1. Check internet connection
2. Refresh the screen
3. Log out and log back in
4. Check server status

## Performance Issues:
1. Close other apps
2. Restart device
3. Clear app data
4. Update app version

## Export Issues:
1. Check storage space
2. Verify file permissions
3. Try different format
4. Contact support

## Still Need Help?
- Check the FAQ section
- Contact technical support
- Submit a support ticket
- Visit our help center
      `,
      category: 'troubleshooting',
      tags: ['troubleshooting', 'issues', 'solutions', 'support'],
      lastUpdated: new Date().toISOString(),
      order: 8,
    },
  ];

  // Onboarding steps data
  private onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Bismillahi Operations',
      description: 'Let\'s get you started with your petroleum operations management system.',
      screen: 'Welcome',
      required: true,
      completed: false,
      order: 1,
    },
    {
      id: 'profile-setup',
      title: 'Complete Your Profile',
      description: 'Set up your user profile and business information.',
      screen: 'Settings',
      required: true,
      completed: false,
      order: 2,
    },
    {
      id: 'first-sale',
      title: 'Record Your First Sale',
      description: 'Learn how to record pump and drum sales.',
      screen: 'SalesEntry',
      required: true,
      completed: false,
      order: 3,
    },
    {
      id: 'stock-setup',
      title: 'Add Stock Items',
      description: 'Set up your inventory items and stock levels.',
      screen: 'StockManagement',
      required: true,
      completed: false,
      order: 4,
    },
    {
      id: 'expense-tracking',
      title: 'Track Expenses',
      description: 'Learn how to record and categorize business expenses.',
      screen: 'Expense',
      required: false,
      completed: false,
      order: 5,
    },
    {
      id: 'reports-tour',
      title: 'Explore Reports',
      description: 'Discover the reporting and analytics features.',
      screen: 'Reports',
      required: false,
      completed: false,
      order: 6,
    },
  ];

  async initialize(): Promise<void> {
    try {
      // Initialize user progress if not exists
      const progress = await this.getUserProgress();
      if (!progress) {
        await this.resetUserProgress();
      }
    } catch (error) {
      console.error('Help service initialization error:', error);
    }
  }

  // Help Topics Methods
  async getHelpTopics(category?: string): Promise<HelpTopic[]> {
    try {
      if (category) {
        return this.helpTopics.filter(topic => topic.category === category);
      }
      return this.helpTopics.sort((a, b) => a.order - b.order);
    } catch (error) {
      console.error('Get help topics error:', error);
      return [];
    }
  }

  async getHelpTopic(id: string): Promise<HelpTopic | null> {
    try {
      return this.helpTopics.find(topic => topic.id === id) || null;
    } catch (error) {
      console.error('Get help topic error:', error);
      return null;
    }
  }

  async searchHelpTopics(query: string): Promise<HelpTopic[]> {
    try {
      const lowercaseQuery = query.toLowerCase();
      return this.helpTopics.filter(topic => 
        topic.title.toLowerCase().includes(lowercaseQuery) ||
        topic.content.toLowerCase().includes(lowercaseQuery) ||
        topic.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
      );
    } catch (error) {
      console.error('Search help topics error:', error);
      return [];
    }
  }

  async recordHelpSearch(query: string): Promise<void> {
    try {
      const progress = await this.getUserProgress();
      if (progress) {
        progress.helpSearches.push(query);
        // Keep only last 50 searches
        if (progress.helpSearches.length > 50) {
          progress.helpSearches = progress.helpSearches.slice(-50);
        }
        await this.saveUserProgress(progress);
      }
    } catch (error) {
      console.error('Record help search error:', error);
    }
  }

  async recordHelpTopicView(topicId: string): Promise<void> {
    try {
      const progress = await this.getUserProgress();
      if (progress) {
        progress.lastHelpTopicViewed = topicId;
        await this.saveUserProgress(progress);
      }
    } catch (error) {
      console.error('Record help topic view error:', error);
    }
  }

  // Onboarding Methods
  async getOnboardingSteps(): Promise<OnboardingStep[]> {
    try {
      const progress = await this.getUserProgress();
      if (progress) {
        return this.onboardingSteps.map(step => ({
          ...step,
          completed: progress.completedSteps.includes(step.id),
        }));
      }
      return this.onboardingSteps;
    } catch (error) {
      console.error('Get onboarding steps error:', error);
      return this.onboardingSteps;
    }
  }

  async completeOnboardingStep(stepId: string): Promise<boolean> {
    try {
      const progress = await this.getUserProgress();
      if (progress && !progress.completedSteps.includes(stepId)) {
        progress.completedSteps.push(stepId);
        
        // Check if all required steps are completed
        const requiredSteps = this.onboardingSteps.filter(step => step.required);
        const completedRequiredSteps = requiredSteps.filter(step => 
          progress.completedSteps.includes(step.id)
        );
        
        progress.onboardingCompleted = completedRequiredSteps.length === requiredSteps.length;
        
        await this.saveUserProgress(progress);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Complete onboarding step error:', error);
      return false;
    }
  }

  async isOnboardingCompleted(): Promise<boolean> {
    try {
      const progress = await this.getUserProgress();
      return progress?.onboardingCompleted || false;
    } catch (error) {
      console.error('Check onboarding completion error:', error);
      return false;
    }
  }

  async resetOnboarding(): Promise<void> {
    try {
      const progress = await this.getUserProgress();
      if (progress) {
        progress.onboardingCompleted = false;
        progress.completedSteps = [];
        await this.saveUserProgress(progress);
      }
    } catch (error) {
      console.error('Reset onboarding error:', error);
    }
  }

  // Tutorial Methods
  async isTutorialCompleted(): Promise<boolean> {
    try {
      const tutorialCompleted = await AsyncStorage.getItem(this.TUTORIAL_KEY);
      return tutorialCompleted === 'true';
    } catch (error) {
      console.error('Check tutorial completion error:', error);
      return false;
    }
  }

  async completeTutorial(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.TUTORIAL_KEY, 'true');
      const progress = await this.getUserProgress();
      if (progress) {
        progress.tutorialCompleted = true;
        await this.saveUserProgress(progress);
      }
    } catch (error) {
      console.error('Complete tutorial error:', error);
    }
  }

  async resetTutorial(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.TUTORIAL_KEY);
      const progress = await this.getUserProgress();
      if (progress) {
        progress.tutorialCompleted = false;
        await this.saveUserProgress(progress);
      }
    } catch (error) {
      console.error('Reset tutorial error:', error);
    }
  }

  // Progress Management
  async getUserProgress(): Promise<UserProgress | null> {
    try {
      const progressData = await AsyncStorage.getItem(this.HELP_PROGRESS_KEY);
      return progressData ? JSON.parse(progressData) : null;
    } catch (error) {
      console.error('Get user progress error:', error);
      return null;
    }
  }

  async saveUserProgress(progress: UserProgress): Promise<void> {
    try {
      await AsyncStorage.setItem(this.HELP_PROGRESS_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error('Save user progress error:', error);
    }
  }

  async resetUserProgress(): Promise<void> {
    try {
      const initialProgress: UserProgress = {
        onboardingCompleted: false,
        completedSteps: [],
        helpSearches: [],
        tutorialCompleted: false,
      };
      await this.saveUserProgress(initialProgress);
    } catch (error) {
      console.error('Reset user progress error:', error);
    }
  }

  // Utility Methods
  async getNextOnboardingStep(): Promise<OnboardingStep | null> {
    try {
      const steps = await this.getOnboardingSteps();
      return steps.find(step => !step.completed) || null;
    } catch (error) {
      console.error('Get next onboarding step error:', error);
      return null;
    }
  }

  async getOnboardingProgress(): Promise<{ completed: number; total: number; percentage: number }> {
    try {
      const steps = await this.getOnboardingSteps();
      const completed = steps.filter(step => step.completed).length;
      const total = steps.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      return { completed, total, percentage };
    } catch (error) {
      console.error('Get onboarding progress error:', error);
      return { completed: 0, total: 0, percentage: 0 };
    }
  }

  async getPopularHelpTopics(): Promise<HelpTopic[]> {
    try {
      // Return most relevant topics based on user's role and activity
      return this.helpTopics.slice(0, 5);
    } catch (error) {
      console.error('Get popular help topics error:', error);
      return [];
    }
  }

  async getRecentSearches(): Promise<string[]> {
    try {
      const progress = await this.getUserProgress();
      return progress?.helpSearches.slice(-10) || [];
    } catch (error) {
      console.error('Get recent searches error:', error);
      return [];
    }
  }
}

export const helpService = new HelpService();
