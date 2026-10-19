import React, { useState } from 'react';
import {
  AgentUser,
  AppNotification,
} from '../../types';
import { Store } from '../../services/store';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  CheckCheck,
  Clock,
  FileText,
  Home,
  Info,
  Shield,
  Trash2,
  Calendar,
} from 'lucide-react';

interface AgentNotificationsViewProps {
  agent: AgentUser;
  notifications: AppNotification[];
  onNavigateToInspection?: (inspectionId: string) => void;
}

export const AgentNotificationsView: React.FC<AgentNotificationsViewProps> = ({
  agent,
  notifications,
  onNavigateToInspection,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const agentNotifs = notifications.filter((n) => n.userId === agent.id);
  const filteredNotifs = agentNotifs.filter((n) => (filter === 'UNREAD' ? !n.isRead : true));

  const handleMarkAsRead = (id: string) => {
    Store.markNotificationAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    Store.markAllNotificationsAsRead(agent.id);
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'STATUS_CHANGE':
        return <CheckCircle2 className="w-5 h-5 text-emerald-700" />;
      case 'APPLICATION':
        return <FileText className="w-5 h-5 text-blue-700" />;
      case 'REPORT':
        return <AlertCircle className="w-5 h-5 text-amber-700" />;
      case 'SYSTEM':
      default:
        return <Info className="w-5 h-5 text-stone-700" />;
    }
  };

  return (
    <div id="agent-notifications-view" className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2.5">
            <Bell className="w-8 h-8 text-emerald-700" />
            Agent Notifications
          </h1>
          <p className="text-stone-600 text-base mt-1">
            Stay informed on compliance verification, client activity, and platform announcements.
          </p>
        </div>

        {agentNotifs.some((n) => !n.isRead) && (
          <button
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer shadow-2xs shrink-0"
          >
            <CheckCheck className="w-4 h-4 text-emerald-700" />
            Mark All as Read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            filter === 'ALL'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
          }`}
        >
          All ({agentNotifs.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            filter === 'UNREAD'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
          }`}
        >
          Unread ({agentNotifs.filter((n) => !n.isRead).length})
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <Bell className="w-12 h-12 text-stone-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-stone-900 mb-1">No Notifications</h2>
          <p className="text-stone-600 text-sm max-w-md mx-auto">
            You're all caught up! When you receive updates about your verification or client applications, they will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifs.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                if (!notif.isRead) handleMarkAsRead(notif.id);
                if ((notif.type === 'INSPECTION' || notif.inspectionId || notif.title.toLowerCase().includes('inspection')) && notif.inspectionId && onNavigateToInspection) {
                  onNavigateToInspection(notif.inspectionId);
                }
              }}
              className={`p-5 rounded-2xl border transition flex items-start gap-4 cursor-pointer ${
                notif.isRead
                  ? 'bg-white border-stone-200 opacity-80 hover:opacity-100'
                  : 'bg-emerald-50/50 border-emerald-300 shadow-xs'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-white border border-stone-200 shrink-0 mt-0.5 shadow-2xs">
                {getIcon(notif.type)}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-bold text-stone-900 text-base">{notif.title}</h2>
                  <span className="text-xs text-stone-500 whitespace-nowrap">
                    {new Date(notif.createdAt).toLocaleDateString('en-NG', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line">
                  {notif.message}
                </p>

                {(notif.type === 'INSPECTION' || notif.inspectionId || notif.title.toLowerCase().includes('inspection')) && notif.inspectionId && onNavigateToInspection && (
                  <div className="pt-2">
                    <button
                      id={`btn-agent-notif-insp-${notif.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notif.id);
                        onNavigateToInspection(notif.inspectionId!);
                      }}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>View & Coordinate Inspection</span>
                    </button>
                  </div>
                )}

                {!notif.isRead && (
                  <div className="pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notif.id);
                      }}
                      className="text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                    >
                      Mark as read
                    </button>
                  </div>
                )}
              </div>

              {!notif.isRead && (
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0 mt-2" title="Unread" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
