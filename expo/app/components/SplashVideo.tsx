import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashVideoProps {
  onVideoEnd: () => void;
}

export default function SplashVideo({ onVideoEnd }: SplashVideoProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('[SplashVideo] Iniciando animación de splash...');
    
    // Animación de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Animación de rotación sutil
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Simular duración del video (5 segundos como el original)
    const timer = setTimeout(() => {
      console.log('[SplashVideo] Animación completada');
      onVideoEnd();
    }, 5000); // 5 segundos como el video original

    return () => clearTimeout(timer);
  }, [onVideoEnd]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { rotate: spin }
            ]
          }
        ]}
      >
        <Image 
          source={require('../../assets/images/cuzcatlansv.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
      
      {/* Efecto de partículas o puntos decorativos */}
      <View style={styles.particles}>
        {[...Array(6)].map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: `${20 + index * 15}%`,
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { rotate: spin }
                ]
              }
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  logo: {
    width: width * 0.6,
    height: height * 0.3,
  },
  particles: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    top: '50%',
  },
}); 