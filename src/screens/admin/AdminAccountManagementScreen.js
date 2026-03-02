import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import AdminBottomNavBar from '../../components/AdminBottomNavBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { adminAPI } from '../../services/api';

export default function AdminAccountManagementScreen({ navigation }) {
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    // Filter accounts based on search query
    if (searchQuery.trim() === '') {
      setFilteredAccounts(accounts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = accounts.filter(account =>
        account.name.toLowerCase().includes(query) ||
        account.email.toLowerCase().includes(query) ||
        account.role.toLowerCase().includes(query)
      );
      setFilteredAccounts(filtered);
    }
  }, [searchQuery, accounts]);

  const fetchAccounts = async () => {
    try {
      setError(null);
      const response = await adminAPI.getAccounts();
      setAccounts(response.data);
      setFilteredAccounts(response.data);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAccounts();
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'active':
        return COLORS.success;
      case 'pending':
        return '#F59E0B';
      case 'inactive':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'inactive':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading accounts..." />;
  }

  if (error) {
    return <ErrorMessage error={error} onRetry={fetchAccounts} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="menu-outline" size={28} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity><Ionicons name="notifications-outline" size={24} color="#333" /></TouchableOpacity>
            <View style={styles.avatar} />
          </View>
        </View>

        <Text style={styles.pageTitle}>Account Management</Text>

        {/* Search Row */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#999" />
            <TextInput
              placeholder="Search by name, email, or role..."
              placeholderTextColor="#999"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Navigate to Invite Screen */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AdminInviteMemberScreen')}
          >
            <Ionicons name="person-add" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Results count */}
        {searchQuery.length > 0 && (
          <Text style={styles.resultsText}>
            {filteredAccounts.length} result{filteredAccounts.length !== 1 ? 's' : ''} found
          </Text>
        )}

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, { flex: 2 }]}>USER</Text>
          <Text style={[styles.headerText, { flex: 1, textAlign: 'center' }]}>ROLE</Text>
          <Text style={[styles.headerText, { flex: 1, textAlign: 'right', marginRight: 20 }]}>STATUS</Text>
          <View style={{ width: 10 }} />
        </View>

        {/* List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
        >
          {filteredAccounts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No accounts found' : 'No accounts yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try a different search term' : 'Invite team members to get started'}
              </Text>
            </View>
          ) : (
            filteredAccounts.map((item, index) => (
              <TouchableOpacity
                key={`${item.id}-${index}`}
                style={styles.row}
                onPress={() => navigation.navigate('AdminEditUserScreen', { user: item })}
              >
                <View style={{ flex: 2 }}>
                  <Text style={styles.cellTextBold}>{item.name}</Text>
                  <Text style={styles.cellTextSmall}>{item.email}</Text>
                </View>
                <Text style={[styles.cellText, { flex: 1, textAlign: 'center' }]}>{item.role}</Text>

                <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 10 }}>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
                    <Ionicons
                      name={getStatusIcon(item.status)}
                      size={12}
                      color={getStatusColor(item.status)}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>

      <AdminBottomNavBar navigation={navigation} activeTab="Records" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFC' },
  contentContainer: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  avatar: { width: 35, height: 35, borderRadius: 17.5, backgroundColor: '#ddd' },
  pageTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#1A1A1A' },
  searchRow: { flexDirection: 'row', marginBottom: 15 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 15, height: 50, marginRight: 10, borderWidth: 1, borderColor: '#EEE' },
  searchInput: { flex: 1, marginLeft: 10, color: '#333' },
  addButton: { width: 50, height: 50, backgroundColor: COLORS.primary, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  resultsText: { fontSize: 13, color: '#6B7280', marginBottom: 10, fontWeight: '500' },
  tableHeader: { flexDirection: 'row', marginBottom: 15, paddingHorizontal: 10 },
  headerText: { fontSize: 12, fontWeight: 'bold', color: '#666' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  cellTextBold: { fontWeight: 'bold', color: '#333', fontSize: 14 },
  cellText: { color: '#999', fontSize: 14 },
  cellTextSmall: { color: '#999', fontSize: 12, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#9CA3AF', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#D1D5DB', marginTop: 8, textAlign: 'center' },
});