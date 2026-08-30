import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SendXMLToGem from "../components/SendXMLToGem.tsx"
import CodeExplanation from "../components/CodeExplanation"
import CodeEvaluation from "../components/CodeEvaluation"
import View from "../components/View.tsx";
import {Auth0Provider} from '@auth0/auth0-react';
import { useAuth0 } from '@auth0/auth0-react';
import {useEffect} from 'react';
import LogPage from "../components/LogPage.tsx";
import Home from "../routes/Home.tsx"
import Normalization from "../components/Normalization";
import Tutorial from "../components/Tutorial.tsx";
import ConvertXMLNotation from "../components/NotationConverter.tsx";

const App = () => {
    const domain = import.meta.env.VITE_AUTH0_DOMAIN;
    const clientID = import.meta.env.VITE_AUTH0_CLIENT_ID;
    const { isAuthenticated, isLoading, user } = useAuth0();

    useEffect(() => {
        if (isLoading) return;

        if (isAuthenticated) {
            console.log("am logged in -- app.tsx");
        } else {
            console.log("not logged in.");
        }
    }, [isLoading, isAuthenticated, user]);

    return(
        <Auth0Provider
            domain={domain}
            clientId={clientID}
            authorizationParams={{
                redirect_uri: window.location.origin + '/',
            }}
        >
            <Router>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/XMLgem" element={<SendXMLToGem />} />
                    <Route path="/viewHistory" element={<View />} />
                    <Route path="/viewHistory/:userID" element={<LogPage />} />
                    <Route
                        path="/imggem"
                        element={ <CodeExplanation/> }
                    />
                    <Route path="/normalization" element={<Normalization />} />
                  <Route path="/evaluation" element={<CodeEvaluation />} />
                    <Route path="/evaluation" element={<CodeEvaluation />} />
                    <Route path="/tutorial" element={<Tutorial />} />
                    <Route path="ConvertNotation" element={<ConvertXMLNotation/>}/>.
                </Routes>
            </Router>
        </Auth0Provider>
    );
}

export default App;