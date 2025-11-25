import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface WebViewFallbackProps {
  style?: any;
  children?: React.ReactNode;
}

const WebViewFallback: React.FC<WebViewFallbackProps> = ({ style, children }) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>
        WebView no está disponible en esta plataforma
      </Text>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    minHeight: 400,
  },
  text: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
});

export default WebViewFallback; 