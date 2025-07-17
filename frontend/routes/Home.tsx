import Header from "../components/Header.tsx"
import Footer from "../components/Footer.tsx"
import './Home.css'
import '../src/App.css'
import upload from '../src/assets/upload.png'
import download from'../src/assets/download.png'
import {useNavigate} from "react-router-dom";



const Home = () => {

    const navigate = useNavigate();
    const goToGem = () => {
        navigate("/imggem");
    }

    return (
        <>
            <Header />
                <h1 style={{marginTop:'30px', fontSize:'50px'}}><b>ESAPT</b></h1>
                <h2 style={{fontSize:'20px'}}><b>ERD to SQL Artificial Intelligence Powered Transpiler</b></h2>
                <h3><br/>Text description of program goes here</h3>
                <div className="box">
                    <div style ={{float:"left", marginLeft:"10vw"}}>
                        <img
                            src={download}
                            alt={"A maroon button with a gray border and an icon with a download symbol."}
                            style={{height:'80px', justifySelf:'center'}}
                            onClick={() => {
                                goToGem()
                            }}/>
                        <h2 style={{fontSize:'20px'}}>ERD to Code</h2>
                        <h3>Generate SQL Code from conceptual ERD</h3>
                    </div>
                    <div style ={{float:"right", marginRight:"10vw"}}>
                        <img src={upload} alt={("A maroon button with a gray border and an icon with an upload symbol.")} style={{height:'80px', justifySelf:'center'}}/>
                        <h2 style={{fontSize:'20px'}}>Grade your code</h2>
                        <h3>Let our AI tools compare your code to your goals!</h3>
                    </div>
                </div>
                <div className="box">
                    <h2 style={{fontSize:'20px', marginBottom:'30px'}}>Create an account to save <br/> your work</h2>
                    <button style={{width:'200px', height:'70px', backgroundColor:'red', borderRadius:'5px', color:'white'}}>Login</button>
                </div>
            <Footer />
        </>
    )
}
export default Home