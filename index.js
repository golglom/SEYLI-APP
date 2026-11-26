import { registerRootComponent } from 'expo';

// If a module throws while the bundle is being evaluated, nothing would be
// rendered and the phone would sit on the launch screen with no explanation.
// Loading the app behind a try/catch turns that silence into a readable screen.
let Root = null;
let startupError = null;

try {
  Root = require('./App').default;
} catch (error) {
  startupError = error;
}

if (!Root) {
  const React = require('react');
  const { ScrollView, Text } = require('react-native');
  Root = function StartupFailure() {
    const message =
      startupError && startupError.stack ? startupError.stack : String(startupError);
    return React.createElement(
      ScrollView,
      {
        style: { backgroundColor: '#0F1830' },
        contentContainerStyle: { padding: 24, paddingTop: 64, flexGrow: 1 },
      },
      React.createElement(
        Text,
        { style: { color: '#ffffff', fontSize: 20, fontWeight: '700', marginBottom: 12 } },
        "SEYLI n'a pas pu démarrer"
      ),
      React.createElement(
        Text,
        { style: { color: '#ffb4c8', fontSize: 12 } },
        message
      )
    );
  };
}

registerRootComponent(Root);
