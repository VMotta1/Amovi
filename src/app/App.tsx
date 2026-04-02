import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import ChartWrapper from './components/ChartWrapper';

export default function App() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <ChartWrapper>
      <RouterProvider router={router} />
    </ChartWrapper>
  );
}
