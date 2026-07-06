import { registerRootComponent } from 'expo';
// Must be imported at entry: defines the background-location task so it exists
// when the OS launches the app headless (no React tree) to deliver fixes.
import './src/ride/backgroundLocation';
import App from './App';

registerRootComponent(App);
