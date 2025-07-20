import "../src/App.css"
import Header from "./Header.tsx";
import Footer from "./Footer";


const UserData = () => {
    return (
        <>
            <Header />
            <h1>Welcome, username</h1>
            <div className="inner-page-box h80 w80">

            </div>
            <Footer />
        </>
    )
}
export default UserData;