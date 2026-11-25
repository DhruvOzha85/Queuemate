import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/UI';
import { COLORS, SPACING, sharedStyles } from '../styles/theme';

export default function QRScannerScreen({ navigation }) {
  const { token } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return <View style={sharedStyles.screen} />;
  }

  if (!permission.granted) {
    return (
      <View style={[sharedStyles.screen, styles.center]}>
        <Text style={styles.msg}>Camera permission is required to scan customer QR tickets.</Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  async function handleBarCodeScanned({ data }) {
    if (scanned) return;
    setScanned(true);
    try {
      const parsed = JSON.parse(data);
      const res = await apiFetch('/api/provider/ticket/verify-qr', {
        method: 'POST',
        body: { ticketId: parsed.ticketId },
        token,
      });
      Alert.alert(
        res.valid ? 'Valid Ticket' : 'Inactive Ticket',
        `Token: ${res.ticket.tokenNumber}\nCustomer: ${res.ticket.userId?.name || 'Customer'}\nStatus: ${res.ticket.status.toUpperCase()}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Invalid QR', err.message || 'Could not verify ticket', [
        { text: 'Scan Again', onPress: () => setScanned(false) },
      ]);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>Align customer QR code inside the frame</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  msg: { fontSize: 15, color: COLORS.text, textAlign: 'center', marginBottom: SPACING.md },
  overlay: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(21,24,22,0.8)',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  overlayText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
