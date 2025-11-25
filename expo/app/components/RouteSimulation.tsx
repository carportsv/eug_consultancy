import { LocationCoords } from '@/services/openStreetMapService';
import { useEffect, useRef, useState } from 'react';

interface RouteSimulationProps {
  routeCoordinates: LocationCoords[];
  routeToDestinationCoordinates: LocationCoords[];
  isActive: boolean;
  onSimulationUpdate?: (currentPosition: LocationCoords, routeType: 'toUser' | 'toDestination') => void;
}

export default function RouteSimulation({
  routeCoordinates,
  routeToDestinationCoordinates,
  isActive,
  onSimulationUpdate
}: RouteSimulationProps) {
  const [currentPosition, setCurrentPosition] = useState<LocationCoords | null>(null);
  const [currentRouteType, setCurrentRouteType] = useState<'toUser' | 'toDestination'>('toUser');
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const stepRef = useRef(0);

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    // Iniciar simulación
    stepRef.current = 0;
    setCurrentRouteType('toUser');
    
    const startSimulation = () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }

      const interval = 2000; // 2 segundos por paso para movimiento más realista
      animationRef.current = setInterval(() => {
        stepRef.current++;
        
        // Determinar en qué ruta estamos usando una variable local
        let localRouteType = currentRouteType;
        let currentRoute: LocationCoords[] = [];
        let totalSteps = 0;
        
        if (localRouteType === 'toUser' && routeCoordinates.length > 1) {
          currentRoute = routeCoordinates;
          totalSteps = routeCoordinates.length;
          
          if (stepRef.current >= totalSteps) {
            // Cambiar a la ruta al destino
            setCurrentRouteType('toDestination');
            localRouteType = 'toDestination';
            stepRef.current = 0;
            currentRoute = routeToDestinationCoordinates;
            totalSteps = routeToDestinationCoordinates.length;
          }
        } else if (localRouteType === 'toDestination' && routeToDestinationCoordinates.length > 1) {
          currentRoute = routeToDestinationCoordinates;
          totalSteps = routeToDestinationCoordinates.length;
          
          if (stepRef.current >= totalSteps) {
            // Reiniciar simulación
            setCurrentRouteType('toUser');
            localRouteType = 'toUser';
            stepRef.current = 0;
            currentRoute = routeCoordinates;
            totalSteps = routeCoordinates.length;
          }
        }

        if (currentRoute.length > 0 && stepRef.current < totalSteps) {
          const newPosition = currentRoute[stepRef.current];
          setCurrentPosition(newPosition);
          
          if (onSimulationUpdate) {
            onSimulationUpdate(newPosition, localRouteType);
          }
        }
      }, interval);
    };

    startSimulation();

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isActive, routeCoordinates.length, routeToDestinationCoordinates.length, onSimulationUpdate]);

  // Este componente no renderiza nada visual, solo maneja la lógica de simulación
  return null;
} 