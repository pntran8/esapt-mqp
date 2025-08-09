import Header from "./Header";
import Footer from "./Footer";
import "./gem.css";
import "../src/App.css"
import { useNavigate} from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import download from "../src/assets/download.png"
import * as React from "react";

interface Props {
    code: string;
    explanation: string;
    imageUrl: string | null;
}

const CodeExplanation: React.FC<Props> = ({imageUrl, code, explanation}) => {
    const { isAuthenticated, user, loginWithRedirect, logout } = useAuth0();
    const navigate = useNavigate();
    /*const handleClear = () => {
        setResponse([]);
        setIsLoading(false);
        setFile(null);
        setResponseString("");
    };

    //
    /*<!--     <button onClick={handleClear} className="clear-btn">
                    Clear
                </button>1-->*/

    const handleAuthClick = async () => {
        if (isAuthenticated) {
            await logout({
                logoutParams: { returnTo: window.location.origin }
            });
            navigate('/');
        } else {
            await loginWithRedirect();
            console.log("homepage login button icon authenticated");
            navigate('/');
        }
    };
    const goToHistory = () => {
        navigate('/viewHistory');
    }

    return (
        <>
            <Header />
            <h1>SQL Explanation</h1>
            <div style={{height: '80vh', marginTop: '3vh', marginBottom: '1vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '2vh', paddingLeft: '5vw', paddingRight: '5vw'}}>
                <div style={{width: '45vw', display: 'flex', flexDirection: 'column'}}>
                    <h1>Your ERD</h1>
                    <div style={{height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}} className="border-2 border-[#BD0A0A]">
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt="ERD Preview"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain'
                                }}
                            />
                        ) : (
                            <p>No image available.</p>
                        )}
                    </div>
                </div>

                <div style={{width: '45vw', display: 'flex', flexDirection: 'column', gap: '2vh'}}>
                    <div style={{ height: '34vh', display: 'flex', flexDirection: 'column' }}>
                        <h1>Code Output</h1>
                        <div className={"inner-page-box"} style={{ flex: 1, overflow: 'scroll' }}>
                            <h3 style={{fontSize:'20px', justifySelf:'left'}}>{code}</h3>
                        </div>
                    </div>

                    <div style={{ height: '34vh', display: 'flex', flexDirection: 'column' }}>
                        <h1>AI Explanation</h1>
                        <div className={"inner-page-box"} style={{ flex: 1, overflow: 'scroll' }}>
                            <h3 style={{fontSize:'20px', justifySelf:'left'}}>{explanation}</h3>
                        </div>
                    </div>
                </div>
            </div>
            <div style={{height:'30vh', marginBottom:"10vh"}}>
                { isAuthenticated ?
                    <div className={"inner-page-box"} style={{width:"35vw", height:"25vh", float:"left", marginLeft:'10vw'}}>
                        <h2 style={{fontSize:'20px', marginBottom:'30px'}}>Welcome, {user?.sub?.slice(-8).toUpperCase()}! Click here to view <br/> your saved work</h2>
                        <button className={'box-button'} onClick={goToHistory}>View History</button>
                    </div>
                    :
                    <div className={"inner-page-box"} style={{width:"35vw", height:"25vh", float:"left", marginLeft:'10vw'}}>
                        <h2 style={{fontSize:'20px'}}>Log in to save your work</h2>
                        <button className={'box-button'} style={{marginTop:'40px'}} onClick={handleAuthClick}>Login</button>
                    </div>
                }
                <div className={"inner-page-box"} style={{width:"35vw", height:"25vh", float:"right", marginRight:'10vw'}}>
                    <div>
                        <h2 style={{fontSize:"20px"}}>Download Output.txt</h2>
                        <button className={"box-button"} style={{marginTop:'40px'}}>
                            <img src={download} alt="Download" style={{justifySelf:"center", width: '25%'}} />
                        </button>
                    </div>
                </div>
            </div>

            <Footer/>
        </>
    );
};

export default CodeExplanation;
