import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './app/app';
import './i18n';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from "@apollo/client";

import { setContext } from '@apollo/client/link/context';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const httpLink = createHttpLink({
  uri: process.env['NX_DOMAIN']+'/graphql',
});

const getCookie = (key:string) => {
  const b = document.cookie.match("(^|;)\\s*" + key + "\\s*=\\s*([^;]+)");
  const cookie = b ? b.pop() : "";
  return cookie;
}

const authLink = setContext((_, { headers }) => {
  const token = getCookie('access-token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  connectToDevTools: true,
});

root.render(
  <StrictMode>
    <ApolloProvider client={client}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ApolloProvider>
  </StrictMode>
);
