import { Outlet } from "react-router-dom";
import Header from "../widgets/Header/Header";

export default function Layout() {
  return (
    <div>
      <Header />

      <main
        style={{
          margin: "0 auto",
          padding: "10px 20px 20px 20px"
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}