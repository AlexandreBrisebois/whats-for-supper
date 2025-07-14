import React from 'react';
import './App.css';
import VotingApp from './components/VotingApp';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>🍽️ What's for Supper?</h1>
        <p>Help your family decide what to have for supper!</p>
      </header>
      <main>
        <VotingApp />
      </main>
    </div>
  );
}

export default App;
