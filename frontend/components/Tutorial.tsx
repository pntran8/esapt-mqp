import "../src/tutorial.css"
import "../src/App.css"
import {useAuth0} from "@auth0/auth0-react";
import { PulseLoader } from "react-spinners";
import Header from "./Header";
import Footer from "./Footer";
import HeaderPic from "../src/images/header.png"
import LogoButton from "../src/images/wpiLogoAlternateOnPage.png";
import SQLGenButton from "../src/images/SQLGenButton.png"
import CodeCompButton from "../src/images/CodeComparisonButton.png"
import AccountButton from "../src/images/AccountView.png"
import AccountTabLogged from "../src/images/AccountTabLogged.png"
import AccountTabUnlogged from "../src/images/AccountTabUnlogged.png"
import HomePage from "../src/images/HomePage.png"
import HomeSQLGen from "../src/images/HomeSQLGen.png"
import HomeCodeComp from "../src/images/HomeCodeComparison.png"
import HomeLogin from "../src/images/HomeLogIn.png"
import HomeViewHistory from "../src/images/HomeViewHistory.png"
//import SQLGenButton from "../src/images/"
//import SQLGenButton from "../src/images/"
//import SQLGenButton from "../src/images/"
//import SQLGenButton from "../src/images/"


const Tutorial = () => {
    return (
        <>
            <Header/>
            <div>
                <h2 className={"h2-tut"}>Hello! Thank you for looking at our project!<br/> Here are some explanations on how to use the various pages of our application.</h2>
                <div className={"box"} style={{height: "auto", paddingBottom: "5vh"}}>
                    <h1 className={"h1-tut"}>Home Page</h1>
                    <img src={HomePage} alt={"Picture of Home Page"}/>
                    <h3 className={"h3-tut"}>This page has buttons that will take you to any page of the application. The pages they take you to are as described above or below them.</h3>
                </div>
                <div className={"box"} style={{height: "auto", paddingBottom: "5vh"}}>
                    <h1 className={"h1-tut"}>Generating SQL from an ERD with explanation</h1>
                    <h3 className={"h3-tut"}>If you are on the home page, click the left button of the two buttons that take you to the main features of the app.</h3>
                    <h3 className={"h3-tut"}>(Note: if you uploaded an ERD to the other page and did not clear it, it will automatically load that data here)<br/>Now that you are on the page, click the  bar that says "upload image to see preview." It will open your files folder. Select and open the ERD you wish to generate code for. It will appear in the preview box below the button to the left as well as loading animations on the code and explanation boxes to the right of the preview box.</h3>
                    <h3 className={"h3-tut"}>Give the LLM some time to think, and once it is done, you will have both code and an explanation for why that code was generated the way it was!</h3>
                </div>
                <div className={"box"} style={{height: "auto", paddingBottom: "5vh"}}>
                    <h1 className={"h1-tut"}>Compare your SQL code to the LLM’s generated code</h1>
                    <h3 className={"h3-tut"}>From the home page, press the right button of the two that take you to the main functions of the app</h3>
                    <h3 className={"h3-tut"}> (Note: if you uploaded an ERD to the other page and did not clear it, it will automatically load that data here)<br/> Now that you are on the page, click the  bar that says "upload image to see preview." It will open your files folder. Select and open the ERD you wish to generate code for. The LLM will think and generate code from the ERD in the far left box below. </h3>

                    <h3 className={"h3-tut"}>Type or paste your code into the middle box.</h3>

                    <h3 className={"h3-tut"}>Press the compare button next to the button you pressed to upload the ERD.</h3>

                    <h3 className={"h3-tut"}>The results of the comparison will appear in the rightmost box</h3>
                </div>
            </div>
            <Footer style={"font-size: 2vh"}/>
        </>
    )
}

export default Tutorial;