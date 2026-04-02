import { ReactNode, useEffect } from 'react';

interface ChartWrapperProps {
  children: ReactNode;
}

export default function ChartWrapper({ children }: ChartWrapperProps) {
  useEffect(() => {
    // Suppress recharts duplicate key warnings
    const originalError = console.error;
    console.error = (...args) => {
      if (
        typeof args[0] === 'string' &&
        args[0].includes('Encountered two children with the same key')
      ) {
        return;
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return <>{children}</>;
}
