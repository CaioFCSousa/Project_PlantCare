import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  PanResponder, // Adicionado para o gesto de deslize
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Trash2, Share, Calendar, ChevronRight, XCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from '@react-navigation/native'; // Necessário para recarregar ao focar

interface Analysis {
  id: string;
  imageData?: string;
  imageUri?: string;
  result: string;
  timestamp: number;
  isFavorite?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ICON_STROKE_WIDTH = 2.5;
const DELETE_AREA_WIDTH = 120;
const SWIPE_THRESHOLD = -40; 

export default function HistoryScreen() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');

  const loadAnalyses = async () => {
    try {
      const stored = await AsyncStorage.getItem('plant_analyses');
      if (stored) {
        const parsedAnalyses: Analysis[] = JSON.parse(stored);
        setAnalyses(parsedAnalyses.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        setAnalyses([]);
      }
    } catch (error) {
      console.error('Error loading analyses:', error);
    }
  };

  // ✅ Recarrega a lista toda vez que a tela do Histórico é focada
  useFocusEffect(
    useCallback(() => {
      loadAnalyses();
    }, [])
  );

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
      'Tem certeza que deseja excluir esta análise?',
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

  const clearAllHistory = () => {
    Alert.alert(
      'Limpar Histórico',
      'Tem certeza que deseja apagar TODAS as análises? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar Tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('plant_analyses');
              setAnalyses([]);
              if (filter === 'favorites') {
                setFilter('all');
              }
            } catch (error) {
              console.error('Error clearing all history:', error);
              Alert.alert('Erro', 'Não foi possível limpar o histórico.');
            }
          },
        },
      ]
    );
  };

  const shareAnalysis = async (analysis: Analysis) => {
    try {
      const shareContent = `Análise de Planta - PlantAI\n\n${analysis.result}`;
      await Sharing.shareAsync(`data:text/plain;base64,${Buffer.from(shareContent).toString('base64')}`);
    } catch (error) {
      console.error('Error sharing analysis:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar a análise.');
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
      return diffInMins <= 1 ? 'Agora' : `${diffInMins} min atrás`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h atrás`;
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
        <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Histórico</Text>
              <Text style={styles.headerSubtitle}>
                {analyses.length} {analyses.length === 1 ? 'análise' : 'análises'} salvas
              </Text>
            </View>
            {analyses.length > 0 && (
              <TouchableOpacity style={styles.clearButton} onPress={clearAllHistory}>
                <XCircle size={20} color="#ef4444" strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.clearButtonText}>Limpar</Text>
              </TouchableOpacity>
            )}
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
              color={filter === 'favorites' ? '#ffffff' : '#ef4444'}
              fill={filter === 'favorites' ? '#ffffff' : 'none'}
              strokeWidth={ICON_STROKE_WIDTH}
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
            <Calendar size={64} color="#d1d5db" strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          <Text style={styles.emptyStateTitle}>
            {filter === 'favorites' ? 'Nenhuma análise favorita' : 'Nenhuma análise ainda'}
          </Text>
          <Text style={styles.emptyStateSubtitle}>
            {filter === 'favorites'
              ? 'Marque suas análises favoritas para vê-las aqui.'
              : 'Comece analisando uma planta na aba principal.'
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

  // 🚨 IMPLEMENTAÇÃO DO SWIPE-TO-DELETE COM PANRESPONDER
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Apenas se for um deslize horizontal e for significativo
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        // Limita o deslize apenas para a esquerda
        if (gestureState.dx < 0) {
          // Limita o deslize para no máximo a largura do botão de delete
          const newDx = Math.max(gestureState.dx, -DELETE_AREA_WIDTH);
          translateX.setValue(newDx);
        } else {
          // Se tentar deslizar para a direita, mantém no 0 ou adiciona um pequeno bounce
          translateX.setValue(Math.min(gestureState.dx * 0.2, 0)); 
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Se deslizar o suficiente, abre totalmente o botão
        if (gestureState.dx < SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -DELETE_AREA_WIDTH,
            useNativeDriver: true,
          }).start();
        } else {
          // Volta à posição inicial
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Animação de entrada
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
    const problemMatch = text.match(/Principal Problema Identificado:\s*\[([^\]]+)\]/i);
    if (problemMatch && problemMatch[1]) {
        return `Problema: ${problemMatch[1].trim()}`;
    }
    
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
      {/* ⚠️ Fundo de Deslize Fixo: Contém o botão Excluir */}
      <View style={styles.swipeBackground}>
        <TouchableOpacity
          style={styles.deleteSwipeButton}
          onPress={() => {
            // Fecha o deslize antes de deletar
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(() => {
              onDelete(); 
            });
          }}
          activeOpacity={0.9}
        >
          <Trash2 size={24} color="#ffffff" strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.deleteButtonTextSwipe}>Excluir</Text>
        </TouchableOpacity>
      </View>

      {/* 🚀 Item da Análise: Deslizável */}
      <Animated.View 
        style={[styles.analysisItem, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers} // Aplica os manipuladores de gesto
      >
        <TouchableOpacity
          style={styles.itemContent}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <View style={styles.imageWrapper}>
            <Image source={{ uri: imageUri }} style={styles.analysisImage} />
            {item.isFavorite && (
              <View style={styles.favoriteBadge}>
                <Heart size={12} color="#ffffff" fill="#ffffff" strokeWidth={ICON_STROKE_WIDTH} />
              </View>
            )}
          </View>

          <View style={styles.analysisContent}>
            <View style={styles.analysisHeader}>
              <Text style={styles.analysisDate}>{formatDate(item.timestamp)}</Text>
              <ChevronRight size={20} color="#9ca3af" strokeWidth={ICON_STROKE_WIDTH} />
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
                  strokeWidth={ICON_STROKE_WIDTH}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onShare}
                style={styles.footerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Share size={18} color="#9ca3af" strokeWidth={ICON_STROKE_WIDTH} />
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    gap: 4,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
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
  // 🚀 ESTILOS PARA O SWIPE-TO-DELETE
  swipeBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: DELETE_AREA_WIDTH,
    backgroundColor: '#fca5a5',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 12,
  },
  deleteSwipeButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
    height: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  deleteButtonTextSwipe: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  // -----------------------------------
  analysisItem: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    zIndex: 2,
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
    color: '#374151',
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