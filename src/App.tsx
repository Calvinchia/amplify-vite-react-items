import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import Home from './components/Home';
import CreateItem from './components/CreateItem';
import UpdateItem from './components/UpdateItem';
import Navigation from './components/Navigation';
import LoginPage from './components/LoginPage';
import ItemDetails from './components/ItemDetails';
import Messaging from './components/Messaging';
import { Amplify } from "aws-amplify";


Amplify.configure({
  "auth": {

    "user_pool_id": "ap-southeast-1_hOVDACD9D",
    "aws_region": "ap-southeast-1",
    "user_pool_client_id": "2iolprgremisdlg00sgvihiab4",
    "identity_pool_id": "ap-southeast-1:226fd2d7-5b6b-413d-8dba-8e238e0d5d19",

    "mfa_methods": [],
    "standard_required_attributes": [
      "email"
    ],
    "user_verification_types": [
      "email"
    ],
    "mfa_configuration": "NONE",
    "password_policy": {
      "min_length": 8,
      "require_lowercase": true,
      "require_numbers": true,
      "require_symbols": true,
      "require_uppercase": true
    },
    "unauthenticated_identities_enabled": true
  },
  "data": {
    "url": "https://y3dxkv6sivanbkml2zodyvvtmy.appsync-api.ap-southeast-1.amazonaws.com/graphql",
    "aws_region": "ap-southeast-1",
    "api_key": "da2-ejobusk26nf3nb7f4qfqi4443q",
    "default_authorization_type": "API_KEY",
    "authorization_types": [
      "AMAZON_COGNITO_USER_POOLS",
      "AWS_IAM"
    ],
    "model_introspection": {
      "version": 1,
      "models": {
        "Todo": {
          "name": "Todo",
          "fields": {
            "id": {
              "name": "id",
              "isArray": false,
              "type": "ID",
              "isRequired": true,
              "attributes": []
            },
            "content": {
              "name": "content",
              "isArray": false,
              "type": "String",
              "isRequired": false,
              "attributes": []
            },
            "createdAt": {
              "name": "createdAt",
              "isArray": false,
              "type": "AWSDateTime",
              "isRequired": false,
              "attributes": [],
              "isReadOnly": true
            },
            "updatedAt": {
              "name": "updatedAt",
              "isArray": false,
              "type": "AWSDateTime",
              "isRequired": false,
              "attributes": [],
              "isReadOnly": true
            }
          },
          "syncable": true,
          "pluralName": "Todos",
          "attributes": [
            {
              "type": "model",
              "properties": {}
            },
            {
              "type": "auth",
              "properties": {
                "rules": [
                  {
                    "allow": "public",
                    "provider": "apiKey",
                    "operations": [
                      "create",
                      "update",
                      "delete",
                      "read"
                    ]
                  }
                ]
              }
            }
          ],
          "primaryKeyInfo": {
            "isCustomPrimaryKey": false,
            "primaryKeyFieldName": "id",
            "sortKeyFieldNames": []
          }
        }
      },
      "enums": {},
      "nonModels": {}
    }
  },
  "storage": {
    "aws_region": "ap-southeast-1",
    "bucket_name": "irsimages",
    "buckets": [
      {
        "name": "irsimages",
        "bucket_name": "irsimages",
        "aws_region": "ap-southeast-1"
      }
    ]
  },
  "version": "1.1"
});

function App() {

  return (

    <Authenticator.Provider>
      <Router>
        <div className="App">
          <Navigation />
          <Routes>
            <Route path="/" element={<Home ownerType="others" />} />
            <Route path="/msg" element={<Messaging />} />
            <Route path="/mystuff" element={<Home ownerType="me" />} />
            <Route path="/details/:id" element={<ItemDetails />} />
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
