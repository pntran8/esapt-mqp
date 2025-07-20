import Header from "../components/Header.tsx"
import Footer from "../components/Footer.tsx"
import './Home.css'
import '../src/App.css'
import {useNavigate} from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";



const Home = () => {
    const { isAuthenticated, user, loginWithRedirect, logout } = useAuth0();
    const navigate = useNavigate();
    const goToGem = () => {
        navigate("/imggem");
    }
    const goToEval = () => {
        navigate("/evaluation");
    }
    const handleAuthClick = async () => {
        if (isAuthenticated) {
            await logout({
                logoutParams: { returnTo: window.location.origin }
            });
            navigate('/');
        } else {
            await loginWithRedirect();
            console.log("profile icon authenticated");
            setOpen(false);
            navigate('/');
        }
    };
    return (
        <>
            <Header />
                <h1 style={{marginTop:'30px', fontSize:'50px'}}><b>ESAPT</b></h1>
                <h2 style={{fontSize:'20px'}}><b>ERD to SQL Artificial Intelligence Powered Transpiler</b></h2>
                <h3><br/>Text description of program goes here</h3>
                <div className="box">
                    <div style ={{float:"left", marginLeft:"10vw"}}>

                        <button
                            className={'circle-button'}
                            onClick={() => {
                                goToGem()
                            }}>

                        </button>
                        <h2 style={{fontSize:'20px'}}>ERD to Code</h2>
                        <h3>Generate SQL Code from conceptual ERD</h3>
                    </div>
                    <div style ={{float:"right", marginRight:"10vw"}}>
                        <button
                            className={'circle-button'}
                            onClick={() => {
                                goToEval()
                            }}>

                        </button>
                    <h2 style={{fontSize:'20px'}}>Grade your code</h2>
                        <h3>Let our AI tools compare your code to your goals!</h3>
                    </div>
                </div>
                <div className="box">
                    <h2 style={{fontSize:'20px', marginBottom:'30px'}}>Create an account to save <br/> your work</h2>
                    <button className={'box-button'}>Login</button>
                </div>
            <Footer />
        </>
    )
}
export default Home