import React, { useState, useEffect } from "react";
import BannerImage from "../assets/cooking.jpg";
import "../styles/Home.css";
import { Link } from "react-router-dom";

// import modals
import LoginModal from "../components/Authentication/LoginModal.js";
import SignupModal from "../components/Authentication/SignupModal.js";

// auth state imports
import {auth} from "../firebase/firebaseConfig.js";

function Home() {
    // auth state tracking
    const [user, setUser] = useState(null);

    useEffect(() => { 
        const currentUser = auth.currentUser;
        setUser(currentUser);

        const intervalId = setInterval(() => { //checks every now and then if we're still logged in
            const user = auth.currentUser;
            setUser(user);
        }, 1000);

        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          if (user) {
            setUser(user);
          } else {
            setUser(null);
          }
        });
    
        // Cleanup the listener when the component unmounts
        return () => unsubscribe();
      }, []); // Empty dependency array means this effect runs once on component mount
    


    useEffect(() => {
        // change the title dynamically
        document.title = 'Home';
      }, []); // runs only once after the component mounts
    

    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);


    const openLoginModal = () => setIsLoginModalOpen(true);
    const openSignupModal = () => setIsSignupModalOpen(true);

    const closeLoginModal = () => setIsLoginModalOpen(false);
    const closeSignupModal = () => setIsSignupModalOpen(false);

    return (
        <div>
            {/* Hero Section */}
            <div className="home" style={{ backgroundImage: `url(${BannerImage})`, width: '100%' }}>
                <div className="headerContainer">
                    <h1>ChopChop</h1>
                    <p>Simplify your meal prep journey</p>
                    <div style={{ textAlign: "center" }}>
                    {!user && (<button className="logged-out btn green darken-2 z-depth-0" onClick={openLoginModal}>Login</button>)}
                    {!user && (<button className="logged-out btn green darken-2 z-depth-0" onClick={openSignupModal}>Sign Up</button>)}
                        {<LoginModal isOpen={isLoginModalOpen} closeModal={closeLoginModal} />}
                        {<SignupModal isOpen={isSignupModalOpen} closeModal={closeSignupModal} />}
                    </div>
                </div>
            </div>

            {/* About ChopChop Section */}
            <div id="about-section">
                <div className="container">
                    <div className="row text-center">
                        <h2 className="about-heading">About ChopChop</h2>
                        <p className="about-description">
                            ChopChop is your one-stop solution for meal planning, helping college students save time, money, and eat healthier. Our platform focuses on two key features that empower you to maintain a balanced lifestyle.
                        </p>
                    </div>
                    <div className="row features-row">
                        {(auth.currentUser) ? (
                            <Link to="/track" className="feature-link">
                                <div className="feature-box">
                                <span className="feature-icon">📊</span>
                                <h3 className="feature-title">ChopTrack</h3>
                                <p className="feature-description">
                                    ChopTrack is a feature that helps users stay organized by tracking grocery shopping through receipt uploads or manual input, monitoring expiration dates with an alert system, managing grocery lists for future shopping, and keeping track of costs to stay within budget.
                                </p>
                                </div>
                            </Link>
                            ) : (
                            <span className="feature-link disabled">
                                <div className="feature-box">
                                <span className="feature-icon">📊</span>
                                <h3 className="feature-title">ChopTrack</h3>
                                <p className="feature-description">
                                    ChopTrack is a feature that helps users stay organized by tracking grocery shopping through receipt uploads or manual input, monitoring expiration dates with an alert system, managing grocery lists for future shopping, and keeping track of costs to stay within budget.
                                </p>
                                </div>
                            </span>
                            )}  
                        <Link to="/search" className="feature-link">
                        <div className="feature-box">
                            <span className="feature-icon">🍳</span>
                            <h3 className="feature-title">ChopGuide</h3>
                            <p className="feature-description">
                                ChopGuide is a feature that helps users find recipes by ingredients or cuisine name, with additional options to filter results and set a calorie range. It’s designed to make meal planning more personalized and health-conscious.
                            </p>
                        </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Home;
