import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/UI';
import { COLORS, SPACING, sharedStyles } from '../styles/theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    setError('');
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError('Enter name, valid email, and a password of at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={sharedStyles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={sharedStyles.title}>Create Account</Text>
          <Text style={sharedStyles.subtitle}>Join QueueMate as a customer or service provider.</Text>
        </View>

        <View style={sharedStyles.card}>
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <View style={styles.roleRow}>
            {['customer', 'provider'].map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRole(r)}
                style={[styles.roleChip, role === r && styles.roleChipActive]}
              >
                <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                  {r === 'customer' ? 'Customer' : 'Service Provider'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input label="Full Name" value={name} onChangeText={setName} placeholder="Alex Rivera" />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View>
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Minimum 6 characters"
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={styles.togglePass}>
              <Text style={styles.togglePassText}>{showPass ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <Button title="Create Account" onPress={handleRegister} loading={loading} />
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.footerLink}>
          <Text style={styles.footerText}>
            Already have an account? <Text style={styles.footerBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.md,
  },
  roleChip: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  roleChipActive: {
    backgroundColor: COLORS.deepGreen,
    borderColor: COLORS.deepGreen,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  roleTextActive: {
    color: '#FFFFFF',
  },
  errorBanner: {
    backgroundColor: '#FDE8E6',
    color: COLORS.danger,
    padding: 10,
    borderRadius: 10,
    marginBottom: SPACING.md,
    fontSize: 13,
    fontWeight: '600',
  },
  togglePass: {
    position: 'absolute',
    right: 14,
    top: 36,
  },
  togglePassText: {
    color: COLORS.deepGreen,
    fontWeight: '700',
    fontSize: 13,
  },
  footerLink: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  footerText: {
    color: COLORS.muted,
    fontSize: 14,
  },
  footerBold: {
    color: COLORS.deepGreen,
    fontWeight: '700',
  },
});
