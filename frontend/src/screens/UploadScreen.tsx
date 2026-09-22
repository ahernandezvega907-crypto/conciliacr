import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useReconciliationStore } from '../store/useReconciliationStore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Upload'>;

export default function UploadScreen({ navigation }: Props) {
  const {
    bankFile,
    ledgerFile,
    isLoading,
    error,
    setBankFile,
    setLedgerFile,
    runReconciliation,
  } = useReconciliationStore();

  const pickFile = async (type: 'bank' | 'ledger') => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'text/csv',
        'text/comma-separated-values',
        'application/csv',
        'text/plain',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/pdf',
        '*/*',
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const pickedFile = {
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType,
    };

    if (type === 'bank') setBankFile(pickedFile);
    else setLedgerFile(pickedFile);
  };

  const handleReconcile = async () => {
    await runReconciliation();
    const currentError = useReconciliationStore.getState().error;
    if (!currentError) {
      navigation.navigate('Results');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>ConciliaCR</Text>
      <Text style={styles.subtitle}>Conciliación bancaria automática</Text>

      <TouchableOpacity style={styles.fileButton} onPress={() => pickFile('bank')}>
        <Text style={styles.fileButtonLabel}>Estado de cuenta bancario</Text>
        <Text style={styles.fileName}>
          {bankFile ? bankFile.name : 'Toca para seleccionar archivo'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.fileButton} onPress={() => pickFile('ledger')}>
        <Text style={styles.fileButtonLabel}>Libro contable / registro interno</Text>
        <Text style={styles.fileName}>
          {ledgerFile ? ledgerFile.name : 'Toca para seleccionar archivo'}
        </Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[
          styles.submitButton,
          (!bankFile || !ledgerFile || isLoading) && styles.submitButtonDisabled,
        ]}
        onPress={handleReconcile}
        disabled={!bankFile || !ledgerFile || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>Conciliar archivos</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 64,
    backgroundColor: '#F5F7FA',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 32,
  },
  fileButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fileButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  fileName: {
    fontSize: 15,
    color: '#111827',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});