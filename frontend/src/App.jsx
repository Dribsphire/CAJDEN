import { lazy, Suspense, useState } from 'react';
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
import ENewsIssue from './pages/ENewsIssue.jsx';
import ENewsReader from './pages/ENewsReader.jsx';
import Materials from './pages/Materials.jsx';
import NotFound from './pages/NotFound.jsx';

import ProtectedRoute from './components/ProtectedRoute.jsx';

// Admin screens (and the post editor they pull in) are split into a separate
// bundle so public visitors never download them.
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin.jsx'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const ManagePosts = lazy(() => import('./pages/admin/ManagePosts.jsx'));
const PostEditor = lazy(() => import('./pages/admin/PostEditor.jsx'));
const ManageOfficers = lazy(() => import('./pages/admin/ManageOfficers.jsx'));
const ManagePartners = lazy(() => import('./pages/admin/ManagePartners.jsx'));
const ManageOffices = lazy(() => import('./pages/admin/ManageOffices.jsx'));
const ManageServices = lazy(() => import('./pages/admin/ManageServices.jsx'));
const ServiceEditor = lazy(() => import('./pages/admin/ServiceEditor.jsx'));
const ManageAlbums = lazy(() => import('./pages/admin/ManageAlbums.jsx'));
const AlbumEditor = lazy(() => import('./pages/admin/AlbumEditor.jsx'));
const ManageENews = lazy(() => import('./pages/admin/ManageENews.jsx'));
const ENewsEditor = lazy(() => import('./pages/admin/ENewsEditor.jsx'));
const ManageMaterials = lazy(() => import('./pages/admin/ManageMaterials.jsx'));
const ManageMessages = lazy(() => import('./pages/admin/ManageMessages.jsx'));
const ManageSettings = lazy(() => import('./pages/admin/ManageSettings.jsx'));

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
      <Suspense fallback={<div className="admin-loading">Loading…</div>}>
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
          <Route path="/e-news/:number" element={<ENewsIssue />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Full-screen newsletter reader, outside the site layout */}
        <Route path="/e-news/:number/read" element={<ENewsReader />} />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="posts" element={<ManagePosts />} />
          <Route path="posts/new" element={<PostEditor />} />
          <Route path="posts/:id" element={<PostEditor />} />
          <Route path="officers" element={<ManageOfficers />} />
          <Route path="partners" element={<ManagePartners />} />
          <Route path="offices" element={<ManageOffices />} />
          <Route path="services" element={<ManageServices />} />
          <Route path="services/new" element={<ServiceEditor />} />
          <Route path="services/:id" element={<ServiceEditor />} />
          <Route path="albums" element={<ManageAlbums />} />
          <Route path="albums/new" element={<AlbumEditor />} />
          <Route path="albums/:id" element={<AlbumEditor />} />
          <Route path="enews" element={<ManageENews />} />
          <Route path="enews/new" element={<ENewsEditor />} />
          <Route path="enews/:id" element={<ENewsEditor />} />
          <Route path="materials" element={<ManageMaterials />} />
          <Route path="messages" element={<ManageMessages />} />
          <Route path="settings" element={<ManageSettings />} />
        </Route>
      </Routes>
      </Suspense>
    </>
  );
}
