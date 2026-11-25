import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/UI';
import { COLORS, SPACING, sharedStyles } from '../styles/theme';

const CATEGORIES = ['Clinics', 'Salons', 'College Canteens', 'Photocopy Shops', 'Service Centres'];

export default function ManageBusinessScreen({ route, navigation }) {
  const existing = route.params?.business;
  const { token } = useAuth();

  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [category, setCategory] = useState(existing?.category || CATEGORIES[0]);
  const [address, setAddress] = useState(existing?.address || '');
  const [avgMinutes, setAvgMinutes] = useState(String(existing?.averageServiceMinutes || 5));
  const [tokenPrefix, setTokenPrefix] = useState(existing?.tokenPrefix || 'A');
  const [isOpen, setIsOpen] = useState(existing ? existing.isOpen : true);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim() || !address.trim()) {
      Alert.alert('Missing Fields', 'Business name and address are required.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim(),
        category,
        address: address.trim(),
        averageServiceMinutes: Number(avgMinutes) || 5,
        tokenPrefix: tokenPrefix.trim().toUpperCase() || 'A',
        isOpen,
      };
      if (existing) {
        await apiFetch(`/api/businesses/${existing._id}`, { method: 'PUT', body, token });
      } else {
        await apiFetch('/api/businesses', { method: 'POST', body, token });
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={sharedStyles.screen} contentContainerStyle={sharedStyles.container}>
      <Text style={[sharedStyles.title, { marginBottom: SPACING.md }]}>
        {existing ? 'Edit Business' : 'New Business'}
      </Text>

      <View style={sharedStyles.card}>
        <Input label="Business Name" value={name} onChangeText={setName} placeholder="City Care Clinic" />
        <Input label="Description" value={description} onChangeText={setDescription} placeholder="Short description" />

        <Text style={styles.label}>Category</Text>
        <View style={styles.catWrap}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.chip, category === c && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input label="Address" value={address} onChangeText={setAddress} placeholder="14 MG Road" />
        <Input
          label="Avg Service Minutes"
          value={avgMinutes}
          onChangeText={setAvgMinutes}
          keyboardType="numeric"
        />
        <Input
          label="Token Prefix (e.g. A, C)"
          value={tokenPrefix}
          onChangeText={setTokenPrefix}
          maxLength={3}
          autoCapitalize="characters"
        />

        {existing ? (
          <View style={[sharedStyles.rowBetween, { marginBottom: SPACING.md }]}>
            <Text style={styles.label}>Business Open</Text>
            <Switch value={isOpen} onValueChange={setIsOpen} trackColor={{ true: COLORS.deepGreen }} />
          </View>
        ) : null}

        <Button title={existing ? 'Save Changes' : 'Create Business'} onPress={handleSave} loading={saving} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  catWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  chipActive: {
    backgroundColor: COLORS.deepGreen,
    borderColor: COLORS.deepGreen,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  chipTextActive: { color: '#FFFFFF' },
});
