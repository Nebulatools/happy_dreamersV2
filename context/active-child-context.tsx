"use client";

import React, { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction, useEffect } from 'react';

// 1. Definir el tipo para el valor del contexto
interface ActiveChildContextType {
  activeChildId: string | null;
  setActiveChildId: Dispatch<SetStateAction<string | null>>;
  activeUserId: string | null;
  setActiveUserId: Dispatch<SetStateAction<string | null>>;
  activeUserName: string | null;
  setActiveUserName: Dispatch<SetStateAction<string | null>>;
  isInitialized: boolean;
  clearSelection: () => void;
  // Helper para establecer toda la selección de una vez
  setActiveChild: (childId: string, userId: string, userName: string) => void;
}

// 2. Crear el Contexto con un valor por defecto (o undefined si prefieres manejar el caso nulo explícitamente)
// Usamos undefined aquí y comprobaremos en el hook si el contexto se usó dentro de un proveedor.
const ActiveChildContext = createContext<ActiveChildContextType | undefined>(undefined);

// 3. Crear el componente Proveedor
interface ActiveChildProviderProps {
  children: ReactNode;
}

export const ActiveChildProvider: React.FC<ActiveChildProviderProps> = ({ children }) => {
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [activeUserName, setActiveUserName] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Cargar la selección guardada al inicializar
  useEffect(() => {
    const savedChildId = localStorage.getItem('activeChildId');
    const savedUserId = localStorage.getItem('admin_selected_user_id');
    const savedUserName = localStorage.getItem('admin_selected_user_name');
    
    if (savedChildId && savedChildId !== 'null') {
      setActiveChildId(savedChildId);
    }
    if (savedUserId && savedUserId !== 'null') {
      setActiveUserId(savedUserId);
    }
    if (savedUserName && savedUserName !== 'null') {
      setActiveUserName(savedUserName);
    }
    setIsInitialized(true);
  }, []);

  // Guardar en localStorage cuando cambie la selección
  useEffect(() => {
    if (activeChildId) {
      localStorage.setItem('activeChildId', activeChildId);
    } else {
      localStorage.removeItem('activeChildId');
    }
  }, [activeChildId]);

  useEffect(() => {
    if (activeUserId) {
      localStorage.setItem('admin_selected_user_id', activeUserId);
    } else {
      localStorage.removeItem('admin_selected_user_id');
    }
  }, [activeUserId]);

  useEffect(() => {
    if (activeUserName) {
      localStorage.setItem('admin_selected_user_name', activeUserName);
    } else {
      localStorage.removeItem('admin_selected_user_name');
    }
  }, [activeUserName]);

  // Función para limpiar toda la selección
  const clearSelection = () => {
    setActiveChildId(null);
    setActiveUserId(null);
    setActiveUserName(null);
    localStorage.removeItem('activeChildId');
    localStorage.removeItem('admin_selected_user_id');
    localStorage.removeItem('admin_selected_user_name');
  };

  // Función helper para establecer toda la selección de una vez
  const setActiveChild = (childId: string, userId: string, userName: string) => {
    setActiveChildId(childId);
    setActiveUserId(userId);
    setActiveUserName(userName);
  };

  return (
    <ActiveChildContext.Provider value={{
      activeChildId,
      setActiveChildId,
      activeUserId,
      setActiveUserId,
      activeUserName,
      setActiveUserName,
      isInitialized,
      clearSelection,
      setActiveChild
    }}>
      {children}
    </ActiveChildContext.Provider>
  );
};

// 4. Crear un hook personalizado para usar el contexto
export const useActiveChild = () => {
  const context = useContext(ActiveChildContext);
  if (context === undefined) {
    throw new Error('useActiveChild must be used within an ActiveChildProvider');
  }
  return context;
}; 