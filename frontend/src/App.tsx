import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import SendToGem from "../components/SendToGem.tsx"
import SendXMLToGem from "../components/SendXMLToGem.tsx"
import SendImgToGem from "../components/SendImgToGem.tsx"
import CodeExplanation from "../components/CodeExplanation"
import CodeEvaluation from "../components/CodeEvaluation"
import View from "../components/View.tsx";
import {Auth0Provider} from '@auth0/auth0-react';
import { useAuth0 } from '@auth0/auth0-react';
import {useEffect} from 'react';
import LogPage from "../components/LogPage.tsx";
import SessionImgToGem from "../components/SessionImgToGem.tsx";
import Home from "../routes/Home.tsx"

const App = () => {
    const domain = import.meta.env.VITE_AUTH0_DOMAIN;
    const clientID = import.meta.env.VITE_AUTH0_CLIENT_ID;
    const { isAuthenticated, isLoading, user } = useAuth0();
    const [code, setCode] = useState<string>("");
    const [explanation, setExplanation] = useState<string>("");
    const [imageUrl, setImageUrl] = useState<string | null>(null);

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
                    <Route path="/gem" element={<SendToGem />} />
                    <Route path="/XMLgem" element={<SendXMLToGem />} />
                    <Route
                        path="/imggem"
                        element={
                            <SendImgToGem
                                code={code}
                                setCode={setCode}
                                explanation={explanation}
                                setExplanation={setExplanation}
                                imageUrl={imageUrl}
                                setImageUrl={setImageUrl}
                            />
                        }
                    />
                    <Route path="/imggem" element={<SendImgToGem
                                                        code={code}
                                                        setCode={setCode}
                                                        explanation={explanation}
                                                        setExplanation={setExplanation}
                                                        imageUrl={imageUrl}
                                                        setImageUrl={setImageUrl}
                                                    />} />
                    <Route path="/imggem/session/:sessionID" element={<SessionImgToGem />} />
                    <Route path="/viewHistory" element={<View />} />
                    <Route path="/viewHistory/:userID" element={<LogPage />} />
                    <Route
                        path="/explanation"
                        element={
                            <CodeExplanation
                                code={code}
                                explanation={explanation}
                                imageUrl={imageUrl}
                            />
                        }
                    />
                  <Route path="/evaluation" element={<CodeEvaluation />} />
                </Routes>
            </Router>
        </Auth0Provider>
    );
}

export default App;