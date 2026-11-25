import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Badge, Button } from '../components/UI';
import { COLORS, SPACING, sharedStyles } from '../styles/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={[sharedStyles.screen, sharedStyles.container]}>
      <Text style={sharedStyles.title}>Account</Text>
      <View style={[sharedStyles.card, { marginTop: SPACING.md }]}>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={{ marginTop: SPACING.sm }}>
          <Badge label={user?.role === 'provider' ? 'Service Provider' : 'Customer'} tone="open" />
        </View>
      </View>

      <Button title="Sign Out" variant="danger" onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  email: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 4,
  },
});
