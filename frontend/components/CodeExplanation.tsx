import Header from "./Header";
import Footer from "./Footer";
import "./gem.css";
import "../src/App.css"
import {useLocation, useNavigate} from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";



const CodeExplanation = () => {
    const { isAuthenticated, user, loginWithRedirect, logout } = useAuth0();
    const { state } = useLocation();
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
            <div className={"inner-page-box"} style={{width:'80vw', height:'35vh'}}>
                <h2 style={{fontSize:'20px'}}>Your ERD is displayed here</h2>
            </div>
            <div style={{height:'80vh', marginTop:'30px', paddingLeft:'10vw', paddingRight:'10vw'}}>
                <div style={{float:'left'}}>
                    <h1>Code Output</h1>
                    <div className={"inner-page-box"} style={{width:'35vw', height:'80vh', overflow:'scroll', float:'left'}}>
                        <h2 style={{fontSize:'20px'}}>{state.code}</h2>
                    </div>
                </div>
                <div style={{float:'right'}}>
                    <h1>AI Explanation</h1>
                    <div className={"inner-page-box"} style={{width:"35vw", height:"80vh", overflow:"scroll", float:'right'}}>
                        <h2 style={{fontSize:'20px'}}>LLM outputs step by step explanation here</h2>
                    </div>
                </div>
            </div>
            <div style={{height:'25vh', marginBottom:"10vh"}}>
                { isAuthenticated ?
                    <div className={"inner-page-box"} style={{width:"35vw", height:"25vh", float:"left", marginLeft:'10vw'}}>
                        <h2 style={{fontSize:'20px'}}>Log in to save your work</h2>
                        <button className={'box-button'} style={{marginTop:'40px'}} onClick={handleAuthClick}>Login</button>
                    </div> :
                    <div>
                        <h2 style={{fontSize:'20px', marginBottom:'30px'}}>Welcome, {user?.sub?.slice(-8).toUpperCase()}! Click here to view <br/> your saved work</h2>
                        <button className={'box-button'} onClick={goToHistory}>View History</button>
                    </div>
                }
                <div className={"inner-page-box"} style={{width:"35vw", height:"25vh", float:"right", marginRight:'10vw'}}>
                    <div>
                        <h2 style={{fontSize:"20px"}}>Download Output.txt</h2>
                        <button className={"box-button"} style={{marginTop:'40px'}}></button>
                    </div>
                </div>
            </div>

            <Footer/>
        </>
    );
};

export default CodeExplanation;
