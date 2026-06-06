import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, List, Chip, ProgressBar } from 'react-native-paper';
import { useSecurity } from '../context/SecurityContext';
import { securityService } from '../services/securityService';

// Security report component
const SecurityReport: React.FC = () => {
  const { securityEvents, securityMetrics, getSecurityEvents, getSecurityMetrics } = useSecurity();
  
  // Report state
  const [reportData, setReportData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d' | '90d'>('7d');

  // Load report data on mount
  useEffect(() => {
    loadReportData();
  }, [selectedPeriod]);

  const loadReportData = async () => {
    setIsGenerating(true);
    try {
      await Promise.all([
        getSecurityEvents(),
        getSecurityMetrics(),
      ]);
      
      // Generate report data
      const report = generateSecurityReport();
      setReportData(report);
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSecurityReport = () => {
    if (!securityEvents || !securityMetrics) return null;

    // Calculate report metrics
    const totalEvents = securityEvents.length;
    const criticalEvents = securityEvents.filter(e => e.severity === 'CRITICAL').length;
    const highEvents = securityEvents.filter(e => e.severity === 'HIGH').length;
    const mediumEvents = securityEvents.filter(e => e.severity === 'MEDIUM').length;
    const lowEvents = securityEvents.filter(e => e.severity === 'LOW').length;

    // Calculate event trends
    const eventsByType = securityEvents.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate security score
    const securityScore = calculateSecurityScore(criticalEvents, highEvents, mediumEvents, lowEvents);

    // Get top threats
    const topThreats = getTopThreats(securityEvents);

    // Get recommendations
    const recommendations = getSecurityRecommendations(criticalEvents, highEvents, mediumEvents, lowEvents);

    return {
      period: selectedPeriod,
      totalEvents,
      criticalEvents,
      highEvents,
      mediumEvents,
      lowEvents,
      eventsByType,
      securityScore,
      topThreats,
      recommendations,
      generatedAt: new Date(),
    };
  };

  const calculateSecurityScore = (critical: number, high: number, medium: number, low: number) => {
    // Calculate security score based on event severity
    const totalEvents = critical + high + medium + low;
    if (totalEvents === 0) return 100;

    const weightedScore = (critical * 0 + high * 25 + medium * 50 + low * 75) / totalEvents;
    return Math.max(0, Math.min(100, 100 - weightedScore));
  };

  const getTopThreats = (events: any[]) => {
    const threatCounts = events.reduce((acc, event) => {
      if (event.severity === 'CRITICAL' || event.severity === 'HIGH') {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(threatCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([threat, count]) => ({ threat, count }));
  };

  const getSecurityRecommendations = (critical: number, high: number, medium: number, low: number) => {
    const recommendations = [];

    if (critical > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        title: 'Immediate Action Required',
        description: `${critical} critical security events detected. Immediate investigation and remediation required.`,
      });
    }

    if (high > 5) {
      recommendations.push({
        priority: 'HIGH',
        title: 'High Priority Issues',
        description: `${high} high-priority security events. Review and address these issues promptly.`,
      });
    }

    if (medium > 10) {
      recommendations.push({
        priority: 'MEDIUM',
        title: 'Medium Priority Issues',
        description: `${medium} medium-priority security events. Schedule time to address these issues.`,
      });
    }

    if (low > 20) {
      recommendations.push({
        priority: 'LOW',
        title: 'Low Priority Issues',
        description: `${low} low-priority security events. Consider addressing these during regular maintenance.`,
      });
    }

    // Add general recommendations
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'LOW',
        title: 'Security Status Good',
        description: 'No significant security issues detected. Continue monitoring and maintain current security measures.',
      });
    }

    return recommendations;
  };

  const exportReport = () => {
    if (!reportData) return;

    const reportText = generateReportText(reportData);
    
    Alert.alert(
      'Export Report',
      'Report generated successfully. Copy the text below:',
      [
        { text: 'OK' },
        { text: 'Copy', onPress: () => {
          // In a real app, you would copy to clipboard
          console.log(reportText);
        }},
      ]
    );
  };

  const generateReportText = (data: any) => {
    return `
SECURITY REPORT - ${data.period.toUpperCase()}
Generated: ${data.generatedAt.toLocaleString()}

SUMMARY:
- Total Events: ${data.totalEvents}
- Critical: ${data.criticalEvents}
- High: ${data.highEvents}
- Medium: ${data.mediumEvents}
- Low: ${data.lowEvents}
- Security Score: ${data.securityScore.toFixed(1)}/100

TOP THREATS:
${data.topThreats.map((threat: any) => `- ${threat.threat}: ${threat.count} occurrences`).join('\n')}

RECOMMENDATIONS:
${data.recommendations.map((rec: any) => `- ${rec.priority}: ${rec.title} - ${rec.description}`).join('\n')}
    `.trim();
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return '#F44336';
      case 'HIGH': return '#FF9800';
      case 'MEDIUM': return '#2196F3';
      case 'LOW': return '#4CAF50';
      default: return '#757575';
    }
  };

  const renderReportHeader = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Security Report</Title>
        <Paragraph>
          Comprehensive security analysis and recommendations for your system.
        </Paragraph>
        
        <View style={styles.periodSelector}>
          <Text style={styles.periodLabel}>Report Period:</Text>
          <View style={styles.periodButtons}>
            {(['24h', '7d', '30d', '90d'] as const).map((period) => (
              <Button
                key={period}
                mode={selectedPeriod === period ? 'contained' : 'outlined'}
                onPress={() => setSelectedPeriod(period)}
                compact
                style={styles.periodButton}
              >
                {period}
              </Button>
            ))}
          </View>
        </View>

        <Button
          mode="contained"
          onPress={loadReportData}
          loading={isGenerating}
          style={styles.generateButton}
        >
          Generate Report
        </Button>
      </Card.Content>
    </Card>
  );

  const renderSecurityScore = () => {
    if (!reportData) return null;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title>Security Score</Title>
          <View style={styles.scoreContainer}>
            <Text style={[styles.scoreValue, { color: getSecurityScoreColor(reportData.securityScore) }]}>
              {reportData.securityScore.toFixed(1)}
            </Text>
            <Text style={styles.scoreLabel}>/ 100</Text>
          </View>
          <ProgressBar
            progress={reportData.securityScore / 100}
            color={getSecurityScoreColor(reportData.securityScore)}
            style={styles.scoreProgress}
          />
          <Text style={styles.scoreDescription}>
            {reportData.securityScore >= 80 ? 'Excellent security posture' :
             reportData.securityScore >= 60 ? 'Good security posture' :
             'Security improvements needed'}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  const renderEventSummary = () => {
    if (!reportData) return null;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title>Event Summary</Title>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{reportData.totalEvents}</Text>
              <Text style={styles.summaryLabel}>Total Events</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: getPriorityColor('CRITICAL') }]}>
                {reportData.criticalEvents}
              </Text>
              <Text style={styles.summaryLabel}>Critical</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: getPriorityColor('HIGH') }]}>
                {reportData.highEvents}
              </Text>
              <Text style={styles.summaryLabel}>High</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: getPriorityColor('MEDIUM') }]}>
                {reportData.mediumEvents}
              </Text>
              <Text style={styles.summaryLabel}>Medium</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: getPriorityColor('LOW') }]}>
                {reportData.lowEvents}
              </Text>
              <Text style={styles.summaryLabel}>Low</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderTopThreats = () => {
    if (!reportData || reportData.topThreats.length === 0) return null;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title>Top Security Threats</Title>
          <List.Section>
            {reportData.topThreats.map((threat: any, index: number) => (
              <List.Item
                key={index}
                title={threat.threat}
                description={`${threat.count} occurrences`}
                left={() => (
                  <Chip
                    mode="outlined"
                    textStyle={{ color: getPriorityColor('HIGH') }}
                    style={{ borderColor: getPriorityColor('HIGH') }}
                  >
                    {index + 1}
                  </Chip>
                )}
              />
            ))}
          </List.Section>
        </Card.Content>
      </Card>
    );
  };

  const renderRecommendations = () => {
    if (!reportData) return null;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title>Security Recommendations</Title>
          <List.Section>
            {reportData.recommendations.map((rec: any, index: number) => (
              <List.Item
                key={index}
                title={rec.title}
                description={rec.description}
                left={() => (
                  <Chip
                    mode="outlined"
                    textStyle={{ color: getPriorityColor(rec.priority) }}
                    style={{ borderColor: getPriorityColor(rec.priority) }}
                  >
                    {rec.priority}
                  </Chip>
                )}
              />
            ))}
          </List.Section>
        </Card.Content>
      </Card>
    );
  };

  const renderExportActions = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Export Report</Title>
        <Paragraph>
          Export the security report for sharing or archival purposes.
        </Paragraph>
        <Button
          mode="contained"
          onPress={exportReport}
          disabled={!reportData}
          style={styles.exportButton}
        >
          Export Report
        </Button>
      </Card.Content>
    </Card>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderReportHeader()}
      {renderSecurityScore()}
      {renderEventSummary()}
      {renderTopThreats()}
      {renderRecommendations()}
      {renderExportActions()}
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
  periodSelector: {
    marginBottom: 16,
  },
  periodLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  periodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  periodButton: {
    flex: 1,
    marginHorizontal: 2,
  },
  generateButton: {
    marginTop: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 24,
    color: '#666',
    marginLeft: 8,
  },
  scoreProgress: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  scoreDescription: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    width: '18%',
    marginBottom: 16,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  exportButton: {
    marginTop: 16,
  },
});

export default SecurityReport;

