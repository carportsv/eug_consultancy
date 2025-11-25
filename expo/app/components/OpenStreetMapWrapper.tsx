import React from 'react';
import { Platform } from 'react-native';
import OpenStreetMap from './OpenStreetMap';
import OpenStreetMapWeb from './OpenStreetMapWeb';
import WebViewFallback from './WebViewFallback';

interface OpenStreetMapWrapperProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  markers?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title?: string;
    color?: string;
  }>;
  polylines?: Array<{
    id: string;
    coordinates: Array<{ latitude: number; longitude: number }>;
    color: string;
    width: number;
  }>;
  onMarkerPress?: (markerId: string) => void;
  onMapPress?: (latitude: number, longitude: number) => void;
  style?: any;
  showUserLocation?: boolean;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
}

const OpenStreetMapWrapper: React.FC<OpenStreetMapWrapperProps> = (props) => {
  // Detectar si estamos en web
  const isWeb = Platform.OS === 'web';

  if (isWeb) {
    try {
      return <OpenStreetMapWeb {...props} />;
    } catch (error) {
      console.warn('Error loading OpenStreetMapWeb, using fallback:', error);
      return <WebViewFallback {...props} />;
    }
  }

  try {
    return <OpenStreetMap {...props} />;
  } catch (error) {
    console.warn('Error loading OpenStreetMap, using fallback:', error);
    return <WebViewFallback {...props} />;
  }
};

export default OpenStreetMapWrapper; 