import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { PropertyDetailModal } from './components/common/PropertyDetailModal';
import { ApplyRentalModal } from './components/common/ApplyRentalModal';
import { ReportPropertyModal } from './components/common/ReportPropertyModal';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { AuthModal } from './components/auth/AuthModal';
import { AuthGate } from './components/auth/AuthGate';
import { TenantDashboard } from './components/tenant/TenantDashboard';
import { LandlordDashboard } from './components/landlord/LandlordDashboard';
import { AgentDashboard } from './components/agent/AgentDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminInspectionBanner } from './components/admin/AdminInspectionBanner';
import { AdminInspectionDetailModal } from './components/admin/AdminInspectionDetailModal';
import { DirectMessagingModal } from './components/common/DirectMessagingModal';
import { AccessDenied } from './components/common/AccessDenied';
import { EmailVerificationBanner } from './components/auth/EmailVerificationBanner';
import { EmailVerificationModal } from './components/auth/EmailVerificationModal';
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';
import { Store, syncStoreWithServer } from './services/store';
import {
  AgentClient,
  AppNotification,
  LandlordUser,
  LocationArea,
  Property,
  PropertyReport,
  RentalApplication,
  TenantUser,
  User,
} from './types';

const MainApp: React.FC = () => {
  const { currentUser, role } = useAuth();

  // Reactive Store Data State
  const [properties, setProperties] = useState<Property[]>(Store.getProperties());
  const [users, setUsers] = useState<User[]>(Store.getUsers());
  const [applications, setApplications] = useState<RentalApplication[]>(Store.getApplications());
  const [reports, setReports] = useState<PropertyReport[]>(Store.getReports());
  const [locations, setLocations] = useState<LocationArea[]>(Store.getLocations());
  const [notifications, setNotifications] = useState<AppNotification[]>(Store.getNotifications());

  // Navigation Tab state
  const [activeTab, setActiveTab] = useState<string>('explore');

  // Admin Inspection Mode State
  const [adminInspection, setAdminInspection] = useState<{
    active: boolean;
    mode: 'tenant' | 'landlord';
    inspectedUserId?: string;
  }>({
    active: false,
    mode: 'tenant',
  });

  // Modal States
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [applyProperty, setApplyProperty] = useState<Property | null>(null);
  const [reportProperty, setReportProperty] = useState<Property | null>(null);
  const [messagingInspectionId, setMessagingInspectionId] = useState<string | null>(null);
  const [adminInspectionDetailId, setAdminInspectionDetailId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<
    'LOGIN' | 'REGISTER_TENANT' | 'REGISTER_LANDLORD' | 'REGISTER_AGENT'
  >('LOGIN');
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [isVerifyEmailModalOpen, setIsVerifyEmailModalOpen] = useState<boolean>(false);
  const [paymentBanner, setPaymentBanner] = useState<{
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
    reference?: string;
  } | null>(null);

  // Handle Paystack Return Callback & Email Verification Query Parameters
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment_status');
      const ref = urlParams.get('ref') || urlParams.get('reference') || urlParams.get('trxref');
      const err = urlParams.get('error');

      // Check email verification URL params
      const verifyToken = urlParams.get('verify_token');
      const emailVerified = urlParams.get('email_verified');
      const verifyEmailParam = urlParams.get('email');

      if (verifyToken) {
        fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: verifyToken, email: verifyEmailParam }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setPaymentBanner({
                type: 'success',
                title: 'Email Address Verified Successfully!',
                message: 'Your HOMEZA account is verified. You now have full access to book inspections and list properties.',
              });
              syncStoreWithServer(true);
            }
          })
          .catch(() => {});
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (emailVerified === 'true') {
        setPaymentBanner({
          type: 'success',
          title: 'Email Verified Successfully!',
          message: 'Your email address is confirmed. You can now use all platform services.',
        });
        syncStoreWithServer(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (paymentStatus) {
        if (paymentStatus === 'success') {
          setPaymentBanner({
            type: 'success',
            title: 'Payment Confirmed & Inspection Unlocked!',
            message: 'Your inspection fee has been verified via Paystack. The exact property meeting location and coordinator details are now unlocked on your dashboard.',
            reference: ref || undefined,
          });
          setActiveTab('applications');
        } else if (paymentStatus === 'failed') {
          setPaymentBanner({
            type: 'error',
            title: 'Payment Verification Unsuccessful',
            message: err || 'The Paystack transaction could not be verified or was cancelled.',
            reference: ref || undefined,
          });
        } else {
          setPaymentBanner({
            type: 'warning',
            title: 'Payment Processing Notice',
            message: err || 'Payment status updated. Please review your inspection dashboard.',
            reference: ref || undefined,
          });
        }

        // Trigger store sync
        syncStoreWithServer(true);

        // Clean up URL query parameters without reloading
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {
      console.warn('Could not parse payment callback query params:', e);
    }
  }, [role]);

  // Subscribe to reactive store changes
  useEffect(() => {
    const unsubscribe = Store.subscribe(() => {
      setProperties(Store.getProperties());
      setUsers(Store.getUsers());
      setApplications(Store.getApplications());
      setReports(Store.getReports());
      setLocations(Store.getLocations());
      setNotifications(Store.getNotifications());
    });
    return () => unsubscribe();
  }, []);

  // Sync tab navigation default when user switches role & exit inspection if switching away from admin
  useEffect(() => {
    if (role === 'LANDLORD') {
      setAdminInspection({ active: false, mode: 'tenant' });
      setActiveTab('landlord-dashboard');
    } else if (role === 'AGENT') {
      setAdminInspection({ active: false, mode: 'tenant' });
      setActiveTab('agent-dashboard');
    } else if (role === 'ADMIN') {
      setActiveTab('admin-dashboard');
    } else if (role === 'TENANT') {
      setAdminInspection({ active: false, mode: 'tenant' });
      setActiveTab('explore');
    }
  }, [role]);

  // Handle Admin Inspection Handlers
  const handleEnterInspectionMode = (mode: 'tenant' | 'landlord', targetUserId?: string) => {
    setAdminInspection({
      active: true,
      mode,
      inspectedUserId: targetUserId,
    });
    if (mode === 'tenant') {
      setActiveTab('explore');
    } else {
      setActiveTab('landlord-dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExitInspectionMode = () => {
    setAdminInspection({ active: false, mode: 'tenant' });
    setActiveTab('admin-dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChangeInspectedUser = (userId?: string) => {
    setAdminInspection((prev) => ({
      ...prev,
      inspectedUserId: userId,
    }));
  };

  // Derive inspected user object
  const inspectedUser = adminInspection.inspectedUserId
    ? users.find((u) => u.id === adminInspection.inspectedUserId) || null
    : null;

  // Current user's notifications
  const userNotifications = currentUser
    ? notifications.filter((n) => {
        if (n.userId === currentUser.id || n.userId === 'all') return true;
        if (role === 'ADMIN') {
          return (
            n.userId === 'user-admin-1' ||
            n.userId === 'admin-1' ||
            n.userId === 'admin' ||
            n.userId === 'user-admin' ||
            (n as any).targetRole === 'ADMIN'
          );
        }
        return false;
      })
    : [];

  const handleOpenAuth = (
    mode: 'LOGIN' | 'REGISTER_TENANT' | 'REGISTER_LANDLORD' | 'REGISTER_AGENT' = 'LOGIN'
  ) => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleOpenApply = (property: Property) => {
    if (role === 'ADMIN' && adminInspection.active) {
      alert('Admin Inspection Notice: Submitting rental applications is disabled in Tenant Inspection Mode. You remain authenticated as Admin.');
      return;
    }
    if (!currentUser) {
      handleOpenAuth('LOGIN');
      return;
    }
    setApplyProperty(property);
  };

  const handleOpenReport = (property: Property) => {
    if (!currentUser) {
      handleOpenAuth('LOGIN');
      return;
    }
    setReportProperty(property);
  };

  const handleLocationSelectFromFooter = (areaName: string) => {
    setActiveTab('explore');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // MANDATORY AUTHENTICATION GATE:
  // If user is unauthenticated, render the HOMEZA Welcome & Authentication Gate.
  // Strictly prevent accessing any Tenant, Landlord, Agent, or Admin dashboard before authentication.
  if (!currentUser || !role) {
    return (
      <AuthGate
        onSuccess={(authRole) => {
          if (authRole === 'LANDLORD') {
            setActiveTab('landlord-dashboard');
          } else if (authRole === 'AGENT') {
            setActiveTab('agent-dashboard');
          } else if (authRole === 'ADMIN') {
            setActiveTab('admin-dashboard');
          } else {
            setActiveTab('explore');
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans text-stone-900 antialiased selection:bg-emerald-700 selection:text-white">
      {/* Admin Inspection Mode Banner */}
      {role === 'ADMIN' && adminInspection.active && (
        <AdminInspectionBanner
          mode={adminInspection.mode}
          inspectedUser={inspectedUser}
          availableUsers={users}
          onExitInspection={handleExitInspectionMode}
          onSwitchMode={(newMode) => handleEnterInspectionMode(newMode)}
          onSelectUser={handleChangeInspectedUser}
        />
      )}

      {/* Top Main Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={handleOpenAuth}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        unreadNotificationsCount={userNotifications.filter((n) => !n.isRead).length}
      />

      {/* Email Verification Alert Banner for Unverified Users */}
      <EmailVerificationBanner onOpenVerifyModal={() => setIsVerifyEmailModalOpen(true)} />

      {/* Paystack Payment Return Status Notification Banner */}
      {paymentBanner && (
        <div
          id="payment-return-banner"
          className={`border-b transition-all duration-300 ${
            paymentBanner.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : paymentBanner.type === 'error'
              ? 'bg-red-600 text-white border-red-700'
              : 'bg-amber-600 text-white border-amber-700'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {paymentBanner.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-100" />
              ) : paymentBanner.type === 'error' ? (
                <XCircle className="w-5 h-5 shrink-0 text-red-100" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-100" />
              )}
              <div className="min-w-0">
                <p className="font-bold text-sm leading-snug">{paymentBanner.title}</p>
                <p className="text-xs text-white/90 leading-snug mt-0.5 truncate sm:whitespace-normal">
                  {paymentBanner.message}
                  {paymentBanner.reference && (
                    <span className="font-mono ml-2 opacity-80 text-[11px]">
                      (Ref: {paymentBanner.reference})
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPaymentBanner(null)}
              className="p-1 rounded-lg hover:bg-black/10 transition text-white/90 hover:text-white shrink-0 cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area based on Active Role & Tab */}
      <main className="flex-1">
        {/* UNAUTHORIZED ACCESS ATTEMPTS */}
        {activeTab.startsWith('admin-') && role !== 'ADMIN' ? (
          <AccessDenied
            requiredRole="Platform Administrator"
            onReturnHome={() => {
              if (role === 'LANDLORD') setActiveTab('landlord-dashboard');
              else if (role === 'AGENT') setActiveTab('agent-dashboard');
              else setActiveTab('explore');
            }}
            onOpenAuth={handleOpenAuth}
          />
        ) : (activeTab.startsWith('landlord-') || activeTab === 'add-property') &&
          role !== 'LANDLORD' &&
          !(role === 'ADMIN' && adminInspection.active) ? (
          <AccessDenied
            requiredRole="Landlord or Property Owner"
            onReturnHome={() => {
              if (role === 'ADMIN') setActiveTab('admin-dashboard');
              else if (role === 'AGENT') setActiveTab('agent-dashboard');
              else setActiveTab('explore');
            }}
            onOpenAuth={handleOpenAuth}
          />
        ) : activeTab.startsWith('agent-') &&
          role !== 'AGENT' ? (
          <AccessDenied
            requiredRole="Verified Agent"
            onReturnHome={() => {
              if (role === 'ADMIN') setActiveTab('admin-dashboard');
              else if (role === 'LANDLORD') setActiveTab('landlord-dashboard');
              else setActiveTab('explore');
            }}
            onOpenAuth={handleOpenAuth}
          />
        ) : role === 'ADMIN' && adminInspection.active ? (
          /* ADMIN ROLE IN INSPECTION MODE */
          adminInspection.mode === 'tenant' ? (
            <TenantDashboard
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              properties={properties}
              locations={locations}
              applications={applications}
              notifications={inspectedUser ? notifications.filter((n) => n.userId === inspectedUser.id) : []}
              onViewProperty={() => {
                // Tenant dashboard manages full in-page property details directly
              }}
              onOpenApply={handleOpenApply}
              onOpenReport={handleOpenReport}
              onOpenAuth={handleOpenAuth}
              isInspectionMode={true}
              inspectedTenant={inspectedUser && inspectedUser.role === 'TENANT' ? (inspectedUser as TenantUser) : null}
            />
          ) : (
            <LandlordDashboard
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              properties={properties}
              applications={applications}
              locations={locations}
              notifications={inspectedUser ? notifications.filter((n) => n.userId === inspectedUser.id) : []}
              onViewProperty={(prop) => setSelectedProperty(prop)}
              isInspectionMode={true}
              inspectedLandlord={inspectedUser && inspectedUser.role === 'LANDLORD' ? (inspectedUser as LandlordUser) : null}
            />
          )
        ) : (
          <>
            {/* LANDLORD INTERFACE */}
            {role === 'LANDLORD' && (
              <LandlordDashboard
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                properties={properties}
                applications={applications}
                locations={locations}
                notifications={userNotifications}
                onViewProperty={(prop) => setSelectedProperty(prop)}
              />
            )}

            {/* AGENT INTERFACE */}
            {role === 'AGENT' && (
              <AgentDashboard
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                properties={properties}
                locations={locations}
                applications={applications}
                notifications={userNotifications}
                onViewProperty={(prop) => setSelectedProperty(prop)}
              />
            )}

            {/* ADMIN INTERFACE */}
            {role === 'ADMIN' && (
              <AdminDashboard
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                users={users}
                properties={properties}
                applications={applications}
                reports={reports}
                locations={locations}
                onViewProperty={(prop) => setSelectedProperty(prop)}
                onEnterViewMode={handleEnterInspectionMode}
              />
            )}

            {/* TENANT / PUBLIC MARKETPLACE INTERFACE */}
            {(!role || role === 'TENANT') && (
              <TenantDashboard
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                properties={properties}
                locations={locations}
                applications={applications}
                notifications={userNotifications}
                onViewProperty={() => {
                  // Tenant dashboard manages full in-page property details directly
                }}
                onOpenApply={handleOpenApply}
                onOpenReport={handleOpenReport}
                onOpenAuth={handleOpenAuth}
              />
            )}
          </>
        )}
      </main>

      {/* Platform Global Footer */}
      <Footer
        onSelectLocation={handleLocationSelectFromFooter}
        onOpenAuth={handleOpenAuth}
      />

      {/* Property Details Modal (Full Inspection View) */}
      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
          onApplyToRent={handleOpenApply}
          onReportProperty={handleOpenReport}
          onOpenAuth={() => handleOpenAuth('LOGIN')}
        />
      )}

      {/* Apply for Rental Modal */}
      {applyProperty && (
        <ApplyRentalModal
          property={applyProperty}
          onClose={() => setApplyProperty(null)}
          onSuccess={() => {
            setApplyProperty(null);
            setActiveTab('applications');
          }}
          onOpenAuth={() => handleOpenAuth('LOGIN')}
        />
      )}

      {/* Report Property Modal */}
      {reportProperty && (
        <ReportPropertyModal
          property={reportProperty}
          onClose={() => setReportProperty(null)}
          onOpenAuth={() => handleOpenAuth('LOGIN')}
        />
      )}

      {/* Authentication Modal */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode={authModalMode}
        />
      )}

      {/* Direct Messaging & Inspection Modal */}
      {messagingInspectionId && (
        <DirectMessagingModal
          inspectionId={messagingInspectionId}
          onClose={() => setMessagingInspectionId(null)}
          onOpenAuth={() => handleOpenAuth('LOGIN')}
        />
      )}

      {/* Admin Inspection Request Details Modal (Full Detail & Actions, Not Chat) */}
      {adminInspectionDetailId && (
        <AdminInspectionDetailModal
          isOpen={Boolean(adminInspectionDetailId)}
          inspectionId={adminInspectionDetailId}
          onClose={() => setAdminInspectionDetailId(null)}
          onOpenChatWithTenant={(id) => {
            setAdminInspectionDetailId(null);
            setMessagingInspectionId(id);
          }}
        />
      )}

      {/* In-app Notification Drawer */}
      {isNotificationOpen && currentUser && (
        <NotificationDrawer
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
          notifications={userNotifications}
          currentUserId={currentUser.id}
          onNavigate={(targetTab, itemType, itemId) => {
            if (itemType === 'inspection' || targetTab === 'inspections' || targetTab === 'admin-inspections') {
              if (itemId) {
                if (role === 'ADMIN') {
                  setAdminInspectionDetailId(itemId);
                } else {
                  setMessagingInspectionId(itemId);
                }
              }
            }

            if (role === 'LANDLORD') {
              if (targetTab === 'applications') {
                setActiveTab('landlord-applications');
              } else if (targetTab === 'my-properties') {
                setActiveTab('landlord-properties');
              } else if (targetTab === 'inspections') {
                setActiveTab('landlord-dashboard');
              } else {
                setActiveTab(targetTab);
              }
            } else if (role === 'AGENT') {
              if (targetTab === 'listings') {
                setActiveTab('agent-listings');
              } else if (targetTab === 'clients') {
                setActiveTab('agent-clients');
              } else if (targetTab === 'inspections') {
                setActiveTab('agent-inquiries');
              } else {
                setActiveTab(targetTab);
              }
            } else if (role === 'ADMIN') {
              if (targetTab === 'admin-agents' || itemType === 'kyc-agent') {
                setActiveTab('admin-agents');
              } else if (targetTab === 'admin-landlords' || itemType === 'kyc-landlord') {
                setActiveTab('admin-landlords');
              } else if (targetTab === 'admin-pending-reviews' || itemType === 'property') {
                setActiveTab('admin-pending-reviews');
              } else if (targetTab === 'admin-reports' || itemType === 'report') {
                setActiveTab('admin-reports');
              } else if (targetTab === 'admin-inspections' || itemType === 'inspection') {
                setActiveTab('admin-inspections');
              } else {
                setActiveTab('admin-dashboard');
              }
            } else {
              setActiveTab(targetTab);
            }
          }}
        />
      )}

      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={isVerifyEmailModalOpen}
        onClose={() => setIsVerifyEmailModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
