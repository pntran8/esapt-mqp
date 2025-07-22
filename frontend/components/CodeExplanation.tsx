import Header from "./Header";
import Footer from "./Footer";
import "./gem.css";
import "../src/App.css"
import {useLocation} from "react-router-dom";

const CodeExplanation = () => {
    const { state } = useLocation();
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
                <div className={"inner-page-box"} style={{width:"35vw", height:"25vh", float:"left", marginLeft:'10vw'}}>
                    <h2 style={{fontSize:'20px'}}>Log in to save your work</h2>
                    <button className={'box-button'} style={{marginTop:'40px'}}>Login</button>
                </div>
                <div className={"inner-page-box"} style={{width:"35vw", height:"25vh", float:"right", marginRight:'10vw'}}>
                    <h2 style={{fontSize:"20px"}}>Download Output.txt</h2>
                    <button className={"box-button"} style={{marginTop:'40px'}}></button>
                </div>
            </div>

            <Footer/>
        </>
    );
};

export default CodeExplanation;
