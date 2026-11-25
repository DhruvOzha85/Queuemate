import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Notifications from 'expo-notifications';
import { apiFetch } from '../api/client';
import { getSocket } from '../api/socket';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, EmptyState } from '../components/UI';
import { COLORS, SPACING, sharedStyles } from '../styles/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function MyQueueScreen({ navigation }) {
  const { token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const lastStatusRef = useRef({});

  const loadTickets = useCallback(async () => {
    try {
      const data = await apiFetch('/api/queue/my-ticket', { token });
      const list = data.tickets || [];

      for (const t of list) {
        const prev = lastStatusRef.current[t._id];
        if (prev && prev !== t.status && t.status === 'called') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Your turn has arrived!',
              body: `Token ${t.tokenNumber} is now being called at ${t.business?.name}.`,
            },
            trigger: null,
          }).catch(() => {});
        }
        lastStatusRef.current[t._id] = t.status;
      }

      setTickets(list);
    } catch {
      // Keep last state on transient error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadTickets();
    const unsub = navigation.addListener('focus', loadTickets);
    return unsub;
  }, [loadTickets, navigation]);

  useEffect(() => {
    const socket = getSocket();
    const bizIds = tickets.map((t) => t.business?._id).filter(Boolean);
    bizIds.forEach((id) => socket.emit('queue:joinRoom', id));

    const onUpdate = () => loadTickets();
    socket.on('queue:updated', onUpdate);
    socket.on('connect', loadTickets);

    return () => {
      socket.off('queue:updated', onUpdate);
      socket.off('connect', loadTickets);
      bizIds.forEach((id) => socket.emit('queue:leaveRoom', id));
    };
  }, [tickets.length, loadTickets]);

  async function handleCancel(ticketId) {
    Alert.alert('Cancel Ticket', 'Are you sure you want to leave this queue?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          setCancellingId(ticketId);
          try {
            await apiFetch(`/api/queue/ticket/${ticketId}/cancel`, { method: 'PUT', token });
            loadTickets();
          } catch (err) {
            Alert.alert('Error', err.message);
          } finally {
            setCancellingId(null);
          }
        },
      },
    ]);
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 48 }} color={COLORS.deepGreen} />;

  return (
    <ScrollView
      style={sharedStyles.screen}
      contentContainerStyle={sharedStyles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTickets(); }} />}
    >
      <Text style={[sharedStyles.title, { marginBottom: SPACING.md }]}>My Queue</Text>

      {tickets.length === 0 ? (
        <EmptyState
          title="No active tokens"
          subtitle="Join a queue from the Explore tab to get your digital ticket."
          actionLabel="Explore Businesses"
          onAction={() => navigation.navigate('Explore')}
        />
      ) : (
        tickets.map((t) => {
          const isCalled = t.status === 'called';
          const isPaused = t.business?.isPaused;
          const progress = t.totalWaiting > 0 ? Math.max(0.1, 1 - t.peopleAhead / (t.totalWaiting + 1)) : 1;

          return (
            <View key={t._id} style={styles.ticketCard}>
              <View style={styles.ticketTop}>
                <View style={sharedStyles.rowBetween}>
                  <Text style={styles.bizTitle}>{t.business?.name}</Text>
                  <Badge
                    label={isCalled ? 'YOUR TURN' : isPaused ? 'PAUSED' : 'WAITING'}
                    tone={isCalled ? 'called' : isPaused ? 'paused' : 'open'}
                  />
                </View>

                <Text style={styles.tokenLabel}>YOUR TOKEN</Text>
                <Text style={styles.tokenBig}>{t.tokenNumber}</Text>
                {t.isPriority ? <Badge label="Priority" tone="priority" /> : null}
              </View>

              <View style={styles.perforation} />

              <View style={styles.ticketBottom}>
                <View style={styles.metricsRow}>
                  <View style={styles.mItem}>
                    <Text style={styles.mVal}>{t.currentServingToken || '—'}</Text>
                    <Text style={styles.mLbl}>Serving</Text>
                  </View>
                  <View style={styles.mItem}>
                    <Text style={styles.mVal}>{t.peopleAhead}</Text>
                    <Text style={styles.mLbl}>Ahead</Text>
                  </View>
                  <View style={styles.mItem}>
                    <Text style={styles.mVal}>
                      {isPaused ? 'Paused' : isCalled ? 'Now' : `${t.estimatedWaitMinutes ?? 0}m`}
                    </Text>
                    <Text style={styles.mLbl}>Est. Wait</Text>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                </View>

                <View style={styles.qrWrap}>
                  <QRCode value={JSON.stringify({ ticketId: t._id, tokenNumber: t.tokenNumber })} size={110} />
                  <Text style={styles.qrHint}>Show this QR at the counter</Text>
                </View>

                <Button
                  title="Cancel Ticket"
                  variant="outline"
                  loading={cancellingId === t._id}
                  onPress={() => handleCancel(t._id)}
                />
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ticketCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  ticketTop: {
    backgroundColor: COLORS.deepGreen,
    padding: SPACING.lg,
  },
  bizTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  tokenLabel: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: SPACING.md,
  },
  tokenBig: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -1,
    marginVertical: 4,
  },
  perforation: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ticketBottom: {
    padding: SPACING.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  mItem: {
    flex: 1,
  },
  mVal: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  mLbl: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.bg,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  qrWrap: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  qrHint: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 8,
  },
});
