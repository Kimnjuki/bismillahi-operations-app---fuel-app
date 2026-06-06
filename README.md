# Bismillahi Operations - Fuel Station Management System

A comprehensive cross-platform mobile application built with React Native and Expo for managing fuel station operations with role-based access control and Supabase backend.

## Features

### 🔐 Authentication & Authorization
- Secure login system with Supabase Auth
- Role-based access control (Admin, Manager, Cashier, Viewer)
- Session management with automatic token refresh

### 💰 Sales Management
- **Pump Sales**: Record fuel sales by pump number, fuel type, volume, and price
- **Drum Sales**: Track drum sales with different container types
- Payment method tracking (Cash, Card, Credit)
- Real-time sales calculations

### 📦 Stock Management
- Inventory tracking with current and minimum stock levels
- Stock variance recording and analysis
- Cost and selling price management
- Low stock alerts

### 💳 Expense Management
- 20 predefined expense categories
- Receipt number tracking
- Payment method categorization
- Expense history and reporting

### 💸 Fund Transfer System
- Transfer between multiple accounts
- Support for transit and tax accounts
- Multi-currency support with exchange rates
- Transfer history and audit trail

### 💱 Exchange Rate Calculator
- Real-time currency conversion
- Historical exchange rate tracking
- Quick conversion buttons
- Rate management for admins/managers

### 📊 Reports & Analytics
- **Daily Summary Reports**: Sales, expenses, and profit analysis
- **Expense Reports**: Category-wise expense breakdown
- 30-day historical data
- Visual progress indicators

### 🔔 Notifications System
- Real-time notifications for important updates
- Mark as read/unread functionality
- Notification history
- Different notification types (Info, Warning, Error, Success)

### 👥 User Management
- User creation and role assignment
- User status management (Active/Inactive)
- Role-based permissions
- User activity tracking

### ⚙️ Settings & Preferences
- Profile management
- App preferences (notifications, auto-sync, etc.)
- Data export functionality
- Cache management

## Technology Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **State Management**: React Context API
- **Navigation**: React Navigation v6
- **UI Components**: React Native Paper + Custom Components
- **Styling**: StyleSheet with Linear Gradients
- **Icons**: Expo Vector Icons

## Database Schema

The application uses Supabase with Row Level Security (RLS) policies for data protection:

### Core Tables
- `users` - User profiles and roles
- `pump_sales` - Pump fuel sales records
- `drum_sales` - Drum sales records
- `stock_items` - Inventory items
- `stock_variances` - Stock variance records
- `expenses` - Expense records with categories
- `fund_transfers` - Inter-account transfers
- `exchange_rates` - Currency exchange rates
- `notifications` - System notifications
- `expense_categories` - Predefined expense categories

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- Expo CLI
- Supabase account

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bismillahi-operations
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL schema from `database/schema.sql`
   - Update `src/config/supabase.ts` with your project credentials

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on device/simulator**
   ```bash
   npm run android  # For Android
   npm run ios      # For iOS
   npm run web      # For web
   ```

## Role-Based Access Control

### Admin
- Full system access
- User management
- All reports and settings
- System configuration

### Manager
- Sales management
- Stock management
- Expense management
- Fund transfers
- Exchange rate management
- Reports access

### Cashier
- Sales entry (pump and drum)
- Basic stock viewing
- Expense entry
- Limited reports

### Viewer
- Read-only access to reports
- View sales data
- View stock levels
- No modification permissions

## Security Features

- Row Level Security (RLS) policies on all tables
- JWT-based authentication
- Role-based API access control
- Secure data storage with AsyncStorage
- Input validation and sanitization

## API Endpoints

The application uses Supabase's auto-generated REST API with the following key operations:

- Authentication: `supabase.auth.signInWithPassword()`
- Data queries: `supabase.from('table').select()`
- Data insertion: `supabase.from('table').insert()`
- Data updates: `supabase.from('table').update()`
- Real-time subscriptions: `supabase.from('table').on()`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.

## Support

For support and questions, please contact the development team or refer to the documentation.

---

**Bismillahi Operations v1.0.0** - Comprehensive Fuel Station Management Solution




