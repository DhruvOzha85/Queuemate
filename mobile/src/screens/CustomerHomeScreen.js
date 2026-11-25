import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge, EmptyState } from '../components/UI';
import { COLORS, SPACING, sharedStyles } from '../styles/theme';

const CATEGORIES = ['All', 'Clinics', 'Salons', 'College Canteens', 'Photocopy Shops', 'Service Centres'];

export default function CustomerHomeScreen({ navigation }) {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadBusinesses = useCallback(async () => {
    try {
      setError('');
      const params = new URLSearchParams();
      if (category !== 'All') params.append('category', category);
      if (search.trim()) params.append('search', search.trim());
      const data = await apiFetch(`/api/businesses?${params.toString()}`);
      setBusinesses(data.businesses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, search]);

  useEffect(() => {
    const t = setTimeout(loadBusinesses, 250);
    return () => clearTimeout(t);
  }, [loadBusinesses]);

  function statusTone(b) {
    if (!b.isOpen) return { label: 'Closed', tone: 'closed' };
    if (b.isPaused) return { label: 'Paused', tone: 'paused' };
    return { label: 'Open', tone: 'open' };
  }

  return (
    <View style={sharedStyles.screen}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'there'}</Text>
        <Text style={sharedStyles.title}>Find a Queue</Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search clinics, salons, canteens..."
          placeholderTextColor={COLORS.muted}
          style={styles.searchInput}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              style={[styles.catChip, category === cat && styles.catChipActive]}
            >
              <Text style={[styles.catText, category === cat && styles.catTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.deepGreen} />
      ) : error ? (
        <EmptyState title="Could not load businesses" subtitle={error} actionLabel="Retry" onAction={loadBusinesses} />
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={(item) => item._id}
          contentContainerStyle={sharedStyles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBusinesses(); }} />}
          ListEmptyComponent={<EmptyState title="No businesses found" subtitle="Try another category or search term." />}
          renderItem={({ item }) => {
            const st = statusTone(item);
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate('BusinessDetail', { businessId: item._id })}
                style={sharedStyles.card}
              >
                <View style={sharedStyles.rowBetween}>
                  <Text style={styles.bizName}>{item.name}</Text>
                  <Badge label={st.label} tone={st.tone} />
                </View>
                <Text style={styles.bizCat}>{item.category} • {item.address}</Text>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{item.waitingCount}</Text>
                    <Text style={styles.statLabel}>Waiting</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>
                      {item.isPaused ? 'Paused' : `${item.estimatedWaitMinutes ?? 0}m`}
                    </Text>
                    <Text style={styles.statLabel}>Est. Wait</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{item.currentServingToken || '—'}</Text>
                    <Text style={styles.statLabel}>Serving</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.bg,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.deepGreen,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  searchInput: {
    marginTop: SPACING.sm,
    height: 44,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    fontSize: 15,
    color: COLORS.text,
  },
  catScroll: {
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: COLORS.deepGreen,
    borderColor: COLORS.deepGreen,
  },
  catText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  catTextActive: {
    color: '#FFFFFF',
  },
  bizName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  bizCat: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statBox: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
});
