import { useState } from "react";
import Login from "./components/Login";
import FamilyApp from "./components/FamilyApp";
import { getAuthUser } from "./api/userService";

function App() {
  const [authUser, setAuthUser] = useState(getAuthUser());

  if (!authUser) return <Login onLogin={setAuthUser} />;

  return (
    <div>
      <FamilyApp />
    </div>
  );
}

export default App;
