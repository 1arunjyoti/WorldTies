import { Suspense, lazy } from 'react';

const Home = lazy(() => import('./pages/Home'));

function App() {
  return (
    <Suspense fallback={<div className="w-full h-screen flex items-center justify-center bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Loading...</div>}>
      <Home />
    </Suspense>
  );
}

export default App;