import BottomSheet from '@gorhom/bottom-sheet';
import React from 'react';
import { Platform } from 'react-native';
import BottomSheetWeb from './BottomSheetWeb';

interface BottomSheetWrapperProps {
  children: React.ReactNode;
  snapPoints?: string[];
  index?: number;
  onChange?: (index: number) => void;
  enablePanDownToClose?: boolean;
  onClose?: () => void;
  style?: any;
}

const BottomSheetWrapper: React.FC<BottomSheetWrapperProps> = (props) => {
  // Detectar si estamos en web
  const isWeb = Platform.OS === 'web';

  if (isWeb) {
    return <BottomSheetWeb {...props} />;
  }

  return <BottomSheet {...props} />;
};

export default BottomSheetWrapper; 