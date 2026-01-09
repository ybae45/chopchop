//import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import RecipeSearch from './pages/RecipeSearch';
import Navbar from './components/NavBar/Navbar';
import RecipeSearchTest from './pages/RecipeSearchTest';
import Account from './pages/Account';
import Track from './pages/choptrack';
function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route exact path="/" element={<Home />} />
          <Route path="/search" element={<RecipeSearchTest />} />
          <Route path="/account" element={<Account />} />
          <Route path="/track" element={<Track />} />
        </Routes>
      </div>
    </Router>
  );
} 

export default App;