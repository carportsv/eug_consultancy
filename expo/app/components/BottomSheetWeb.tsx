import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

interface BottomSheetWebProps {
  children: React.ReactNode;
  snapPoints?: string[];
  index?: number;
  onChange?: (index: number) => void;
  enablePanDownToClose?: boolean;
  onClose?: () => void;
  style?: any;
}

const BottomSheetWeb: React.FC<BottomSheetWebProps> = ({
  children,
  snapPoints = ['25%', '50%', '90%'],
  index = 0,
  onChange,
  enablePanDownToClose = true,
  onClose,
  style
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(index);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    setCurrentIndex(index);
  }, [index]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const getHeightFromSnapPoint = (snapPoint: string) => {
    if (snapPoint.includes('%')) {
      const percentage = parseInt(snapPoint.replace('%', ''));
      return `${percentage}vh`;
    }
    return snapPoint;
  };

  const currentHeight = getHeightFromSnapPoint(snapPoints[currentIndex] || snapPoints[0]);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          onPress={enablePanDownToClose ? handleClose : undefined}
          activeOpacity={1}
        />
        <View 
          style={[
            styles.container, 
            { height: currentHeight },
            style
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar}>
            <View style={styles.handle} />
          </View>
          
          {/* Content */}
          <View style={styles.content}>
            {children}
          </View>
          
          {/* Close button */}
          {enablePanDownToClose && (
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'relative',
    minHeight: 200,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 1,
  },
});

export default BottomSheetWeb; 