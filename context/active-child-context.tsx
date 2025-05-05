"use client";

import React, { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction } from 'react';

// 1. Definir el tipo para el valor del contexto
interface ActiveChildContextType {
  activeChildId: string | null;
  setActiveChildId: Dispatch<SetStateAction<string | null>>;
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

  return (
    <ActiveChildContext.Provider value={{ activeChildId, setActiveChildId }}>
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