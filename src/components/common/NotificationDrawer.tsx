import React from 'react';
import { Bell, Check, CheckCheck, FileText, HelpCircle, Info, ShieldAlert, X, Calendar } from 'lucide-react';
import { AppNotification } from '../../types';
import { Store } from '../../services/store';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  currentUserId: string;
  onNavigate?: (tab: string, itemType?: string, itemId?: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  currentUserId,
  onNavigate,
}) => {
  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    Store.markAllNotificationsAsRead(currentUserId);
  };

  const handleMarkSingleRead = (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    Store.markNotificationAsRead(notifId);
  };

  const handleItemClick = (notif: AppNotification) => {
    Store.markNotificationAsRead(notif.id);
    onClose();
    if (onNavigate) {
      if (notif.targetType === 'KYC_AGENT' || notif.type === 'KYC_AGENT' || notif.title.toLowerCase().includes('agent')) {
        onNavigate('admin-agents', 'kyc-agent', notif.targetId);
      } else if (notif.targetType === 'KYC_LANDLORD' || notif.type === 'KYC_LANDLORD' || notif.title.toLowerCase().includes('landlord kyc')) {
        onNavigate('admin-landlords', 'kyc-landlord', notif.targetId);
      } else if (notif.targetType === 'PROPERTY' || (notif.type === 'STATUS_CHANGE' && notif.propertyId)) {
        onNavigate('admin-pending-reviews', 'property', notif.targetId || notif.propertyId);
      } else if (notif.type === 'APPLICATION' || notif.title.toLowerCase().includes('application')) {
        onNavigate('applications', 'application', notif.applicationId || notif.targetId);
      } else if (notif.type === 'INSPECTION' || notif.title.toLowerCase().includes('inspection') || notif.inspectionId) {
        onNavigate('admin-inspections', 'inspection', notif.inspectionId || notif.targetId);
      } else if (notif.type === 'REPORT') {
        onNavigate('admin-reports', 'report', notif.id);
      } else if (notif.title.toLowerCase().includes('property') || notif.propertyId) {
        onNavigate('my-properties', 'property', notif.propertyId);
      } else {
        onNavigate('overview', 'notification', notif.id);
      }
    }
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'APPLICATION':
        return <FileText className="w-5 h-5 text-blue-700" />;
      case 'STATUS_CHANGE':
        return <Check className="w-5 h-5 text-emerald-700" />;
      case 'REPORT':
        return <ShieldAlert className="w-5 h-5 text-red-700" />;
      case 'INSPECTION':
        return <Calendar className="w-5 h-5 text-amber-700" />;
      default:
        return <Info className="w-5 h-5 text-stone-700" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-950/50 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div
        id="notification-drawer-panel"
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-stone-200"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-stone-900 text-xl sm:text-2xl">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-stone-600">Real-time alerts & updates</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                id="btn-mark-all-notifications-read"
                onClick={handleMarkAllRead}
                className="text-xs sm:text-sm font-semibold text-emerald-800 hover:text-emerald-900 hover:underline flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-emerald-50 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              type="button"
              id="btn-close-notification-drawer"
              onClick={onClose}
              className="p-2.5 rounded-xl hover:bg-stone-200 text-stone-600 transition cursor-pointer"
              aria-label="Close notification drawer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100 p-4 space-y-2">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-stone-500 space-y-3">
              <Bell className="w-12 h-12 mx-auto text-stone-300" />
              <p className="text-base sm:text-lg font-medium">No notifications yet.</p>
              <p className="text-sm text-stone-400">You will be notified about application updates, property reviews, and inspection alerts here.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`p-4 sm:p-5 rounded-2xl transition cursor-pointer flex flex-col gap-2 ${
                  notif.isRead
                    ? 'hover:bg-stone-50 border border-stone-200/80 bg-white'
                    : 'bg-emerald-50/60 hover:bg-emerald-50/90 border border-emerald-300 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 shadow-xs flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`text-base font-bold truncate ${
                          notif.isRead ? 'text-stone-800' : 'text-stone-950 font-extrabold'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      {!notif.isRead && (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm sm:text-base text-stone-700 mt-1.5 leading-relaxed whitespace-pre-line">
                      {notif.message}
                    </p>
                    
                    {notif.title.toLowerCase().includes('additional information required') && (
                      <div className="mt-3">
                        <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-3.5 py-2 rounded-xl shadow-xs">
                          <FileText className="w-4 h-4" />
                          Provide Information Now
                        </span>
                      </div>
                    )}

                    {notif.title.toLowerCase().includes('additional information received') && (
                      <div className="mt-3">
                        <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 px-3.5 py-2 rounded-xl shadow-xs">
                          <FileText className="w-4 h-4" />
                          Review Submitted Response
                        </span>
                      </div>
                    )}

                    {(notif.type === 'INSPECTION' || notif.inspectionId || notif.title.toLowerCase().includes('inspection')) && (
                      <div className="mt-3">
                        <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-3.5 py-2 rounded-xl shadow-xs">
                          <Calendar className="w-4 h-4" />
                          View Inspection Schedule
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-200/50">
                      <span className="text-xs font-semibold text-stone-500">
                        {new Date(notif.createdAt).toLocaleDateString('en-NG', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {!notif.isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkSingleRead(e, notif.id)}
                          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

