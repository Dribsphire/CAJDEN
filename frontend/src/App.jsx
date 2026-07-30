import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import Preloader from './components/Preloader.jsx';

import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Services from './pages/Services.jsx';
import NewsBlog from './pages/NewsBlog.jsx';
import PostDetail from './pages/PostDetail.jsx';
import Contact from './pages/Contact.jsx';
import NotFound from './pages/NotFound.jsx';

import AdminLogin from './pages/admin/AdminLogin.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import ManagePosts from './pages/admin/ManagePosts.jsx';
import ManageOfficers from './pages/admin/ManageOfficers.jsx';
import ManagePartners from './pages/admin/ManagePartners.jsx';
import ManageOffices from './pages/admin/ManageOffices.jsx';
import ManageServices from './pages/admin/ManageServices.jsx';
import ManageMessages from './pages/admin/ManageMessages.jsx';
import ManageSettings from './pages/admin/ManageSettings.jsx';

export default function App() {
  const [showPreloader, setShowPreloader] = useState(true);

  return (
    <>
      {showPreloader && <Preloader onFinish={() => setShowPreloader(false)} />}
      <Routes>
      {/* Public site */}
      <Route
        path="/"
        element={<><ScrollToTop /><Navbar /><Home /><Footer /></>}
      />
      <Route path="/about" element={<><ScrollToTop /><Navbar /><About /><Footer /></>} />
      <Route path="/services" element={<><ScrollToTop /><Navbar /><Services /><Footer /></>} />
      <Route path="/news-blog" element={<><ScrollToTop /><Navbar /><NewsBlog /><Footer /></>} />
      <Route path="/news-blog/:slug" element={<><ScrollToTop /><Navbar /><PostDetail /><Footer /></>} />
      <Route path="/contact" element={<><ScrollToTop /><Navbar /><Contact /><Footer /></>} />

      {/* Admin */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="posts" element={<ManagePosts />} />
        <Route path="officers" element={<ManageOfficers />} />
        <Route path="partners" element={<ManagePartners />} />
        <Route path="offices" element={<ManageOffices />} />
        <Route path="services" element={<ManageServices />} />
        <Route path="messages" element={<ManageMessages />} />
        <Route path="settings" element={<ManageSettings />} />
      </Route>

      <Route path="*" element={<><Navbar /><NotFound /><Footer /></>} />
    </Routes>
    </>
  );
}
