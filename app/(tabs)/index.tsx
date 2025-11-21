import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Ajuste de ícones: importando os novos ícones para a seção Dicas
import { 
  Camera, Image as ImageIcon, Sparkles, Leaf, ChevronRight, Clock,
  Sun, Target, Layers // 🚨 NOVOS ÍCONES PARA DICAS
} from 'lucide-react-native'; 
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const ICON_PRIMARY_COLOR = '#16a34a'; // Cor verde primária
const ICON_STROKE_WIDTH = 2.5; // Nova espessura da linha

interface Analysis {
  id: string;
  imageData: string;
  result: string;
  timestamp: number;
  isFavorite?: boolean;
}

// ... (Restante do componente HomeScreen, funções e estados mantidos) ...

export default function HomeScreen() {
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRecentAnalyses();
  }, []);

  const loadRecentAnalyses = async () => {
    try {
      const stored = await AsyncStorage.getItem('plant_analyses');
      if (stored) {
        const analyses: Analysis[] = JSON.parse(stored);
        analyses.sort((a, b) => b.timestamp - a.timestamp); 
        setRecentAnalyses(analyses.slice(0, 3));
      }
    } catch (error) {
      console.error('Error loading analyses:', error);
    }
  };

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert(
        'Permissões Necessárias',
        'Este app precisa de acesso à câmera e galeria para funcionar corretamente.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const processImageSelection = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].base64) {
      router.push({
        pathname: '/analysis',
        params: { imageData: result.assets[0].base64 },
      });
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsLoading(true);
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    setIsLoading(false);
    processImageSelection(result);
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsLoading(true);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    setIsLoading(false);
    processImageSelection(result);
  };

  const handleMainButtonPress = () => {
    Alert.alert(
      'Escolha uma opção',
      'Como você gostaria de adicionar a imagem para análise?',
      [
        { text: 'Câmera', onPress: takePhoto },
        { text: 'Galeria', onPress: pickImage },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getProblemFromAnalysis = (result: string): string => {
    const match = result.match(/Principal Problema Identificado:\s*\[(.*?)\]/i);
    if (match && match[1]) {
      const problem = match[1].trim();
      if (problem && problem.toLowerCase() !== 'problema') {
        return problem;
      }
    }
    return result.includes('## 🚨 ERRO DE IMAGEM') ? 'Erro de Imagem' : 'Análise da Planta';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            {/* Ícone principal maior e mais espesso */}
            <Leaf size={36} color={ICON_PRIMARY_COLOR} strokeWidth={ICON_STROKE_WIDTH} /> 
            <Text style={styles.headerTitle}>PlantAI</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            A inteligência artificial que cuida das suas plantas.
          </Text>
        </View>

        <View style={styles.actionSection}>
          <LinearGradient
            colors={['#16a34a', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainButton}
          >
            <TouchableOpacity
              style={styles.mainButtonContent}
              onPress={handleMainButtonPress}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="large" />
              ) : (
                <>
                  {/* Ícone principal do botão maior e mais espesso */}
                  <Sparkles size={40} color="#ffffff" strokeWidth={ICON_STROKE_WIDTH} /> 
                  <Text style={styles.mainButtonText}>Analisar Planta Agora</Text>
                  <Text style={styles.mainButtonSubtext}>
                    Diagnóstico instantâneo e recomendações de cuidados
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={takePhoto}>
            {/* Ícones de ação mais espessos */}
            <Camera size={28} color={ICON_PRIMARY_COLOR} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.quickActionText}>Tirar Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={pickImage}>
            {/* Ícones de ação mais espessos */}
            <ImageIcon size={28} color={ICON_PRIMARY_COLOR} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.quickActionText}>Da Galeria</Text>
          </TouchableOpacity>
        </View>

        {recentAnalyses.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Últimas Análises</Text>
            
            {recentAnalyses.map((analysis) => (
              <TouchableOpacity
                key={analysis.id}
                style={styles.recentItem}
                onPress={() => router.push({
                  pathname: '/result',
                  params: {
                    imageData: analysis.imageData,
                    result: analysis.result,
                    timestamp: analysis.timestamp.toString(),
                  },
                })}
              >
                <View style={styles.recentItemContent}>
                  <Image 
                    source={{ uri: `data:image/jpeg;base64,${analysis.imageData}` }} 
                    style={styles.recentItemImage} 
                  />
                  <View style={styles.recentItemText}>
                    <Text style={styles.recentItemTitle} numberOfLines={1}>
                      {getProblemFromAnalysis(analysis.result)}
                    </Text>
                    <View style={styles.recentItemSubtitleRow}>
                      {/* Ícone menor, mas mais espesso */}
                      <Clock size={14} color="#6b7280" strokeWidth={ICON_STROKE_WIDTH} style={{ marginRight: 4 }} /> 
                      <Text style={styles.recentItemSubtitle}>
                        {formatDate(analysis.timestamp)}
                      </Text>
                    </View>
                  </View>
                </View>
                {/* Ícone menor, mas mais espesso */}
                <ChevronRight size={22} color="#9ca3af" strokeWidth={ICON_STROKE_WIDTH} /> 
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('/history')}
            >
              <Text style={styles.viewAllText}>Ver Histórico Completo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 🚀 SEÇÃO DE DICAS MELHORADA COM ÍCONES LUCIDE */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Dicas para Análises Precisas</Text>
          
          <View style={styles.tipItem}>
            <View style={styles.tipRow}>
                <Sun size={20} color="#f59e0b" strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.tipText}>
                    Boa Iluminação: Tire fotos com luz natural, evitando sombras fortes.
                </Text>
            </View>
          </View>
          
          <View style={styles.tipItem}>
            <View style={styles.tipRow}>
                <Target size={20} color="#dc2626" strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.tipText}>
                    Foco no Problema: Mantenha a área afetada (folha, haste) em foco no centro.
                </Text>
            </View>
          </View>

          <View style={styles.tipItem}>
            <View style={styles.tipRow}>
                <Layers size={20} color="#3b82f6" strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.tipText}>
                    Múltiplos Ângulos: Se possível, tente fotos da parte superior e inferior da folha.
                </Text>
            </View>
          </View>
          
        </View>
        {/* Fim da seção de Dicas */}
        
      </ScrollView>
    </SafeAreaView>
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
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1f2937',
    marginLeft: 10,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
    marginTop: 4,
  },
  actionSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  mainButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  mainButtonContent: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  mainButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 10,
    marginBottom: 6,
  },
  mainButtonSubtext: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 16,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  recentSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  recentItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: '#4ade80', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  recentItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  recentItemText: {
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  recentItemSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentItemSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  viewAllButton: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#16a34a',
  },
  tipsSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  tipItem: {
    backgroundColor: '#e0f2f1',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Alinha o ícone e o texto no topo
    gap: 12,
  },
  tipText: {
    flex: 1, // Permite que o texto ocupe o restante do espaço
    fontSize: 14,
    color: '#065f46',
    lineHeight: 20,
  },
});