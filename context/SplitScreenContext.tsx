"use client";

import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useRef,
} from "react";

// Fuente del evento seleccionado (para mirroring bidireccional)
export type SelectionSource = "calendar" | "narrative";

// Interface del contexto
interface SplitScreenContextType {
  // ID del evento actualmente seleccionado (para scroll-into-view)
  selectedEventId: string | null;
  // ID del evento con highlight visual (fade gradual)
  highlightedEventId: string | null;
  // Fuente de la seleccion (para saber hacia donde hacer scroll)
  selectionSource: SelectionSource | null;
  // Selecciona un evento y aplica highlight con auto-clear
  selectEvent: (eventId: string, source: SelectionSource) => void;
  // Limpia la seleccion manualmente
  clearSelection: () => void;
  // Indica si el highlight esta activo (para animaciones)
  isHighlightActive: boolean;
}

// Duracion del highlight antes de auto-clear (segun spec: 5-7 segundos)
const HIGHLIGHT_DURATION_MS = 6000;

// Crear contexto con valor undefined (validacion en hook)
const SplitScreenContext = createContext<SplitScreenContextType | undefined>(
  undefined
);

// Props del provider
interface SplitScreenProviderProps {
  children: ReactNode;
}

// Componente Provider
export const SplitScreenProvider: React.FC<SplitScreenProviderProps> = ({
  children,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(
    null
  );
  const [selectionSource, setSelectionSource] =
    useState<SelectionSource | null>(null);
  const [isHighlightActive, setIsHighlightActive] = useState(false);

  // Ref para el timeout de auto-clear (permite cancelar clicks rapidos)
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Selecciona un evento con highlight que se desvanece automaticamente
  const selectEvent = useCallback(
    (eventId: string, source: SelectionSource) => {
      // Cancelar timeout anterior si existe (click rapido)
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }

      // Establecer nueva seleccion
      setSelectedEventId(eventId);
      setHighlightedEventId(eventId);
      setSelectionSource(source);
      setIsHighlightActive(true);

      // Programar auto-clear del highlight despues de 6 segundos
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedEventId(null);
        setIsHighlightActive(false);
        highlightTimeoutRef.current = null;
      }, HIGHLIGHT_DURATION_MS);
    },
    []
  );

  // Limpia la seleccion manualmente
  const clearSelection = useCallback(() => {
    // Cancelar timeout si existe
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }

    setSelectedEventId(null);
    setHighlightedEventId(null);
    setSelectionSource(null);
    setIsHighlightActive(false);
  }, []);

  return (
    <SplitScreenContext.Provider
      value={{
        selectedEventId,
        highlightedEventId,
        selectionSource,
        selectEvent,
        clearSelection,
        isHighlightActive,
      }}
    >
      {children}
    </SplitScreenContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useSplitScreen = () => {
  const context = useContext(SplitScreenContext);
  if (context === undefined) {
    throw new Error(
      "useSplitScreen must be used within a SplitScreenProvider"
    );
  }
  return context;
};
