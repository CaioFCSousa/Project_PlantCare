import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Send, RotateCcw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AnalysisScreen() {
    const { imageData } = useLocalSearchParams<{ imageData: string }>();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    
    useEffect(() => {
        if (imageData) {
            analyzeImage();
        } else {
            setError('Nenhuma imagem fornecida para análise.');
        }
    }, []); 

    const analyzeImage = async () => {
        if (!imageData) {
            setError('Imagem não encontrada para análise.');
            return;
        }

        if (error && !isAnalyzing) {
            setError(null);
        }

        setIsAnalyzing(true);

        const systemPrompt = `Você é um bot especializado em análise de plantas, focado em fornecer diagnósticos e recomendações rápidas e práticas. 
        
Sua tarefa é:
        
1. PRIMEIRA VERIFICAÇÃO: Se a imagem NÃO contiver uma planta, folha ou vegetal visível e clara, responda APENAS usando um bloco de citação Markdown (>). NUNCA forneça a estrutura de análise completa nestes casos:
"""
> ## 🚨 ERRO DE IMAGEM
> - **Tipo de Problema:** Imagem não é uma planta.
> - **Motivo:** A imagem fornecida não parece ser de uma planta, folha ou vegetal.
> - **O que fazer:**
>    * Tire uma nova foto com boa iluminação.
>    * Certifique-se de que apenas a planta ou folha esteja em foco.
>    * Evite sombras, reflexos ou fundos muito poluídos.
"""
        
2. SE FOR UMA PLANTA: Forneça a análise seguindo EXATAMENTE esta estrutura em Markdown. Use negrito para dar destaque e listas de tópicos para clareza:
        
## ✅ ANÁLISE CONCLUÍDA
- **Nome da Planta (Estimativa):** [Nome da Planta ou "Não Identificado"]
- **Estado Geral:** [Saudável / Estresse Leve / Doente / Grave]
        
## 🚫 TIPO DE PROBLEMA
- **Principal Problema Identificado:** [Nome do problema mais provável, ex: Excesso de Rega, Deficiência de Nitrogênio, Ácaros]
- **Descrição Rápida:** [Uma frase curta explicando a causa.]
        
## 📋 CARACTERÍSTICAS
Liste apenas os 3 pontos mais relevantes observados na imagem:
- [Ponto 1: Ex: Folhas amarelando nas bordas.]
- [Ponto 2: Ex: Presença de teias finas na parte inferior das folhas.]
- [Ponto 3: Ex: Crescimento lento e hastes finas.]
        
## 💚 CUIDADOS IMEDIATOS (Ações Simples)
Liste de 3 a 5 ações simples e práticas (NÃO MAIS QUE 5):
- **Rega:** [Ex: Reduza para 1 vez por semana e verifique o solo antes.]
- **Luz:** [Ex: Mova para um local com sol indireto e brilhante.]
- **Ação:** [Ex: Remova as folhas mais danificadas (poda de limpeza).]
- **Tratamento:** [Ex: Aplique óleo de Neem nas folhas a cada 7 dias por um mês.]
- **Fertilização:** [Ex: Suspenda a fertilização por 30 dias.]
        
`;

        const userQuery = "Analise esta imagem seguindo a estrutura solicitada. Primeiro verifique se é uma planta. Se for, forneça análise completa com características, diagnóstico e cuidados.";
        
        
        const payload = {
            contents: [{
                parts: [
                    { text: userQuery },
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: imageData
                        }
                    }
                ]
            }],
            systemInstruction: { 
                parts: [{ text: systemPrompt }]
            },
            
        };
        
        const apiKey = "AIzaSyB4b8RX2tnTdpreGS77fCbi_zLkzMDboXg";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
               
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorBody = await response.json().catch(() => ({}));

                    if (response.status === 429) {
                        const delay = Math.pow(2, retryCount) * 1000;
                        await new Promise(res => setTimeout(res, delay));
                        retryCount++;
                        continue;
                    } 
                    
                    if (response.status === 400) {
                        const errorMessage = errorBody.error?.message || `Erro 400: Requisição inválida.`;
                        throw new Error(`API error: 400 - ${errorMessage}`);
                    }

                    throw new Error(`API error: ${response.status} - ${errorBody.error?.message || 'Erro desconhecido.'}`);
                }

                const result = await response.json();
                const analysisResult = result?.candidates?.[0]?.content?.parts?.[0]?.text;

                if (analysisResult) {
                    const timestamp = Date.now();
                    const analysis = {
                        id: timestamp.toString(),
                        imageData,
                        result: analysisResult,
                        timestamp: timestamp,
                        isFavorite: false,
                    };

                    const existingAnalyses = await AsyncStorage.getItem('plant_analyses');
                    const analyses = existingAnalyses ? JSON.parse(existingAnalyses) : [];
                    analyses.unshift(analysis);
                    await AsyncStorage.setItem('plant_analyses', JSON.stringify(analyses));

                    router.replace({
                        pathname: '/result',
                        params: {
                            imageData,
                            result: analysisResult,
                            timestamp: analysis.timestamp.toString(),
                        },
                    });
                    return;
                } else {
                    const finishReason = result?.candidates?.[0]?.finishReason;
                    if (finishReason === 'SAFETY') {
                        setError('A análise não pôde ser concluída devido a questões de segurança. Tente uma imagem diferente.');
                    } else {
                        setError('Resposta da API vazia ou inválida. Por favor, tente novamente.');
                    }
                    return; 
                }
            } catch (err) {
                console.error('Analysis error:', err);
                setError(`Erro ao analisar a imagem: ${err instanceof Error ? err.message : 'Verifique sua conexão e tente novamente.'}`);
                return; 
            } finally {
                setIsAnalyzing(false);
            }
        }
        
        setIsAnalyzing(false);
        setError('Falha ao analisar a imagem após várias tentativas. Por favor, tente novamente mais tarde.');
    };

    const retakePhoto = () => {
        router.back();
    };
    
    // Componente de carregamento/erro simplificado
    const AnalysisStatus = () => (
        <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>
                {isAnalyzing ? 'Processando...' : (error ? 'Erro Encontrado' : 'Análise Pendente')}
            </Text>
            <Text style={styles.instructionsText}>
                {isAnalyzing
                    ? 'Nossa IA está examinando a imagem e identificando possíveis problemas ou condições da planta. Aguarde um momento...'
                    : (error 
                        ? 'Ocorreu um erro. Verifique a mensagem acima ou tente novamente.'
                        : 'Toque em "Analisar" para começar o diagnóstico com a IA. Recomendamos que a foto esteja nítida.'
                    )
                }
            </Text>
            {isAnalyzing && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#22c55e" />
                    <Text style={styles.loadingText}>Aguardando resposta do servidor...</Text>
                </View>
            )}
        </View>
    );


    if (!imageData) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorFeedbackContainer}>
                    <Text style={styles.errorText}>Erro: Imagem não encontrada</Text>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>Voltar</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Análise da Planta</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.imageContainer}>
                    <Image source={{ uri: `data:image/jpeg;base64,${imageData}` }} style={styles.image} />
                </View>

                {error && (
                    <View style={styles.errorFeedbackContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <AnalysisStatus />
                
            </ScrollView>

            <View style={styles.bottomActions}>
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={retakePhoto}
                    disabled={isAnalyzing}
                >
                    <RotateCcw size={20} color="#6b7280" />
                    <Text style={styles.secondaryButtonText}>Nova Foto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.primaryButton, isAnalyzing && styles.primaryButtonDisabled]}
                    onPress={analyzeImage}
                    disabled={isAnalyzing}
                >
                    {isAnalyzing ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <>
                            <Send size={20} color="#ffffff" />
                            <Text style={styles.primaryButtonText}>Analisar</Text>
                        </>
                    )}
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
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    content: {
        padding: 24,
    },
    imageContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    image: {
        width: 300,
        height: 300,
        borderRadius: 20,
        backgroundColor: '#e5e7eb',
        borderColor: '#d1d5db',
        borderWidth: 1,
    },
    instructionsContainer: {
        backgroundColor: '#e0f2f1', 
        padding: 24,
        borderRadius: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    instructionsTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#065f46', 
        marginBottom: 8,
        textAlign: 'center',
    },
    instructionsText: {
        fontSize: 16,
        color: '#374151',
        lineHeight: 24,
        textAlign: 'center',
    },
    loadingContainer: {
        alignItems: 'center',
        padding: 16,
    },
    loadingText: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 12,
    },
    errorFeedbackContainer: {
        backgroundColor: '#fef2f2',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    errorText: {
        fontSize: 16,
        color: '#dc2626',
        textAlign: 'center',
        lineHeight: 24,
    },
    bottomActions: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        gap: 16,
    },
    secondaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
        gap: 8,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
    },
    primaryButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#22c55e',
        gap: 8,
    },
    primaryButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
});