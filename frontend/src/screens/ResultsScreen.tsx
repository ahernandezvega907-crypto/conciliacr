import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useReconciliationStore } from '../store/useReconciliationStore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

function formatColones(value: number): string {
  return `₡${value.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;
}

export default function ResultsScreen({ navigation }: Props) {
  const { result, reset } = useReconciliationStore();

  if (!result) {
    return (
      <View style={styles.centered}>
        <Text>No hay resultados disponibles.</Text>
      </View>
    );
  }

  const { summary, unmatched_bank, unmatched_ledger } = result;

  const handleNewReconciliation = () => {
    reset();
    navigation.navigate('Upload');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Resultado de conciliación</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Coincidencias</Text>
          <Text style={styles.summaryValueSuccess}>{summary.matched_count}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Sin conciliar (banco)</Text>
          <Text style={styles.summaryValueWarning}>{summary.unmatched_bank_count}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Sin conciliar (libro)</Text>
          <Text style={styles.summaryValueWarning}>{summary.unmatched_ledger_count}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total conciliado</Text>
          <Text style={styles.summaryValue}>{formatColones(summary.total_amount_matched)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Diferencia total</Text>
          <Text style={styles.summaryValueWarning}>
            {formatColones(summary.total_amount_discrepancy)}
          </Text>
        </View>
      </View>

      {unmatched_bank.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sin conciliar — Banco</Text>
          {unmatched_bank.map((record) => (
            <View key={record.row_id} style={styles.recordRow}>
              <Text style={styles.recordDate}>{record.fecha}</Text>
              <Text style={styles.recordDesc} numberOfLines={1}>
                {record.descripcion}
              </Text>
              <Text style={styles.recordAmount}>{formatColones(record.monto)}</Text>
            </View>
          ))}
        </View>
      )}

      {unmatched_ledger.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sin conciliar — Libro contable</Text>
          {unmatched_ledger.map((record) => (
            <View key={record.row_id} style={styles.recordRow}>
              <Text style={styles.recordDate}>{record.fecha}</Text>
              <Text style={styles.recordDesc} numberOfLines={1}>
                {record.descripcion}
              </Text>
              <Text style={styles.recordAmount}>{formatColones(record.monto)}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.newButton} onPress={handleNewReconciliation}>
        <Text style={styles.newButtonText}>Nueva conciliación</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 56,
    backgroundColor: '#F5F7FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  summaryValueSuccess: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
  },
  summaryValueWarning: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D97706',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  recordDate: {
    fontSize: 12,
    color: '#6B7280',
    width: 80,
  },
  recordDesc: {
    fontSize: 13,
    color: '#111827',
    flex: 1,
    marginHorizontal: 8,
  },
  recordAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  newButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  newButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});