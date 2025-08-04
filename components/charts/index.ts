// Exportaciones centralizadas de componentes de gráficos
// Facilita imports y mantiene organización

export {
  BaseChart,
  ChartSkeleton,
  ChartError,
  ChartNoData,
  CHART_COLORS,
  CHART_DIMENSIONS,
  CHART_CONFIG,
  formatChartValue,
  useChartState,
} from './BaseChart'

// Re-exportar el BaseChart como default también
export { default } from './BaseChart'