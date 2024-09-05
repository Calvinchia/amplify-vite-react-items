import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import Home from './components/Home';
import CreateItem from './components/CreateItem';
import UpdateItem from './components/UpdateItem';
import Navigation from './components/Navigation';
import LoginPage from './components/LoginPage';


function App() {

  return (

    <Authenticator.Provider>
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
    </Authenticator.Provider>
  );
}

export default App;
