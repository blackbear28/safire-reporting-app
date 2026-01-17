import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { styles } from './styles';
import { ReportService } from './services/reportService';

const { width } = Dimensions.get('window');

// Bulletproof text rendering helpers
const SafeText = ({ children, style, numberOfLines, ...props }) => {
  const safeContent = SafeString(children);
  return (
    <Text style={style} numberOfLines={numberOfLines} {...props}>
      {safeContent}
    </Text>
  );
};

const SafeString = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return isNaN(value) ? '0' : String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return '';
  try {
    return String(value);
  } catch {
    return '';
  }
};

const SafeNumber = (value, defaultValue = 0) => {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return Math.floor(parsed);
    }
  }
  return defaultValue;
};

const CapitalizeFirst = (str) => {
  const safe = SafeString(str).trim();
  if (safe.length === 0) return 'Unknown';
  return safe.charAt(0).toUpperCase() + safe.slice(1);
};

const FormatPercentage = (value) => {
  try {
    const num = SafeNumber(value);
    const clamped = Math.max(0, Math.min(100, num));
    return SafeString(clamped) + '%';
  } catch (error) {
    return '0%';
  }
};

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    resolvedReports: 0,
    avgResponseTime: 0
  });
  const [categoryData, setCategoryData] = useState({});
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time updates
    const unsubscribe = ReportService.subscribeToReports((reports) => {
      updateStatsFromReports(reports);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const updateStatsFromReports = (reports) => {
    // Ensure reports is an array and contains valid data
    if (!Array.isArray(reports)) {
      console.warn('updateStatsFromReports received non-array data:', reports);
      setStats({ totalReports: 0, pendingReports: 0, resolvedReports: 0, avgResponseTime: 0 });
      setCategoryData({});
      setRecentReports([]);
      setLoading(false);
      return;
    }

    // Filter out any invalid reports with extra safety checks
    const validReports = reports.filter(r => {
      return r && 
             typeof r === 'object' && 
             r.id && 
             typeof r.id === 'string' &&
             r.id.length > 0;
    });

    // Calculate statistics with safe defaults
    const totalReports = SafeNumber(validReports.length);
    const pendingReports = SafeNumber(validReports.filter(r => 
      r.status && typeof r.status === 'string' && ['pending', 'in_progress'].includes(r.status)
    ).length);
    const resolvedReports = SafeNumber(validReports.filter(r => 
      r.status && typeof r.status === 'string' && r.status === 'resolved'
    ).length);

    // Calculate average response time with enhanced error handling
    const resolvedWithTimes = validReports.filter(r => 
      r.resolvedAt && r.createdAt && r.status === 'resolved'
    );
    let avgResponseTime = 0;
    
    if (resolvedWithTimes.length > 0) {
      try {
        const totalTime = resolvedWithTimes.reduce((acc, r) => {
          try {
            const created = r.createdAt instanceof Date ? r.createdAt : r.createdAt.toDate();
            const resolved = r.resolvedAt instanceof Date ? r.resolvedAt : r.resolvedAt.toDate();
            const diff = (resolved - created) / (1000 * 60 * 60); // hours
            return acc + (isNaN(diff) || diff < 0 ? 0 : diff);
          } catch (error) {
            console.warn('Error calculating response time for report:', r.id, error);
            return acc;
          }
        }, 0);
        avgResponseTime = totalTime / resolvedWithTimes.length;
      } catch (error) {
        console.error('Error in avgResponseTime calculation:', error);
        avgResponseTime = 0;
      }
    }

    // Category breakdown with enhanced validation
    const categoryBreakdown = {};
    validReports.forEach(report => {
      try {
        let categoryKey = 'other';
        if (report.category && typeof report.category === 'string' && report.category.trim().length > 0) {
          const category = SafeString(report.category).trim().toLowerCase();
          if (category.length > 0) {
            categoryKey = category;
          }
        }
        categoryBreakdown[categoryKey] = SafeNumber(categoryBreakdown[categoryKey] || 0) + 1;
      } catch (error) {
        console.warn('Error processing category for report:', report.id, error);
        categoryBreakdown['other'] = SafeNumber(categoryBreakdown['other'] || 0) + 1;
      }
    });

    // Recent reports with safe slicing
    const recentValidReports = validReports.slice(0, 5);

    // Ensure all numeric values are safe
    const finalAvgResponseTime = SafeNumber(avgResponseTime);

    // Set state with safe values
    setStats({
      totalReports: totalReports,
      pendingReports: pendingReports,
      resolvedReports: resolvedReports,
      avgResponseTime: finalAvgResponseTime
    });
    setCategoryData(categoryBreakdown);
    setRecentReports(recentValidReports);
    setLoading(false);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get reports statistics using the service
      const statsData = await ReportService.getReportsStats();
      const categoryBreakdown = await ReportService.getReportsByCategory();
      
      // Ensure we have valid data
      const validStatsData = statsData || { total: 0, pending: 0, resolved: 0 };
      const validCategoryBreakdown = categoryBreakdown || {};
      
      setStats({
        totalReports: SafeNumber(validStatsData.total),
        pendingReports: SafeNumber(validStatsData.pending),
        resolvedReports: SafeNumber(validStatsData.resolved),
        avgResponseTime: 24 // Placeholder, will be calculated in real-time updates
      });
      setCategoryData(validCategoryBreakdown);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set default values on error
      setStats({
        totalReports: 0,
        pendingReports: 0,
        resolvedReports: 0,
        avgResponseTime: 0
      });
      setCategoryData({});
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: '#ff3b30',
      high: '#ff9500',
      medium: '#007aff',
      low: '#34c759'
    };
    const safeKey = SafeString(priority, 'medium');
    return colors[safeKey] || '#666';
  };

  const getStatusColor = (status) => {
    const colors = {
      submitted: '#ff9500',
      acknowledged: '#007aff',
      in_progress: '#5856d6',
      resolved: '#34c759',
      closed: '#8e8e93'
    };
    const safeKey = SafeString(status, 'pending');
    return colors[safeKey] || '#666';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      const dateStr = SafeString(date.toLocaleDateString(), 'Unknown');
      const timeStr = SafeString(date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      }), 'Unknown');
      
      return dateStr + ' ' + timeStr;
    } catch (error) {
      console.warn('Error formatting date:', timestamp, error);
      return 'Unknown';
    }
  };

  const renderStatCard = (value, title, color = null) => {
    const safeValue = SafeNumber(value);
    const safeTitle = SafeString(title, 'Unknown');
    const textStyle = color ? [styles.statValue, { color }] : styles.statValue;
    
    return (
      <View style={styles.statCard}>
        <SafeText style={textStyle}>{safeValue}</SafeText>
        <SafeText style={styles.statTitle}>{safeTitle}</SafeText>
      </View>
    );
  };

  const renderCategoryRow = (category, count, totalReports) => {
    const safeCategoryName = CapitalizeFirst(category);
    const safeCount = SafeNumber(count);
    const safeTotalReports = SafeNumber(totalReports);
    
    let percentage = 0;
    if (safeTotalReports > 0) {
      percentage = Math.round((safeCount / safeTotalReports) * 100);
      percentage = Math.max(0, Math.min(100, percentage));
    }
    
    const widthStyle = FormatPercentage(percentage);
    const backgroundColor = getPriorityColor(category);
    
    return (
      <View key={SafeString(category, 'unknown')} style={styles.categoryRow}>
        <SafeText style={styles.categoryName}>{safeCategoryName}</SafeText>
        <View style={styles.categoryBar}>
          <View 
            style={[
              styles.categoryBarFill,
              { 
                width: widthStyle,
                backgroundColor: backgroundColor
              }
            ]} 
          />
        </View>
        <SafeText style={styles.categoryCount}>{safeCount}</SafeText>
      </View>
    );
  };

  const renderRecentReport = (report) => {
    const reportId = SafeString(report.id, 'unknown');
    const reportTitle = SafeString(report.title, 'Untitled Report').trim();
    const finalTitle = reportTitle.length > 0 ? reportTitle : 'Untitled Report';
    
    const reportPriority = SafeString(report.priority, 'medium').trim();
    const finalPriority = reportPriority.length > 0 ? reportPriority.toUpperCase() : 'MEDIUM';
    
    const reportDescription = SafeString(report.description, 'No description available').trim();
    const finalDescription = reportDescription.length > 0 ? reportDescription : 'No description available';
    
    const reportCategory = SafeString(report.category, 'other').trim();
    const finalCategory = CapitalizeFirst(reportCategory.length > 0 ? reportCategory : 'other');
    
    const reportStatus = SafeString(report.status, 'pending').trim();
    const finalStatus = reportStatus.length > 0 ? reportStatus.replace('_', ' ').toUpperCase() : 'PENDING';
    
    const formattedDate = formatDate(report.createdAt);
    
    return (
      <View key={reportId} style={styles.recentReportItem}>
        <View style={styles.recentReportHeader}>
          <SafeText style={styles.recentReportTitle} numberOfLines={1}>
            {finalTitle}
          </SafeText>
          <View style={[
            styles.priorityBadge,
            { backgroundColor: getPriorityColor(reportPriority) }
          ]}>
            <SafeText style={styles.priorityText}>{finalPriority}</SafeText>
          </View>
        </View>
        
        <SafeText style={styles.recentReportDescription} numberOfLines={2}>
          {finalDescription}
        </SafeText>
        
        <View style={styles.recentReportFooter}>
          <SafeText style={styles.recentReportCategory}>{finalCategory}</SafeText>
          <SafeText style={[
            styles.recentReportStatus,
            { color: getStatusColor(reportStatus) }
          ]}>
            {finalStatus}
          </SafeText>
          <SafeText style={styles.recentReportDate}>{formattedDate}</SafeText>
        </View>
      </View>
    );
  };

  if (loading) {
    const safeTopPadding = SafeNumber(insets.top);
    const safeBottomPadding = SafeNumber(insets.bottom);
    
    return (
      <View style={[styles.container, { 
        justifyContent: 'center', 
        alignItems: 'center',
        paddingTop: safeTopPadding,
        paddingBottom: safeBottomPadding
      }]}>
        <ActivityIndicator size="large" color="#2667ff" />
        <SafeText style={styles.loadingText}>Loading dashboard...</SafeText>
      </View>
    );
  }

  // Extra safety check - ensure stats is an object
  const safeStats = (stats && typeof stats === 'object') ? {
    totalReports: SafeNumber(stats.totalReports),
    pendingReports: SafeNumber(stats.pendingReports),
    resolvedReports: SafeNumber(stats.resolvedReports),
    avgResponseTime: SafeNumber(stats.avgResponseTime)
  } : {
    totalReports: 0,
    pendingReports: 0,
    resolvedReports: 0,
    avgResponseTime: 0
  };

  // Calculate safe padding values
  const safeTopPadding = SafeNumber(insets.top);
  const safeBottomPadding = Math.max(120, SafeNumber(insets.bottom) + 20);

  // Process category data safely
  const safeCategoryEntries = [];
  if (categoryData && typeof categoryData === 'object') {
    Object.entries(categoryData).forEach(([category, count]) => {
      const safeCategory = SafeString(category, 'unknown').trim();
      const safeCount = SafeNumber(count);
      
      if (safeCategory.length > 0 && safeCount >= 0) {
        safeCategoryEntries.push([safeCategory, safeCount]);
      }
    });
  }

  // Process recent reports safely
  const safeRecentReports = [];
  if (Array.isArray(recentReports)) {
    recentReports.forEach(report => {
      if (report && typeof report === 'object' && report.id) {
        safeRecentReports.push(report);
      }
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: safeTopPadding }}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={{ paddingBottom: safeBottomPadding, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
      >
        <View style={styles.dashboardContainer}>
          {/* Back Navigation */}
          <View style={styles.backNavigation}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <FontAwesome name="arrow-left" size={20} color="#2667ff" />
              <SafeText style={styles.backButtonText}>Back</SafeText>
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View style={styles.dashboardHeader}>
            <SafeText style={styles.dashboardTitle}>Analytics Dashboard</SafeText>
            <TouchableOpacity onPress={fetchDashboardData}>
              <FontAwesome name="refresh" size={20} color="#2667ff" />
            </TouchableOpacity>
          </View>

          {/* Statistics Cards */}
          <View style={styles.statsGrid}>
            {renderStatCard(safeStats.totalReports, 'Total Reports')}
            {renderStatCard(safeStats.pendingReports, 'Pending', '#ff9500')}
            {renderStatCard(safeStats.resolvedReports, 'Resolved', '#34c759')}
            <View style={styles.statCard}>
              <SafeText style={[styles.statValue, { color: '#5856d6' }]}>
                {SafeString(safeStats.avgResponseTime) + 'h'}
              </SafeText>
              <SafeText style={styles.statTitle}>Avg Response</SafeText>
            </View>
          </View>

          {/* Category Breakdown */}
          <View style={styles.chartContainer}>
            <SafeText style={styles.chartTitle}>Reports by Category</SafeText>
            {safeCategoryEntries.length > 0 ? (
              <View>
                {safeCategoryEntries.map(([category, count]) => 
                  renderCategoryRow(category, count, safeStats.totalReports)
                )}
              </View>
            ) : (
              <View style={styles.noCategoriesContainer}>
                <SafeText style={styles.noCategoriesText}>No category data available</SafeText>
              </View>
            )}
          </View>

          {/* Recent Reports */}
          <View style={styles.chartContainer}>
            <SafeText style={styles.chartTitle}>Recent Reports</SafeText>
            {safeRecentReports.length > 0 ? (
              <View>
                {safeRecentReports.map(report => renderRecentReport(report))}
              </View>
            ) : (
              <View style={styles.noReportsContainer}>
                <SafeText style={styles.noReportsText}>No recent reports</SafeText>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <SafeText style={styles.chartTitle}>Quick Actions</SafeText>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionButton}>
                <FontAwesome name="plus" size={24} color="#fff" />
                <SafeText style={styles.actionButtonText}>New Report</SafeText>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton}>
                <FontAwesome name="list" size={24} color="#fff" />
                <SafeText style={styles.actionButtonText}>All Reports</SafeText>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton}>
                <FontAwesome name="bar-chart" size={24} color="#fff" />
                <SafeText style={styles.actionButtonText}>Analytics</SafeText>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton}>
                <FontAwesome name="cog" size={24} color="#fff" />
                <SafeText style={styles.actionButtonText}>Settings</SafeText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
