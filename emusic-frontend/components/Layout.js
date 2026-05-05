import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, fullscreen = false }) {
  return (
    <div className="app-container">
      <Sidebar />
      <div className={"main-content" + (fullscreen ? " main-content--fullscreen" : "")}>
        <Header />
        {children}
      </div>
    </div>
  );
}