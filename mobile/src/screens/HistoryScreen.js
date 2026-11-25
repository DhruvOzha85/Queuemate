import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge, EmptyState } from '../components/UI';
import { COLORS, SPACING, sharedStyles } from '../styles/theme';

export default function HistoryScreen({ navigation }) {
  const { token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/queue/history', { token });
      setTickets(data.tickets || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [load, navigation]);

  if (loading) return <ActivityIndicator style={{ marginTop: 48 }} color={COLORS.deepGreen} />;

  return (
    <View style={sharedStyles.screen}>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item._id}
        contentContainerStyle={sharedStyles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListHeaderComponent={<Text style={[sharedStyles.title, { marginBottom: SPACING.md }]}>Queue History</Text>}
        ListEmptyComponent={<EmptyState title="No past visits" subtitle="Completed or cancelled tokens will appear here." />}
        renderItem={({ item }) => (
          <View style={sharedStyles.card}>
            <View style={sharedStyles.rowBetween}>
              <Text style={styles.biz}>{item.businessId?.name || 'Business'}</Text>
              <Badge
                label={item.status.toUpperCase()}
                tone={item.status === 'completed' ? 'open' : item.status === 'skipped' ? 'paused' : 'closed'}
              />
            </View>
            <Text style={styles.meta}>
              Token {item.tokenNumber} • {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  biz: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  meta: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 6,
  },
});
