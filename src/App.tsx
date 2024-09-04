import { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import Home from './components/Home';
import CreateItem from './components/CreateItem';
import UpdateItem from './components/UpdateItem';
import Navigation from './components/Navigation';
import LoginPage from './components/LoginPage';


function App() {

  return (


    <Router>
      <div className="App">
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateItem />} />
          <Route path="/update/:id" element={<UpdateItem />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </div>
    </Router>

  );
}

export default App;
