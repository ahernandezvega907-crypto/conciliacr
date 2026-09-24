import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchHistory } from '../api/reconciliationApi';
import { HistoryEntry } from '../types/reconciliation.types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

function formatColones(value: number): string {
  return `₡${value.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return 'Fecha desconocida';
  const date = new Date(isoDate);
  return date.toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryScreen({ navigation }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (showFullLoader: boolean) => {
    if (showFullLoader) setIsLoading(true);
    setError(null);
    try {
      const data = await fetchHistory();
      setEntries(data);
    } catch {
      setError('No se pudo cargar el historial. Deslizá hacia abajo para reintentar.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory(true);
    }, [loadHistory])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadHistory(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Historial</Text>
        <View style={{ width: 60 }} />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Todavía no hay conciliaciones registradas.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
              {item.client_name && (
                <View style={styles.clientBadge}>
                  <Text style={styles.clientBadgeText}>{item.client_name}</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardFiles} numberOfLines={1}>
              {item.filename_bank} ↔ {item.filename_ledger}
            </Text>

            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Coincidencias</Text>
              <Text style={styles.cardValueSuccess}>{item.matched_count}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Sin conciliar (banco / libro)</Text>
              <Text style={styles.cardValueWarning}>
                {item.unmatched_bank_count} / {item.unmatched_ledger_count}
              </Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Total conciliado</Text>
              <Text style={styles.cardValue}>{formatColones(item.total_amount_matched)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    paddingTop: 56,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  backLink: {
    fontSize: 15,
    color: '#2563EB',
    fontWeight: '600',
    width: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  clientBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  clientBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  cardFiles: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  cardLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  cardValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  cardValueSuccess: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  cardValueWarning: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
});