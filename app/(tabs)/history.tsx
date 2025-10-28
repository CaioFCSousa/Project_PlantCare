import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Trash2, Share, Calendar, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';

interface Analysis {
  id: string;
  imageData?: string;
  imageUri?: string;
  result: string;
  timestamp: number;
  isFavorite?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = -100;

export default function HistoryScreen() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      const stored = await AsyncStorage.getItem('plant_analyses');
      if (stored) {
        const parsedAnalyses = JSON.parse(stored);
        setAnalyses(parsedAnalyses.sort((a: Analysis, b: Analysis) => b.timestamp - a.timestamp));
      }
    } catch (error) {
      console.error('Error loading analyses:', error);
    }
  };

  const toggleFavorite = async (id: string) => {
    try {
      const updatedAnalyses = analyses.map(analysis =>
        analysis.id === id
          ? { ...analysis, isFavorite: !analysis.isFavorite }
          : analysis
      );
      setAnalyses(updatedAnalyses);
      await AsyncStorage.setItem('plant_analyses', JSON.stringify(updatedAnalyses));
    } catch (error) {
      console.error('Error updating favorite:', error);
    }
  };

  const deleteAnalysis = async (id: string) => {
    Alert.alert(
      'Excluir Análise',
      'Tem certeza que deseja excluir esta análise? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedAnalyses = analyses.filter(analysis => analysis.id !== id);
              setAnalyses(updatedAnalyses);
              await AsyncStorage.setItem('plant_analyses', JSON.stringify(updatedAnalyses));
            } catch (error) {
              console.error('Error deleting analysis:', error);
            }
          },
        },
      ]
    );
  };

  const shareAnalysis = async (analysis: Analysis) => {
    try {
      const shareContent = `Análise de Planta - PlantAI\n\n${analysis.result}`;
      await Sharing.shareAsync('data:text/plain;base64,' + btoa(shareContent));
    } catch (error) {
      console.error('Error sharing analysis:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInHours < 1) {
      const diffInMins = Math.floor(diffInMs / (1000 * 60));
      return diffInMins <= 1 ? 'Agora' : `${diffInMins} minutos atrás`;
    } else if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'} atrás`;
    } else if (diffInDays === 1) {
      return 'Ontem';
    } else if (diffInDays < 7) {
      return `${diffInDays} dias atrás`;
    }

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const filteredAnalyses = filter === 'favorites'
    ? analyses.filter(analysis => analysis.isFavorite)
    : analyses;

  const renderAnalysisItem = ({ item, index }: { item: Analysis; index: number }) => (
    <AnimatedAnalysisItem
      item={item}
      index={index}
      onPress={() => router.push({
        pathname: '/result',
        params: {
          imageData: item.imageData,
          imageUri: item.imageUri,
          result: item.result,
          timestamp: item.timestamp.toString()
        }
      })}
      onToggleFavorite={() => toggleFavorite(item.id)}
      onShare={() => shareAnalysis(item)}
      onDelete={() => deleteAnalysis(item.id)}
      formatDate={formatDate}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Histórico</Text>
          <Text style={styles.headerSubtitle}>
            {analyses.length} {analyses.length === 1 ? 'análise' : 'análises'}
          </Text>
        </View>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
              Todas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'favorites' && styles.filterButtonActive]}
            onPress={() => setFilter('favorites')}
          >
            <Heart
              size={16}
              color={filter === 'favorites' ? '#ffffff' : '#6b7280'}
              fill={filter === 'favorites' ? '#ffffff' : 'none'}
            />
            <Text style={[styles.filterButtonText, filter === 'favorites' && styles.filterButtonTextActive]}>
              Favoritas
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {filteredAnalyses.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIconContainer}>
            <Calendar size={64} color="#d1d5db" />
          </View>
          <Text style={styles.emptyStateTitle}>
            {filter === 'favorites' ? 'Nenhuma análise favorita' : 'Nenhuma análise ainda'}
          </Text>
          <Text style={styles.emptyStateSubtitle}>
            {filter === 'favorites'
              ? 'Marque suas análises favoritas para vê-las aqui'
              : 'Comece analisando uma planta na aba principal'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAnalyses}
          renderItem={renderAnalysisItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function AnimatedAnalysisItem({
  item,
  index,
  onPress,
  onToggleFavorite,
  onShare,
  onDelete,
  formatDate,
}: {
  item: Analysis;
  index: number;
  onPress: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
  onDelete: () => void;
  formatDate: (timestamp: number) => string;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const imageUri = item.imageData
    ? `data:image/jpeg;base64,${item.imageData}`
    : item.imageUri;

  const getExcerpt = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    const firstLine = lines[0] || '';
    return firstLine.length > 80 ? firstLine.substring(0, 80) + '...' : firstLine;
  };

  return (
    <Animated.View
      style={[
        styles.animatedContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.deleteButtonContainer}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          activeOpacity={0.7}
        >
          <Trash2 size={20} color="#ffffff" />
          <Text style={styles.deleteButtonText}>Excluir</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.analysisItem, { transform: [{ translateX }] }]}>
        <TouchableOpacity
          style={styles.itemContent}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <View style={styles.imageWrapper}>
            <Image source={{ uri: imageUri }} style={styles.analysisImage} />
            {item.isFavorite && (
              <View style={styles.favoriteBadge}>
                <Heart size={12} color="#ffffff" fill="#ffffff" />
              </View>
            )}
          </View>

          <View style={styles.analysisContent}>
            <View style={styles.analysisHeader}>
              <Text style={styles.analysisDate}>{formatDate(item.timestamp)}</Text>
              <ChevronRight size={20} color="#9ca3af" />
            </View>
            <Text style={styles.analysisPreview} numberOfLines={2}>
              {getExcerpt(item.result)}
            </Text>
            <View style={styles.analysisFooter}>
              <TouchableOpacity
                onPress={onToggleFavorite}
                style={styles.footerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Heart
                  size={18}
                  color={item.isFavorite ? '#ef4444' : '#9ca3af'}
                  fill={item.isFavorite ? '#ef4444' : 'none'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onShare}
                style={styles.footerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Share size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#22c55e',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
  },
  animatedContainer: {
    marginBottom: 12,
  },
  deleteButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 16,
    width: 120,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  analysisItem: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  itemContent: {
    flexDirection: 'row',
    padding: 16,
  },
  imageWrapper: {
    position: 'relative',
  },
  analysisImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    marginRight: 16,
  },
  favoriteBadge: {
    position: 'absolute',
    top: 6,
    right: 22,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  analysisContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  analysisDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22c55e',
  },
  analysisPreview: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  analysisFooter: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  footerButton: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  emptyStateIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
