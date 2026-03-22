import React, { memo, FC, lazy, Suspense, Component, ErrorInfo } from "react";
import Loading from "../components/LoadingCp";

// ============================================================================
// Error Boundary for React 16
// ============================================================================
interface ErrorBoundaryProps {
  fallbackRender: (props: { error: Error }) => React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Component error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallbackRender({ error: this.state.error });
    }
    return this.props.children;
  }
}

// ============================================================================
// Type Definitions - More Strict & Predictive
// ============================================================================
export type ComponentsType = "media" | "base" | "visible" | "shop";

export interface DynamicComponentProps {
  isTpl: boolean;
  config: Record<string, unknown>;
  type: string;
  category: ComponentsType;
}

// ============================================================================
// Component Registry Pattern - Cache Loaded Components
// ============================================================================
type LazyComponent = ReturnType<typeof lazy>;
const componentCache = new Map<string, LazyComponent>();

/**
 * Get or create lazy-loaded component with caching
 * Prevents redundant dynamic component creation
 */
const getLazyComponent = (type: string, category: ComponentsType) => {
  const key = `${category}/${type}`;

  if (!componentCache.has(key)) {
    const lazyComponent = lazy(() =>
      import(`@/materials/${category}/${type}`).catch(error => {
        console.error(`Failed to load component: ${key}`, error);
        // Return fallback component
        return import(`@/materials/base/Text`);
      })
    );
    componentCache.set(key, lazyComponent);
  }

  return componentCache.get(key)!;
};

// ============================================================================
// Preload Function - Proactive Component Loading
// ============================================================================
/**
 * Preload components before they're needed (e.g., on editor mount)
 */
export const preloadComponents = async (
  components: Array<{ type: string; category: ComponentsType }>
) => {
  const promises = components.map(({ type, category }) =>
    import(`@/materials/${category}/${type}`)
  );
  await Promise.all(promises);
};

// ============================================================================
// Optimized DynamicEngine
// ============================================================================
const DynamicEngine: FC<DynamicComponentProps> = memo(
  ({ type, config, category, isTpl }) => {
    // Get cached lazy component
    const LazyComponent = getLazyComponent(type, category);

    return (
      <Suspense
        fallback={
          <div style={{ paddingTop: 10, textAlign: "center" }}>
            <Loading />
          </div>
        }
      >
        <ErrorBoundary
          fallbackRender={({ error }) => (
            <ComponentError type={type} error={error} />
          )}
        >
          <LazyComponent {...config} isTpl={isTpl} />
        </ErrorBoundary>
      </Suspense>
    );
  }
);

// ============================================================================
// Error Display Component
// ============================================================================
interface ComponentErrorProps {
  type: string;
  error?: Error;
}

const ComponentError = ({ type, error }: ComponentErrorProps) => (
  <div
    style={{
      padding: 20,
      textAlign: "center",
      color: "#ff4d4f",
      border: "1px dashed #ff4d4f"
    }}
  >
    <div>Failed to load component: {type}</div>
    {error && <div style={{ fontSize: 12, marginTop: 8 }}>{error.message}</div>}
  </div>
);

export default DynamicEngine;
