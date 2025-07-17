import Header from "../components/Header.tsx"
import Footer from "../components/Footer.tsx"
import './Home.css'
import '../src/App.css'
import '../src/assets/upload.png'
import '../src/assets/download.png'

const Home = () => {
    return (
        <>
            <Header />
                <h1>ESAPT</h1>
                <h2>ERD to SQL Artificial Intelligence Powered Transpiler</h2>
                <h3>Text description of program goes here</h3>
                <div className="box">
                    <div style ={{float:"left"}}>
                        <img src="../src/assets/download.png" alt={"A maroon button with a gray border and an icon with a download symbol."}/>
                        <h2>ERD to Code</h2>
                        <h3>Generate SQL Code from conceptual ERD</h3>
                    </div>
                    <div style ={{float:"right"}}>
                        <img src={"../src/assets/upload.png"} alt={("A maroon button with a gray border and an icon with an upload symbol.")}/>
                        <h2>Grade your code</h2>
                        <h3>Let our AI tools compare your code to your goals!</h3>
                    </div>
                </div>
                <div className="box">
                    <h2>Create an account to save /n your work</h2>
                </div>
            <Footer />
        </>
    )
}
export default Home