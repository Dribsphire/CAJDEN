import { useState } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
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
import Photos from './pages/Photos.jsx';
import AlbumDetail from './pages/AlbumDetail.jsx';
import ENews from './pages/ENews.jsx';
import Materials from './pages/Materials.jsx';
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
import ManageAlbums from './pages/admin/ManageAlbums.jsx';
import ManageENews from './pages/admin/ManageENews.jsx';
import ManageMaterials from './pages/admin/ManageMaterials.jsx';
import ManageMessages from './pages/admin/ManageMessages.jsx';
import ManageSettings from './pages/admin/ManageSettings.jsx';

function PublicLayout() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main id="main"><Outlet /></main>
      <Footer />
    </>
  );
}

export default function App() {
  const [showPreloader, setShowPreloader] = useState(true);

  return (
    <>
      {showPreloader && <Preloader onFinish={() => setShowPreloader(false)} />}
      <Routes>
        {/* Public site */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/news-blog" element={<NewsBlog />} />
          <Route path="/news-blog/:slug" element={<PostDetail />} />
          <Route path="/photos" element={<Photos />} />
          <Route path="/photos/:id" element={<AlbumDetail />} />
          <Route path="/e-news" element={<ENews />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="posts" element={<ManagePosts />} />
          <Route path="officers" element={<ManageOfficers />} />
          <Route path="partners" element={<ManagePartners />} />
          <Route path="offices" element={<ManageOffices />} />
          <Route path="services" element={<ManageServices />} />
          <Route path="albums" element={<ManageAlbums />} />
          <Route path="enews" element={<ManageENews />} />
          <Route path="materials" element={<ManageMaterials />} />
          <Route path="messages" element={<ManageMessages />} />
          <Route path="settings" element={<ManageSettings />} />
        </Route>
      </Routes>
    </>
  );
}
