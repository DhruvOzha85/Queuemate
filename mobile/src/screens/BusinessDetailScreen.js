import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, EmptyState } from '../components/UI';
import { COLORS, SPACING, sharedStyles } from '../styles/theme';

export default function BusinessDetailScreen({ route, navigation }) {
  const { businessId } = route.params;
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await apiFetch(`/api/queue/${businessId}`);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleJoin() {
    setJoining(true);
    try {
      await apiFetch(`/api/queue/${businessId}/join`, { method: 'POST', token });
      navigation.navigate('MyQueue');
    } catch (err) {
      Alert.alert('Cannot Join Queue', err.message);
    } finally {
      setJoining(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 48 }} color={COLORS.deepGreen} />;
  if (error || !data) {
    return <EmptyState title="Unable to load business" subtitle={error} actionLabel="Retry" onAction={load} />;
  }

  const { business, currentServingToken, waitingCount, estimatedWaitMinutes } = data;
  const canJoin = business.isOpen && !business.isPaused;

  return (
    <ScrollView style={sharedStyles.screen} contentContainerStyle={sharedStyles.container}>
      <View style={sharedStyles.card}>
        <View style={sharedStyles.rowBetween}>
          <Badge label={business.category} tone="neutral" />
          <Badge
            label={!business.isOpen ? 'Closed' : business.isPaused ? 'Paused' : 'Open'}
            tone={!business.isOpen ? 'closed' : business.isPaused ? 'paused' : 'open'}
          />
        </View>
        <Text style={[sharedStyles.title, { marginTop: SPACING.sm }]}>{business.name}</Text>
        {business.description ? <Text style={styles.desc}>{business.description}</Text> : null}
        <Text style={styles.addr}>{business.address}</Text>
      </View>

      <View style={sharedStyles.card}>
        <Text style={sharedStyles.sectionTitle}>Live Queue Status</Text>
        <View style={styles.grid}>
          <View style={styles.metric}>
            <Text style={styles.metricVal}>{currentServingToken || '—'}</Text>
            <Text style={styles.metricLbl}>Now Serving</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricVal}>{waitingCount}</Text>
            <Text style={styles.metricLbl}>Waiting</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricVal}>{business.averageServiceMinutes}m</Text>
            <Text style={styles.metricLbl}>Avg Service</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricVal}>
              {business.isPaused ? 'Paused' : `${estimatedWaitMinutes ?? 0}m`}
            </Text>
            <Text style={styles.metricLbl}>Est. Wait</Text>
          </View>
        </View>
      </View>

      <Button
        title={canJoin ? 'Join Queue & Get Token' : business.isPaused ? 'Queue is Paused' : 'Business Closed'}
        onPress={handleJoin}
        loading={joining}
        disabled={!canJoin}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  desc: {
    fontSize: 15,
    color: COLORS.text,
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
  addr: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: SPACING.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metric: {
    width: '47%',
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: SPACING.md,
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  metricLbl: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
});
