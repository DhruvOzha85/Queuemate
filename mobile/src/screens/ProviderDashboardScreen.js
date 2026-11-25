import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiFetch } from '../api/client';
import { getSocket } from '../api/socket';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, EmptyState } from '../components/UI';
import { COLORS, SPACING, sharedStyles } from '../styles/theme';

export default function ProviderDashboardScreen({ navigation }) {
  const { user, token } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadBusinesses = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/businesses?owner=${user.id}`, { token });
      const list = data.businesses || [];
      setBusinesses(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0]._id);
      }
    } finally {
      setLoading(false);
    }
  }, [user.id, token, selectedId]);

  const loadDashboard = useCallback(async () => {
    if (!selectedId) return;
    try {
      const data = await apiFetch(`/api/provider/queue/${selectedId}`, { token });
      setDashboard(data);
    } catch {
      // ignore transient
    }
  }, [selectedId, token]);

  useEffect(() => {
    loadBusinesses();
    const unsub = navigation.addListener('focus', () => {
      loadBusinesses();
      loadDashboard();
    });
    return unsub;
  }, [loadBusinesses, loadDashboard, navigation]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!selectedId) return;
    const socket = getSocket();
    socket.emit('queue:joinRoom', selectedId);
    const onUpdate = () => loadDashboard();
    socket.on('queue:updated', onUpdate);
    return () => {
      socket.off('queue:updated', onUpdate);
      socket.emit('queue:leaveRoom', selectedId);
    };
  }, [selectedId, loadDashboard]);

  async function runAction(path, method = 'POST') {
    setBusy(true);
    try {
      await apiFetch(path, { method, token });
      await loadDashboard();
    } catch (err) {
      Alert.alert('Action Failed', err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 48 }} color={COLORS.deepGreen} />;

  if (businesses.length === 0) {
    return (
      <View style={sharedStyles.screen}>
        <EmptyState
          title="No business yet"
          subtitle="Create your first business to start managing a live queue."
          actionLabel="Create Business"
          onAction={() => navigation.navigate('ManageBusiness')}
        />
      </View>
    );
  }

  const biz = dashboard?.business;
  const current = dashboard?.currentServing;
  const waiting = dashboard?.waitingTickets || [];

  return (
    <ScrollView
      style={sharedStyles.screen}
      contentContainerStyle={sharedStyles.container}
      refreshControl={<RefreshControl refreshing={false} onRefresh={loadDashboard} />}
    >
      <View style={sharedStyles.rowBetween}>
        <Text style={sharedStyles.title}>Provider</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            title="Scan QR"
            variant="accent"
            style={{ height: 38, paddingHorizontal: 12 }}
            onPress={() => navigation.navigate('QRScanner')}
          />
          <Button
            title="+ Business"
            variant="outline"
            style={{ height: 38, paddingHorizontal: 12 }}
            onPress={() => navigation.navigate('ManageBusiness')}
          />
        </View>
      </View>

      {businesses.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: SPACING.sm }}>
          {businesses.map((b) => (
            <TouchableOpacity
              key={b._id}
              onPress={() => setSelectedId(b._id)}
              style={[styles.bizTab, selectedId === b._id && styles.bizTabActive]}
            >
              <Text style={[styles.bizTabText, selectedId === b._id && styles.bizTabTextActive]}>{b.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      {biz ? (
        <>
          <View style={[sharedStyles.card, { marginTop: SPACING.md }]}>
            <View style={sharedStyles.rowBetween}>
              <Text style={styles.bizName}>{biz.name}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ManageBusiness', { business: biz })}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Badge label={biz.isOpen ? 'Open' : 'Closed'} tone={biz.isOpen ? 'open' : 'closed'} />
              {biz.isPaused ? <Badge label="Paused" tone="paused" /> : null}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{waiting.length}</Text>
                <Text style={styles.statLbl}>Waiting</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{dashboard.completedCount}</Text>
                <Text style={styles.statLbl}>Done Today</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{dashboard.averageServiceMinutes}m</Text>
                <Text style={styles.statLbl}>Avg Time</Text>
              </View>
            </View>
          </View>

          <View style={styles.servingCard}>
            <Text style={styles.servingLbl}>NOW SERVING</Text>
            <Text style={styles.servingToken}>{current ? current.tokenNumber : '—'}</Text>
            {current ? (
              <Text style={styles.servingUser}>{current.userId?.name || 'Customer'}</Text>
            ) : (
              <Text style={styles.servingUser}>No customer called yet</Text>
            )}

            <View style={styles.controlsRow}>
              <Button
                title="Call Next"
                variant="accent"
                style={{ flex: 1 }}
                loading={busy}
                disabled={biz.isPaused || waiting.length === 0}
                onPress={() => runAction(`/api/provider/queue/${biz._id}/next`, 'POST')}
              />
              {current ? (
                <Button
                  title="Complete"
                  variant="outline"
                  style={{ flex: 1 }}
                  loading={busy}
                  onPress={() => runAction(`/api/provider/ticket/${current._id}/complete`, 'PUT')}
                />
              ) : null}
            </View>

            <View style={[styles.controlsRow, { marginTop: 8 }]}>
              <Button
                title={biz.isPaused ? 'Resume Queue' : 'Pause Queue'}
                variant="danger"
                style={{ flex: 1 }}
                loading={busy}
                onPress={() =>
                  runAction(`/api/provider/queue/${biz._id}/${biz.isPaused ? 'resume' : 'pause'}`, 'PUT')
                }
              />
              {current ? (
                <Button
                  title="Skip"
                  variant="outline"
                  style={{ flex: 1 }}
                  loading={busy}
                  onPress={() => runAction(`/api/provider/ticket/${current._id}/skip`, 'PUT')}
                />
              ) : null}
            </View>
          </View>

          <Text style={sharedStyles.sectionTitle}>Waiting List ({waiting.length})</Text>
          {waiting.length === 0 ? (
            <EmptyState title="Queue is empty" subtitle="Waiting customers will appear here in real time." />
          ) : (
            waiting.map((t) => (
              <View key={t._id} style={sharedStyles.card}>
                <View style={sharedStyles.rowBetween}>
                  <View>
                    <Text style={styles.waitToken}>{t.tokenNumber}</Text>
                    <Text style={styles.waitName}>{t.userId?.name || 'Customer'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    {t.isPriority ? <Badge label="Priority" tone="priority" /> : null}
                    <TouchableOpacity
                      onPress={() => runAction(`/api/provider/ticket/${t._id}/priority`, 'PUT')}
                      style={styles.miniBtn}
                    >
                      <Text style={styles.miniBtnText}>{t.isPriority ? 'Unprioritize' : 'Priority'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => runAction(`/api/provider/ticket/${t._id}/skip`, 'PUT')}
                      style={styles.miniBtn}
                    >
                      <Text style={styles.miniBtnText}>Skip</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bizTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  bizTabActive: {
    backgroundColor: COLORS.deepGreen,
    borderColor: COLORS.deepGreen,
  },
  bizTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  bizTabTextActive: {
    color: '#FFFFFF',
  },
  bizName: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.text,
  },
  editLink: {
    color: COLORS.deepGreen,
    fontWeight: '700',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  stat: { flex: 1 },
  statVal: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  statLbl: { fontSize: 12, color: COLORS.muted },
  servingCard: {
    backgroundColor: COLORS.deepGreen,
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  servingLbl: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  servingToken: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
    marginTop: 4,
  },
  servingUser: {
    color: '#D7E3DC',
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  waitToken: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  waitName: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  miniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  miniBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
});
