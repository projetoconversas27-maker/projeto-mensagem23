import React from 'react';
import ChatInterface from './components/ChatInterface';

const App: React.FC = () => {
  return (
    <div className="h-screen w-full flex flex-col md:max-w-md md:mx-auto md:border-x md:border-gray-700 shadow-2xl">
      <ChatInterface />
    </div>
  );
};

export default App;