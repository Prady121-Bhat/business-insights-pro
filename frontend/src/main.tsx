import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { store } from './app/store';
import { queryClient } from './lib/queryClient';
import { lightTheme, darkTheme } from './styles/theme';
import { router } from './routes';

const Root = () => {
  const theme = store.getState().ui.theme;
  return (
    <ThemeProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};

const ThemedApp = () => {
  const [theme, setTheme] = React.useState(store.getState().ui.theme);
  React.useEffect(() => {
    return store.subscribe(() => {
      const next = store.getState().ui.theme;
      if (next !== theme) setTheme(next);
    });
  });
  return (
    <ThemeProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemedApp />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);
