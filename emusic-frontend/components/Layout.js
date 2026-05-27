import Sidebar from './Sidebar';
import Header from './Header';
import { useRouter } from 'next/router';

export default function Layout({ children, fullscreen = false }) {
  const router = useRouter();

  return (
    <div className="app-container">
      <Sidebar />
      <div className={"main-content" + (fullscreen ? " main-content--fullscreen" : "")}>
        {!fullscreen && <Header />}
        {fullscreen ? (
          children
        ) : (
          <div key={router.asPath} className="page-content">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
