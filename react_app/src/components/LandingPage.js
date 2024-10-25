import React, { useState } from 'react';

function LandingPage() {
    const [username, setUsername] = useState('');

    const handleInputChange = (e) => {
        setUsername(e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log(username); // For now, just log the username. You can later use this to do other actions.
        // Redirect or perform other actions after submission
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label htmlFor="username">Username:</label>
                <input
                    type="text"
                    id="username"
                    name="username"
                    value={username}
                    onChange={handleInputChange}
                    required
                />
                <button type="submit">Get Started</button>
            </form>
        </div>
    );
}

export default LandingPage;
