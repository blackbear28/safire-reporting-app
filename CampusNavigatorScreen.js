import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  StyleSheet,
  SafeAreaView
} from 'react-native';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CampusService } from './services/campusService';

export default function CampusNavigatorScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [offices, setOffices] = useState([]);
  const [buildings, setBuildings] = useState([]);

  useEffect(() => {
    loadCampusData();
  }, []);

  const loadCampusData = () => {
    setOffices(CampusService.getAllOffices());
    setBuildings(CampusService.getBuildings());
  };

  const filteredOffices = offices.filter(office => {
    const matchesSearch = office.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         office.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         office.building.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBuilding = selectedBuilding === 'all' || office.building === selectedBuilding;
    const matchesCategory = selectedCategory === 'all' || office.category === selectedCategory;
    return matchesSearch && matchesBuilding && matchesCategory;
  });

  const openNavigation = (office) => {
    if (office.coordinates) {
      const { latitude, longitude } = office.coordinates;
      const label = encodeURIComponent(office.name);
      const url = Platform.select({
        ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
        android: `geo:0,0?q=${latitude},${longitude}(${label})`
      });
      Linking.openURL(url);
    }
  };

  const callOffice = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const emailOffice = (email) => {
    Linking.openURL(`mailto:${email}`);
  };

  const isOfficeOpen = (hours) => {
    if (!hours) return false;
    const now = new Date();
    const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const todayHours = hours[currentDay];
    if (!todayHours || todayHours === 'Closed' || todayHours === '24 Hours') {
      return todayHours === '24 Hours';
    }

    // Check if hours have the expected format (e.g., "08:00 - 17:00")
    if (!todayHours.includes(' - ')) return false;

    try {
      const [start, end] = todayHours.split(' - ');
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      return currentTime >= startTime && currentTime <= endTime;
    } catch (error) {
      console.error('Error parsing office hours:', error);
      return false;
    }
  };

  const getOfficeStatus = (hours) => {
    if (!hours) return { text: 'Hours not available', color: '#95a5a6' };
    const now = new Date();
    const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const todayHours = hours[currentDay];
    
    if (!todayHours || todayHours === 'Closed') {
      return { text: 'Closed today', color: '#e74c3c' };
    }

    if (todayHours === '24 Hours') {
      return { text: 'Open 24 Hours', color: '#27ae60' };
    }

    if (isOfficeOpen(hours)) {
      return { text: `Open • ${todayHours}`, color: '#27ae60' };
    }

    // Safely get opening time
    if (todayHours.includes(' - ')) {
      const openingTime = todayHours.split(' - ')[0];
      return { text: `Closed • Opens ${openingTime}`, color: '#e67e22' };
    }

    return { text: todayHours, color: '#6c757d' };
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Ionicons name="compass" size={28} color="#2667ff" />
          <Text style={styles.headerTitle}>Campus Navigator</Text>
        </View>
        <Text style={styles.headerSubtitle}>Find offices, departments & contacts</Text>
      </View>

      <ScrollView 
        style={styles.mainScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.mainScrollContent}
      >
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#95a5a6" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search offices, departments, buildings..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#95a5a6"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#95a5a6" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterSection}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[styles.filterChipText, selectedCategory === 'all' && styles.filterChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'academic' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('academic')}
          >
            <Text style={[styles.filterChipText, selectedCategory === 'academic' && styles.filterChipTextActive]}>
              📚 Academic
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'administrative' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('administrative')}
          >
            <Text style={[styles.filterChipText, selectedCategory === 'administrative' && styles.filterChipTextActive]}>
              🏛️ Administrative
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'student_services' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('student_services')}
          >
            <Text style={[styles.filterChipText, selectedCategory === 'student_services' && styles.filterChipTextActive]}>
              🎓 Student Services
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'facilities' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('facilities')}
          >
            <Text style={[styles.filterChipText, selectedCategory === 'facilities' && styles.filterChipTextActive]}>
              🔧 Facilities
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Building Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.buildingSection}
          contentContainerStyle={styles.buildingContent}
        >
          <TouchableOpacity
            style={[styles.buildingChip, selectedBuilding === 'all' && styles.buildingChipActive]}
            onPress={() => setSelectedBuilding('all')}
          >
            <Ionicons name="business" size={14} color={selectedBuilding === 'all' ? '#fff' : '#2667ff'} />
            <Text style={[styles.buildingChipText, selectedBuilding === 'all' && styles.buildingChipTextActive]}>
              All Buildings
            </Text>
          </TouchableOpacity>
          {buildings.map((building) => (
            <TouchableOpacity
              key={building}
              style={[styles.buildingChip, selectedBuilding === building && styles.buildingChipActive]}
              onPress={() => setSelectedBuilding(building)}
            >
              <Text style={[styles.buildingChipText, selectedBuilding === building && styles.buildingChipTextActive]}>
                {building}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Results Count */}
        <View style={styles.resultsCount}>
          <Text style={styles.resultsText}>
            {filteredOffices.length} {filteredOffices.length === 1 ? 'office' : 'offices'} found
          </Text>
        </View>

        {/* Office List */}
        <View style={styles.officeListContainer}>
          {filteredOffices.map((office) => {
          const status = getOfficeStatus(office.hours);
          return (
            <View key={office.id} style={styles.officeCard}>
              <View style={styles.officeHeader}>
                <View style={styles.officeInfo}>
                  <Text style={styles.officeName}>{office.name}</Text>
                  <Text style={styles.officeDepartment}>{office.department}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                  <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                  <Text style={[styles.statusText, { color: status.color }]}>
                    {status.text.split(' • ')[0]}
                  </Text>
                </View>
              </View>

              <View style={styles.officeDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="location" size={16} color="#7f8c8d" />
                  <Text style={styles.detailText}>{office.building} - Room {office.room}</Text>
                </View>
                {office.phone && (
                  <View style={styles.detailRow}>
                    <Ionicons name="call" size={16} color="#7f8c8d" />
                    <Text style={styles.detailText}>{office.phone}</Text>
                  </View>
                )}
                {office.email && (
                  <View style={styles.detailRow}>
                    <Ionicons name="mail" size={16} color="#7f8c8d" />
                    <Text style={styles.detailText}>{office.email}</Text>
                  </View>
                )}
              </View>

              {/* Office Hours */}
              {office.hours && (
                <View style={styles.hoursSection}>
                  <Text style={styles.hoursTitle}>Office Hours</Text>
                  <Text style={styles.hoursText}>{status.text}</Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {office.coordinates && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openNavigation(office)}
                  >
                    <Ionicons name="navigate" size={16} color="#2667ff" />
                    <Text style={styles.actionButtonText}>Navigate</Text>
                  </TouchableOpacity>
                )}
                {office.phone && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => callOffice(office.phone)}
                  >
                    <Ionicons name="call" size={16} color="#27ae60" />
                    <Text style={[styles.actionButtonText, { color: '#27ae60' }]}>Call</Text>
                  </TouchableOpacity>
                )}
                {office.email && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => emailOffice(office.email)}
                  >
                    <Ionicons name="mail" size={16} color="#e67e22" />
                    <Text style={[styles.actionButtonText, { color: '#e67e22' }]}>Email</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {filteredOffices.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={64} color="#bdc3c7" />
            <Text style={styles.emptyTitle}>No offices found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search or filters</Text>
          </View>
        )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'Outfit-Bold',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 40,
    fontFamily: 'Outfit-Regular',
  },
  mainScrollView: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 100,
  },
  searchSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
    fontFamily: 'Outfit-Regular',
  },
  filterSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#2667ff',
  },
  filterChipText: {
    fontSize: 13,
    color: '#495057',
    fontFamily: 'Outfit-Regular',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  buildingSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  buildingContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  buildingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginRight: 8,
  },
  buildingChipActive: {
    backgroundColor: '#2667ff',
    borderColor: '#2667ff',
  },
  buildingChipText: {
    fontSize: 13,
    color: '#495057',
    fontFamily: 'Outfit-Regular',
  },
  buildingChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  resultsCount: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  resultsText: {
    fontSize: 13,
    color: '#6c757d',
    fontFamily: 'Outfit-Regular',
  },
  officeListContainer: {
    padding: 16,
  },
  officeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  officeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  officeInfo: {
    flex: 1,
    marginRight: 12,
  },
  officeName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
    fontFamily: 'Outfit-Bold',
  },
  officeDepartment: {
    fontSize: 14,
    color: '#6c757d',
    fontFamily: 'Outfit-Regular',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Outfit-Bold',
  },
  officeDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#495057',
    fontFamily: 'Outfit-Regular',
  },
  hoursSection: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  hoursTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
    fontFamily: 'Outfit-Bold',
  },
  hoursText: {
    fontSize: 13,
    color: '#6c757d',
    fontFamily: 'Outfit-Regular',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2667ff',
    fontFamily: 'Outfit-Bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Outfit-Bold',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6c757d',
    fontFamily: 'Outfit-Regular',
  },
});
