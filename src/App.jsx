import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
// Add page imports here
import Incidents from '@/pages/Incidents';
import IncidentDetail from '@/pages/IncidentDetail';
import ResponseHub from '@/pages/ResponseHub';
import FieldGuide from '@/pages/FieldGuide';
import Lifeline from '@/pages/Lifeline';
import HouseholdPlan from '@/pages/HouseholdPlan';
import SurvivalLibrary from '@/pages/SurvivalLibrary';
import GuideArticle from '@/pages/GuideArticle';
import PrintPacket from '@/pages/PrintPacket';
import Resources from '@/pages/Resources';
import Capabilities from '@/pages/Capabilities';
import Network from '@/pages/Network';
import OfflineMap from '@/pages/OfflineMap';
import Toolkit from '@/pages/Toolkit';

const { Pages, Layout } = pagesConfig;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName="Lifeline">
          <Lifeline />
        </LayoutWrapper>
      } />
      <Route path="/HouseholdPlan" element={<LayoutWrapper currentPageName="HouseholdPlan"><HouseholdPlan /></LayoutWrapper>} />
      <Route path="/Guidance" element={<LayoutWrapper currentPageName="SurvivalLibrary"><SurvivalLibrary /></LayoutWrapper>} />
      <Route path="/Guidance/:slug" element={<LayoutWrapper currentPageName="GuideArticle"><GuideArticle /></LayoutWrapper>} />
      <Route path="/PrintPacket" element={<LayoutWrapper currentPageName="PrintPacket"><PrintPacket /></LayoutWrapper>} />
      <Route path="/Resources" element={<LayoutWrapper currentPageName="Resources"><Resources /></LayoutWrapper>} />
      <Route path="/Capabilities" element={<LayoutWrapper currentPageName="Capabilities"><Capabilities /></LayoutWrapper>} />
      <Route path="/Network" element={<LayoutWrapper currentPageName="Network"><Network /></LayoutWrapper>} />
      <Route path="/Map" element={<LayoutWrapper currentPageName="OfflineMap"><OfflineMap /></LayoutWrapper>} />
      <Route path="/Toolkit" element={<LayoutWrapper currentPageName="Toolkit"><Toolkit /></LayoutWrapper>} />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/Incidents" element={<LayoutWrapper currentPageName="Incidents"><Incidents /></LayoutWrapper>} />
      <Route path="/IncidentDetail" element={<LayoutWrapper currentPageName="IncidentDetail"><IncidentDetail /></LayoutWrapper>} />
      <Route path="/FieldGuide" element={<LayoutWrapper currentPageName="FieldGuide"><FieldGuide /></LayoutWrapper>} />
      <Route path="/ResponseHub" element={<LayoutWrapper currentPageName="ResponseHub"><ResponseHub /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App