// FILE: src/App.jsx
// ============================================================================
// Main App Component - Initializes Redux Provider
// Routes and auth hydration are in AppInner.jsx (runs inside Provider)
// ============================================================================

import { Provider } from 'react-redux';
import { store } from './store';
import AppInner from './AppInner';

function App() {
  return (
    <Provider store={store}>
      <AppInner />
    </Provider>
  );
}

export default App;