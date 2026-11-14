import "./App.css";
import { Navbars } from "./components/navbar/Navbars";
import Footers from "./components/footer/Footer";
import AiAssistant from "./components/assistant/AiAssistant";
import { Outlet } from "react-router-dom";

function App() {
  return (
    <>
      <Navbars />
      <Outlet />
      <Footers />
      <AiAssistant />
    </>
  );
}

export default App;
