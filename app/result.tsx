import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

import { 
  ArrowLeft, Heart, Share, RotateCcw,
  CheckCircle, AlertTriangle, ClipboardList, Leaf, AlertCircle 
} from 'lucide-react-native'; 
import Markdown from 'react-native-markdown-display';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';


const customMarkdownStyles = {
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151', 
  },
  heading1: {
    fontSize: 22, 
    fontWeight: '800',
    color: '#1A4D2E', 
    marginBottom: 16,
    marginTop: 0, 
  },
  strong: {
    fontWeight: 'bold',
    color: '#1f2937', 
  },
  paragraph: {
    marginBottom: 8, 
  },
  list_item: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    marginLeft: 0, 
    paddingLeft: 0,
    marginTop: 4, 
  },
  bullet_list: {
    paddingLeft: 0,
    marginVertical: 10,
  },
  blockquote: {
    backgroundColor: '#fef2f2', 
    borderLeftWidth: 5,
    borderLeftColor: '#ef4444', 
    paddingLeft: 16,
    paddingVertical: 12,
    marginVertical: 16,
    borderRadius: 8,
    color: '#b91c1c', 
  },
  list_item_blockquote: { 
    color: '#b91c1c',
  },
};

export default function ResultScreen() {
  const { imageData, result, timestamp } = useLocalSearchParams<{
    imageData: string;
    result: string;
    timestamp: string;
  }>();
  
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
      const loadFavoriteStatus = async () => {
          try {
              const stored = await AsyncStorage.getItem('plant_analyses');
              if (stored && timestamp) {
                  const analyses = JSON.parse(stored);
                  const currentAnalysis = analyses.find((analysis: any) => analysis.timestamp.toString() === timestamp);
                  if (currentAnalysis) {
                      setIsFavorite(currentAnalysis.isFavorite || false);
                  }
              }
          } catch (error) {
              console.error('Error loading favorite status:', error);
          }
      };
      loadFavoriteStatus();
  }, [timestamp]);

  const toggleFavorite = async () => {
    try {
      const stored = await AsyncStorage.getItem('plant_analyses');
      if (stored) {
        const analyses = JSON.parse(stored);
        const updatedAnalyses = analyses.map((analysis: any) =>
          analysis.timestamp.toString() === timestamp
            ? { ...analysis, isFavorite: !analysis.isFavorite }
            : analysis
        );
        await AsyncStorage.setItem('plant_analyses', JSON.stringify(updatedAnalyses));
        setIsFavorite(!isFavorite);
      }
    } catch (error) {
      console.error('Error updating favorite:', error);
    }
  };

  const shareResult = async () => {
    try {
      const shareContent = `Análise de Planta - PlantAI\n\n${result}`;
      // Usando Buffer para btoa/atob que é mais seguro em React Native (ou usando a polyfill)
      await Sharing.shareAsync('data:text/plain;base64,' + Buffer.from(shareContent).toString('base64'), {
          mimeType: 'text/plain',
          dialogTitle: 'Compartilhar Análise PlantAI',
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível compartilhar a análise.');
    }
  };

  const newAnalysis = () => {
    router.replace('/(tabs)'); 
  };

  const formatDate = (ts: string) => {
    return new Date(parseInt(ts)).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!imageData || !result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Erro: Dados da análise não encontrados</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Determinar se o resultado é um erro com base no conteúdo
  const isErrorResult = result.includes('## 🚨 ERRO DE IMAGEM');

  // Regex para extrair as partes específicas do Markdown (Mantido)
  const getSectionContent = (sectionTitleRegex: RegExp) => {
    const match = result.match(sectionTitleRegex);
    if (match && match.index !== -1) {
      const startIndex = match.index + match[0].length;
      let endIndex = result.length;

      const nextSectionMatch = result.substring(startIndex).match(/## [^\n]+/);
      if (nextSectionMatch && nextSectionMatch.index !== -1) {
        endIndex = startIndex + nextSectionMatch.index;
      }
      return result.substring(startIndex, endIndex).trim();
    }
    return '';
  };

  const analysisConcluidaContent = getSectionContent(/## ✅ ANÁLISE CONCLUÍDA/);
  const tipoProblemaContent = getSectionContent(/## 🚫 TIPO DE PROBLEMA/);
  const caracteristicasContent = getSectionContent(/## 📋 CARACTERÍSTICAS/);
  const cuidadosContent = getSectionContent(/## 💚 CUIDADOS IMEDIATOS \(Ações Simples\)/);
  const erroContent = getSectionContent(/## 🚨 ERRO DE IMAGEM/);


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resultado da Análise</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleFavorite} style={styles.headerButton}>
            <Heart
              size={24}
              color={isFavorite ? '#ef4444' : '#6b7280'}
              fill={isFavorite ? '#ef4444' : 'none'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={shareResult} style={styles.headerButton}>
            <Share size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Seção da Imagem e Data */}
        <View style={styles.imageSection}>
          <Image source={{ uri: `data:image/jpeg;base64,${imageData}` }} style={styles.resultImage} />
          <Text style={styles.analysisDate}>
            Analisado em {formatDate(timestamp)}
          </Text>
        </View>

        {isErrorResult ? (
          // Bloco de erro especial se for um resultado de erro da IA
          <View style={styles.cardError}>
            <View style={styles.cardHeader}>
              <AlertCircle size={22} color="#ef4444" style={styles.cardIcon} />
              <Text style={styles.cardTitleError}>
                Erro na Análise!
              </Text>
            </View>
            <Markdown style={customMarkdownStyles}>
                {erroContent}
            </Markdown>
          </View>
        ) : (
          <View style={styles.cardbox}>
            {/* Cartão "Análise Concluída!" */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                 {/* 🟢 ÍCONE CheckCircle */}
                 <CheckCircle size={50} color="#22c55e" style={styles.cardIcon} />
                 <Text style={styles.cardTitle}>
                    Análise Concluída!
                 </Text>
              </View>
              <Markdown style={customMarkdownStyles}>
                {analysisConcluidaContent}
              </Markdown>
            </View>

            {/* Cartão "Tipo de Problema" */}
            {tipoProblemaContent.length > 0 && (
              <View style={styles.card}>
                 <View style={styles.cardHeader}>
                    {/* 🟠 ÍCONE AlertTriangle */}
                    <AlertTriangle size={22} color="#f97316" style={styles.cardIcon} />
                    <Text style={styles.cardTitleOrange}>
                        Tipo de Problema
                    </Text>
                 </View>
                <Markdown style={customMarkdownStyles}>
                  {tipoProblemaContent}
                </Markdown>
              </View>
            )}

            {/* Cartão "Características Identificadas" */}
            {caracteristicasContent.length > 0 && (
              <View style={styles.card}>
                 <View style={styles.cardHeader}>
                    {/* 🔵 ÍCONE ClipboardList */}
                    <ClipboardList size={22} color="#3b82f6" style={styles.cardIcon} />
                    <Text style={styles.cardTitleBlue}>
                        Características Identificadas
                    </Text>
                 </View>
                <Markdown style={customMarkdownStyles}>
                  {caracteristicasContent}
                </Markdown>
              </View>
            )}

            {/* Cartão "Cuidados Imediatos" - Fundo verde escuro */}
            {cuidadosContent.length > 0 && (
              <View style={styles.cardGreen}>
                 <View style={styles.cardHeader}>
                    {/* 🍃 ÍCONE Leaf */}
                    <Leaf size={22} color="#ffffff" style={styles.cardIcon} />
                    <Text style={styles.cardTitleGreen}>
                        Cuidados Imediatos
                    </Text>
                 </View>
                <Markdown style={{ ...customMarkdownStyles, body: { color: '#ffffff' }, strong: { color: '#ffffff' }, list_item: { color: '#ffffff' } }}>
                  {cuidadosContent}
                </Markdown>
              </View>
            )}
          </View>
        )}
        
        {/* Espaço extra no final da ScrollView para o botão fixo */}
        <View style={{ height: 100 }} /> 
      </ScrollView>

      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.newAnalysisButton} onPress={newAnalysis}>
          <RotateCcw size={20} color="#ffffff" />
          <Text style={styles.newAnalysisButtonText}>Fazer Nova Análise</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16, 
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 16,
  },
  resultImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
    marginBottom: 12,
    borderColor: '#e0e0e0',
    borderWidth: 1,
  },
  analysisDate: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  
  // --- NOVOS ESTILOS PARA CARTÕES E TÍTULOS ---
  mainTitleContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  mainScreenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 4,
  },
  mainScreenSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  cardbox:{
    backgroundColor:'#F2FDF5',
    padding: 16,
    borderRadius:15,
    borderColor: '#5dbe7849',
    borderWidth: 2
  },

  card: {
    backgroundColor: '#ffffff', 
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  cardGreen: {
    backgroundColor: '#22c55e', 
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardError: {
    backgroundColor: '#fef2f2', 
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    marginRight: 8,
  },
  cardTitle: { 
    fontSize: 30,
    fontWeight: '700',
    color: '#22c55e', 
  },
  cardTitleOrange: { 
    fontWeight: '700',
    color: '#f97316', 
  },
  cardTitleBlue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b82f6', 
  },
  cardTitleGreen: { 
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff', 
  },
  cardTitleError: { 
    fontSize: 18,
    fontWeight: '700',
    color: '#ef4444', 
  },


  bottomActions: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    position: 'absolute', 
    bottom: 0,
    left: 0,
    right: 0,
  },
  newAnalysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#22c55e', 
    gap: 8,
  },
  newAnalysisButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#22c55e',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});