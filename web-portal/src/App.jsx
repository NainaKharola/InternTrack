import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { AdminAuthProvider } from "./auth/AdminAuth";
import ProtectedRoute, { PublicAdminRoute } from "./components/ProtectedRoute";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Administration = lazy(() => import("./pages/Administration"));
const DivisionConfiguration = lazy(() => import("./pages/DivisionConfiguration"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Certificates = lazy(() => import("./pages/Certificates"));
const CollegeManagement = lazy(() => import("./pages/CollegeManagement"));
const AdminProfile = lazy(() => import("./pages/AdminProfile"));
const GyapanEditor = lazy(() => import("./pages/GyapanEditor"));
const GyapanPage = lazy(() => import("./pages/GyapanPage"));
const GyapanPreview = lazy(() => import("./pages/GyapanPreview"));
const Home = lazy(() => import("./pages/Home"));
const Landing = lazy(() => import("./pages/Landing"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OfferLetterEditor = lazy(() => import("./pages/OfferLetterEditor"));
const OfferLetterPreview = lazy(() => import("./pages/OfferLetterPreview"));
const Reports = lazy(() => import("./pages/Reports"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const StudentDetails = lazy(() => import("./pages/StudentDetails"));
const StudentFullProfile = lazy(() => import("./pages/StudentFullProfile"));
const StudentLogin = lazy(() => import("./pages/StudentLogin"));
const Success = lazy(() => import("./pages/Success"));

const protectedPage = (page) => <ProtectedRoute>{page}</ProtectedRoute>;

function StudentDetailsRoute() {
  const { id } = useParams();
  return <StudentDetails id={id} source="approved" />;
}

function OfferLetterPreviewRoute() {
  const { id } = useParams();
  return <OfferLetterPreview studentId={id} />;
}

function OfferLetterEditorRoute() {
  const { id } = useParams();
  return <OfferLetterEditor studentId={id} />;
}

function GyapanPreviewRoute({ bufferMode = false }) {
  const { gyapanId } = useParams();
  return <GyapanPreview gyapanId={gyapanId} bufferMode={bufferMode} />;
}

function GyapanEditorRoute({ bufferMode = false }) {
  const { gyapanId } = useParams();
  return <GyapanEditor gyapanId={gyapanId} bufferMode={bufferMode} />;
}

function RegistrationSuccessRoute() {
  const { state } = useLocation();
  return <Success registration={state?.registration} />;
}

function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif" }}>Loading page...</div>}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/paid-internship" element={<Landing isPaid={true} />} />
            <Route path="/student" element={<Home />} />
            <Route path="/paid-internship/register" element={<Home />} />
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/paid-internship/login" element={<StudentLogin />} />
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/success" element={<RegistrationSuccessRoute />} />

            <Route path="/admin" element={<Navigate replace to="/admin/login" />} />
            <Route path="/admin/login" element={<PublicAdminRoute><AdminLogin /></PublicAdminRoute>} />
            <Route path="/admin/dashboard" element={protectedPage(<AdminDashboard />)} />
            <Route path="/admin/reports" element={protectedPage(<Reports />)} />
            <Route path="/admin-dashboard" element={protectedPage(<AdminDashboard />)} />
            <Route path="/admin/student-management" element={protectedPage(<AdminDashboard />)} />
            <Route path="/admin/student-management/new" element={protectedPage(<AdminDashboard />)} />
            <Route path="/admin/student-management/:id" element={protectedPage(<AdminDashboard />)} />
            <Route path="/admin/approved-students" element={protectedPage(<AdminDashboard />)} />
            <Route path="/admin/quarterly-reports" element={protectedPage(<AdminDashboard />)} />
            <Route path="/admin/management" element={protectedPage(<CollegeManagement />)} />
            <Route path="/admin/colleges" element={protectedPage(<CollegeManagement />)} />
            <Route path="/admin/profile" element={protectedPage(<AdminProfile />)} />
            <Route path="/admin/administration" element={protectedPage(<AdminDashboard />)} />
            <Route path="/admin/system-configuration" element={protectedPage(<Administration />)} />
            <Route path="/admin/administration/division-configurations" element={protectedPage(<DivisionConfiguration />)} />
            <Route path="/admin/students" element={protectedPage(<AdminDashboard />)} />
            <Route path="/admin/students/:id" element={protectedPage(<StudentDetailsRoute />)} />
            <Route path="/admin/students/:id/full" element={protectedPage(<StudentFullProfile />)} />
            <Route path="/admin/students/:id/offer-letter" element={protectedPage(<OfferLetterPreviewRoute />)} />
            <Route path="/admin/students/:id/offer-letter/edit" element={protectedPage(<OfferLetterEditorRoute />)} />
            <Route path="/admin/certificates" element={protectedPage(<Certificates />)} />
            <Route path="/admin/certificate1" element={protectedPage(<Certificates bufferMode />)} />
            <Route path="/admin/gyapan" element={protectedPage(<GyapanPage />)} />
            <Route path="/admin/gyapan/:gyapanId" element={protectedPage(<GyapanPreviewRoute />)} />
            <Route path="/admin/gyapan/:gyapanId/edit" element={protectedPage(<GyapanEditorRoute />)} />
            <Route path="/admin/gyapan1" element={protectedPage(<GyapanPage bufferMode />)} />
            <Route path="/admin/gyapan1/:gyapanId" element={protectedPage(<GyapanPreviewRoute bufferMode />)} />
            <Route path="/admin/gyapan1/:gyapanId/edit" element={protectedPage(<GyapanEditorRoute bufferMode />)} />
            <Route path="/admin/*" element={protectedPage(<NotFound />)} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}

export default App;
