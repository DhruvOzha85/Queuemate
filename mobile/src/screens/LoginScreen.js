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

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
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
        <View style={styles.brand}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>QUEUEMATE</Text>
          </View>
          <Text style={sharedStyles.title}>Skip the line,{'\n'}keep your time.</Text>
          <Text style={sharedStyles.subtitle}>Sign in to join or manage live queues.</Text>
        </View>

        <View style={sharedStyles.card}>
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

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
              placeholder="Enter password"
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={styles.togglePass}>
              <Text style={styles.togglePassText}>{showPass ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <Button title="Sign In" onPress={handleLogin} loading={loading} />
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.footerLink}>
          <Text style={styles.footerText}>
            New here? <Text style={styles.footerBold}>Create an account</Text>
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
  brand: {
    marginBottom: SPACING.lg,
  },
  pill: {
    backgroundColor: COLORS.accent,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: SPACING.sm,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.text,
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
