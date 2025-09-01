import "../src/tutorial.css"
import "../src/App.css"
import {useAuth0} from "@auth0/auth0-react";
import { PulseLoader } from "react-spinners";
import Header from "./Header";
import Footer from "./Footer";

import HomePage from "../src/images/HomePage.png"
import GenChooseFile from "../src/images/GenChooseFile.png"
import GenERDPreview from "../src/images/GenERDPreview.png"
import HomeSQLGen from "../src/images/HomeSQLGen.png"
import GenGeneratedCode from "../src/images/GenGeneratedCode.png"
import HomeComp from "../src/images/HomeComp.png"
import CompChooseFile from "../src/images/CompChooseFile.png"
import CompWithGenCode from "../src/images/CompWithGenCode.png"
import CompPressComp from "../src/images/CompPressComp.png"
import CompCompleteComparison from "../src/images/CompCompleteComparison.png"


const Tutorial = () => {
    return (
        <>
            <Header/>
            <div>
                <h2 className={"h2-tut"} style={{textAlign: "center"}}>Hello! Thank you for looking at our project!<br/> Here are some explanations on how to use the various pages of our application.</h2>
                <div className={"box"} style={{height: "auto", paddingBottom: "5vh"}}>
                    <h1 className={"h1-tut"}>Home Page</h1>
                    <img src={HomePage} alt={"Picture of Home Page"}/>
                    <h3 className={"h3-tut"}>This page has buttons that will take you to any page of the application. The pages they take you to are as described above or below them.</h3>
                </div>
                <div className={"box"} style={{height: "auto", paddingBottom: "5vh"}}>
                    <h1 className={"h1-tut"}>Generating SQL from an ERD with explanation</h1>
                    <h3 className={"h3-tut"}>If you are on the home page, click the left button of the two buttons that take you to the main features of the app.</h3>
                    <img src={HomeSQLGen} alt={"Generate SQL Page Button"}/>
                    <h3 className={"h3-tut"}>(Note: if you uploaded an ERD to the other page and did not clear it, it will automatically load that data here)<br/>Now that you are on the page, click the  bar that says "Choose File No File Chosen." It will open your files folder. Select and open the ERD you wish to generate code for. It will appear in the preview box below the button to the left as well as loading animations on the code and explanation boxes to the right of the preview box.</h3>
                    <img src={GenChooseFile} alt={"Page with choose file circled"}/>
                    <img src={GenERDPreview} alt={"Box with ERD preview"}/>
                    <h3 className={"h3-tut"}>Give the LLM some time to think, and once it is done, you will have both code and an explanation for why that code was generated the way it was!</h3>
                    <img src={GenGeneratedCode} alt={"Picture of all three boxes filled"}/>
                </div>
                <div className={"box"} style={{height: "auto", paddingBottom: "5vh"}}>
                    <h1 className={"h1-tut"}>Compare your SQL code to the LLM’s generated code</h1>
                    <h3 className={"h3-tut"}>From the home page, press the right button of the two that take you to the main functions of the app</h3>
                    <img src={HomeComp} alt={"Code Comparison Page Button"}/>
                    <h3 className={"h3-tut"}> (Note: if you uploaded an ERD to the other page and did not clear it, it will automatically load that data here)<br/> Now that you are on the page, click the  bar that says "Choose File No File Chosen." It will open your files folder. Select and open the ERD you wish to generate code for.</h3>
                    <img src={CompChooseFile} alt={"Page with choose file circled"}/>
                    <h3 className={"h3-tut"}>The LLM will think and generate code from the ERD in the far left box below.</h3>
                    <img src={CompWithGenCode} alt={"Page with code generated in leftmost box"}/>
                    <h3 className={"h3-tut"}> Type or paste your code into the middle box, then press the compare button next to the button you pressed to upload the ERD.</h3>
                    <img src={CompPressComp} alt={"Page with compare button circles"}/>
                    <h3 className={"h3-tut"}>The results of the comparison will appear in the rightmost box</h3>
                    <img src={CompCompleteComparison} alt={"Full page with all three boxes having content"}/>
                </div>
            </div>
            <Footer/>
        </>
    )
}

export default Tutorial;