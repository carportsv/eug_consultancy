import React, { useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, View } from 'react-native';

const { height } = Dimensions.get('window');

interface BottomSheetProps {
  children: React.ReactNode;
  minHeight?: number;
  maxHeight?: number;
  initialPosition?: 'collapsed' | 'expanded' | 'hidden';
  onPositionChange?: (position: 'collapsed' | 'expanded' | 'hidden') => void;
  style?: any;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  children,
  minHeight = height * 0.25,
  maxHeight = height * 0.5,
  initialPosition = 'collapsed',
  onPositionChange,
  style
}) => {
  const SHEET_SNAP_POINTS = {
    HIDDEN: height,
    COLLAPSED: 0,
    EXPANDED: -(maxHeight - minHeight)
  };

  const [isSheetExpanded, setIsSheetExpanded] = useState(initialPosition === 'expanded');
  const [sheetVisible, setSheetVisible] = useState(initialPosition !== 'hidden');
  const [currentPosition, setCurrentPosition] = useState(
    initialPosition === 'hidden' ? SHEET_SNAP_POINTS.HIDDEN :
    initialPosition === 'expanded' ? SHEET_SNAP_POINTS.EXPANDED :
    SHEET_SNAP_POINTS.COLLAPSED
  );
  const sheetPosition = useRef(new Animated.Value(
    initialPosition === 'hidden' ? SHEET_SNAP_POINTS.HIDDEN :
    initialPosition === 'expanded' ? SHEET_SNAP_POINTS.EXPANDED :
    SHEET_SNAP_POINTS.COLLAPSED
  )).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        // Permitir movimiento hacia arriba y hacia abajo
        const newPosition = Math.max(
          SHEET_SNAP_POINTS.EXPANDED,
          Math.min(SHEET_SNAP_POINTS.HIDDEN, gestureState.dy)
        );
        setCurrentPosition(newPosition);
        sheetPosition.setValue(newPosition);
      },
      onPanResponderRelease: (_, gestureState) => {
        // Comportamiento como en Firebase: arrastrar hacia abajo oculta, hacia arriba muestra
        if (gestureState.dy > 50) {
          // Arrastre hacia abajo - ocultar completamente
          toggleSheet(false);
        } else {
          // Arrastre hacia arriba o poco movimiento - mostrar colapsado
          toggleSheet(true, false);
        }
      },
    })
  ).current;

  const toggleSheet = (show: boolean, expand: boolean = false) => {
    const toValue = show 
      ? (expand ? SHEET_SNAP_POINTS.EXPANDED : SHEET_SNAP_POINTS.COLLAPSED) 
      : SHEET_SNAP_POINTS.HIDDEN;

    Animated.spring(sheetPosition, {
      toValue,
      useNativeDriver: true,
      tension: 65,
      friction: 12
    }).start(() => {
      setSheetVisible(show);
      setIsSheetExpanded(expand);
      setCurrentPosition(toValue);
      
      const newPosition = show 
        ? (expand ? 'expanded' : 'collapsed')
        : 'hidden';
      onPositionChange?.(newPosition);
    });
  };

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          transform: [{ translateY: sheetPosition }],
          zIndex: isSheetExpanded ? 2 : 1,
          minHeight,
          maxHeight,
        },
        style
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.dragHandle}>
        <View style={styles.handleIndicator} />
      </View>
      <View style={styles.sheetContent}>
        {children}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dragHandle: {
    width: '100%',
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DEE1E6',
    marginTop: 8,
  },
  sheetContent: {
    flex: 1,
    padding: 16,
  },
});

export default BottomSheet; 