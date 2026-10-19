import React from 'react';
import { AppNotification } from '../../types';
import { Bell, CheckCheck, FileText, Building2, Clock, CheckCircle2, ShieldAlert, Calendar } from 'lucide-react';
import { Store } from '../../services/store';

interface LandlordNotificationsViewProps {
  notifications: AppNotification[];
  onNavigateToApplications?: () => void;
  onNavigateToProperties?: () => void;
  onNavigateToInspection?: (inspectionId: string) => void;
}

export const LandlordNotificationsView: React.FC<LandlordNotificationsViewProps> = ({
  notifications,
  onNavigateToApplications,
  onNavigateToProperties,
  onNavigateToInspection,
}) => {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllAsRead = () => {
    notifications.forEach((n) => {
      if (!n.isRead) {
        Store.markNotificationAsRead(n.id);
      }
    });
  };

  const handleMarkSingleRead = (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    Store.markNotificationAsRead(notifId);
  };

  const handleNotificationClick = (notif: AppNotification) => {
    Store.markNotificationAsRead(notif.id);
    if ((notif.type === 'INSPECTION' || notif.inspectionId) && onNavigateToInspection && notif.inspectionId) {
      onNavigateToInspection(notif.inspectionId);
    } else if (notif.type === 'APPLICATION' && onNavigateToApplications) {
      onNavigateToApplications();
    } else if (notif.type === 'STATUS_CHANGE' && onNavigateToProperties) {
      onNavigateToProperties();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-700" />
            <span>Landlord Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time updates regarding applicant submissions, review statuses, and property inquiries.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs font-semibold text-stone-600 hover:text-emerald-800 bg-white border border-stone-200 hover:bg-stone-50 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <Bell className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="font-bold text-stone-800 text-base">No Notifications</h3>
            <p className="text-xs text-stone-500 mt-1">
              You are completely caught up! New tenant inquiries and review alerts will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`py-4 flex items-start gap-4 cursor-pointer transition ${
                  !notif.isRead ? 'bg-emerald-50/60 -mx-4 px-4 rounded-xl' : 'hover:bg-stone-50/80 -mx-4 px-4 rounded-xl'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    notif.type === 'APPLICATION'
                      ? 'bg-amber-100 text-amber-800'
                      : notif.type === 'STATUS_CHANGE'
                      ? 'bg-blue-100 text-blue-800'
                      : !notif.isRead
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {notif.type === 'APPLICATION' ? (
                    <FileText className="w-4 h-4" />
                  ) : notif.type === 'STATUS_CHANGE' ? (
                    <Building2 className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <span>{notif.title}</span>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                      )}
                    </h4>
                  </div>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed whitespace-pre-line">{notif.message}</p>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-100">
                    <span className="text-[11px] text-stone-400">
                      {new Date(notif.createdAt).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {!notif.isRead && (
                      <button
                        onClick={(e) => handleMarkSingleRead(e, notif.id)}
                        className="text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded transition cursor-pointer"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>

                  {notif.title.toLowerCase().includes('additional information received') && onNavigateToApplications && (
                    <div className="mt-2.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationClick(notif);
                        }}
                        className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Review Response</span>
                      </button>
                    </div>
                  )}

                  {(notif.type === 'INSPECTION' || notif.inspectionId || notif.title.toLowerCase().includes('inspection')) && notif.inspectionId && onNavigateToInspection && (
                    <div className="mt-2.5">
                      <button
                        id={`btn-landlord-notif-insp-${notif.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationClick(notif);
                        }}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>View & Coordinate Inspection</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
