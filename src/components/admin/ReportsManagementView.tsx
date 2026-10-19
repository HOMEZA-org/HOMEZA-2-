import React, { useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Flag,
  Info,
  MapPin,
  ShieldAlert,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { PropertyReport } from '../../types';
import { Store } from '../../services/store';

interface ReportsManagementViewProps {
  reports: PropertyReport[];
  onViewPropertyById?: (propertyId: string) => void;
  onViewProperty?: (property: any) => void;
}

export const ReportsManagementView: React.FC<ReportsManagementViewProps> = ({
  reports,
  onViewPropertyById,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'ACTION_TAKEN' | 'DISMISSED'>('ALL');
  const [selectedReportForDetail, setSelectedReportForDetail] = useState<PropertyReport | null>(null);
  const [deleteConfirmReport, setDeleteConfirmReport] = useState<PropertyReport | null>(null);

  const filteredReports =
    filter === 'ALL'
      ? reports
      : filter === 'ACTION_TAKEN'
      ? reports.filter((r) => r.status === 'ACTION_TAKEN' || (r.status as string) === 'RESOLVED')
      : reports.filter((r) => r.status === filter);

  const handleResolve = (reportId: string, status: 'ACTION_TAKEN' | 'DISMISSED', notes?: string) => {
    Store.resolveReport(reportId, status, notes);
    if (selectedReportForDetail && selectedReportForDetail.id === reportId) {
      setSelectedReportForDetail((prev) =>
        prev
          ? {
              ...prev,
              status: status === 'ACTION_TAKEN' ? 'RESOLVED' : 'DISMISSED',
              adminNotes: notes,
            }
          : null
      );
    }
  };

  const handleRemoveReportedProperty = (report: PropertyReport) => {
    if (
      window.confirm(
        `Remove property listing "${report.propertyTitle}" and resolve this report with action taken?`
      )
    ) {
      Store.deleteProperty(report.propertyId);
      Store.resolveReport(
        report.id,
        'ACTION_TAKEN',
        'Property listing deleted by administrator following tenant report.'
      );
      if (selectedReportForDetail && selectedReportForDetail.id === report.id) {
        setSelectedReportForDetail((prev) =>
          prev
            ? {
                ...prev,
                status: 'RESOLVED',
                adminNotes: 'Property listing deleted by administrator following tenant report.',
              }
            : null
        );
      }
    }
  };

  const handleConfirmDeleteReportRecord = () => {
    if (deleteConfirmReport) {
      Store.deleteReport(deleteConfirmReport.id);
      if (selectedReportForDetail && selectedReportForDetail.id === deleteConfirmReport.id) {
        setSelectedReportForDetail(null);
      }
      setDeleteConfirmReport(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <span>Tenant Property Reports & Moderation ({reports.length})</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Audit scam alerts, fake listings, inaccurate descriptions, and unavailable houses reported by users.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 text-xs">
          {(['ALL', 'PENDING', 'ACTION_TAKEN', 'DISMISSED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                filter === st
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-stone-200 shadow-sm max-w-md mx-auto">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-900 mb-1">No Active Reports</h3>
          <p className="text-xs text-stone-500">
            {filter === 'ALL'
              ? 'All listings are in good standing with zero tenant reports.'
              : `No reports with status "${filter}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const isResolvedOrAction =
              report.status === 'ACTION_TAKEN' || (report.status as string) === 'RESOLVED';
            return (
              <div
                key={report.id}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-4"
              >
                {/* Top info */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-stone-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-red-100 text-red-800 font-bold text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{report.reason}</span>
                      </span>

                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          report.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : isResolvedOrAction
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-stone-900 text-sm sm:text-base mt-2">
                      {report.propertyTitle}
                    </h3>
                    <div className="text-xs text-stone-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-stone-400" />
                      <span>{report.propertyLocation}</span>
                    </div>
                  </div>

                  {/* Reporter detail */}
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs shrink-0 max-w-xs space-y-1">
                    <div className="text-stone-400 text-[10px] uppercase font-bold">Reported By</div>
                    <div className="font-semibold text-stone-900">{report.reportedByUserName}</div>
                    <div className="text-stone-500">{report.reportedByUserEmail}</div>
                    <div className="text-[10px] text-stone-400">
                      {new Date(report.createdAt).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                {/* Report Description */}
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-100 text-xs space-y-1">
                  <div className="font-semibold text-stone-700">Tenant Explanation / Evidence:</div>
                  <p className="text-stone-800 leading-relaxed italic">"{report.details}"</p>
                </div>

                {/* Admin Note if resolved */}
                {report.adminNotes && (
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                    <strong>Resolution note:</strong> {report.adminNotes}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <span className="text-xs text-stone-400 font-mono">Report #{report.id}</span>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedReportForDetail(report)}
                      className="bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1.5 rounded-lg transition border border-purple-200 flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>

                    {report.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleRemoveReportedProperty(report)}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Listing</span>
                        </button>

                        <button
                          onClick={() =>
                            handleResolve(
                              report.id,
                              'DISMISSED',
                              'Listing investigated and confirmed valid.'
                            )
                          }
                          className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition border border-stone-200 cursor-pointer"
                        >
                          Dismiss Report
                        </button>
                      </>
                    )}

                    {onViewPropertyById && (
                      <button
                        onClick={() => onViewPropertyById(report.propertyId)}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold px-2 flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Listing</span>
                      </button>
                    )}

                    {/* Delete Report Record with confirmation */}
                    <button
                      onClick={() => setDeleteConfirmReport(report)}
                      className="text-xs text-stone-400 hover:text-red-600 px-2 py-1 transition cursor-pointer"
                      title="Permanently remove this report record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Report Details Modal */}
      {selectedReportForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-red-100 text-red-700 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Tenant Report Audit</h3>
                  <p className="text-xs text-stone-500 font-mono">ID: {selectedReportForDetail.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReportForDetail(null)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status & Reason */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] font-bold uppercase text-stone-400 block">Category</span>
                <span className="text-xs font-bold text-stone-900">{selectedReportForDetail.reason}</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] font-bold uppercase text-stone-400 block">Status</span>
                <span className="text-xs font-bold text-stone-900">{selectedReportForDetail.status}</span>
              </div>
            </div>

            {/* Reported Property */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
              <div className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">
                Reported Property Listing
              </div>
              <div className="font-bold text-stone-900 text-sm">{selectedReportForDetail.propertyTitle}</div>
              <div className="text-stone-600 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                <span>{selectedReportForDetail.propertyLocation}</span>
              </div>
              {onViewPropertyById && (
                <button
                  onClick={() => {
                    const pid = selectedReportForDetail.propertyId;
                    setSelectedReportForDetail(null);
                    onViewPropertyById(pid);
                  }}
                  className="mt-2 text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Property Listing</span>
                </button>
              )}
            </div>

            {/* Reporter Information */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5 text-xs">
              <div className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">
                Tenant Reporter Details
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-stone-500">Name:</span>
                <span className="font-semibold text-stone-900">{selectedReportForDetail.reportedByUserName}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-stone-500">Email:</span>
                <span className="font-semibold text-stone-900">{selectedReportForDetail.reportedByUserEmail}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-stone-500">Tenant User ID:</span>
                <span className="font-mono text-stone-600">{selectedReportForDetail.reportedByUserId}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-stone-500">Reported At:</span>
                <span className="text-stone-700">
                  {new Date(selectedReportForDetail.createdAt).toLocaleString('en-NG')}
                </span>
              </div>
            </div>

            {/* Explanation / Evidence */}
            <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100 space-y-1 text-xs">
              <div className="font-bold text-red-900">Tenant Report Explanation:</div>
              <p className="text-stone-800 leading-relaxed italic">"{selectedReportForDetail.details}"</p>
            </div>

            {/* Resolution Note if resolved */}
            {selectedReportForDetail.adminNotes && (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1 text-xs">
                <div className="font-bold text-emerald-900">Admin Resolution Summary:</div>
                <p className="text-emerald-950">{selectedReportForDetail.adminNotes}</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
              <button
                onClick={() => setSelectedReportForDetail(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>

              {selectedReportForDetail.status === 'PENDING' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRemoveReportedProperty(selectedReportForDetail)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Listing</span>
                  </button>
                  <button
                    onClick={() =>
                      handleResolve(
                        selectedReportForDetail.id,
                        'DISMISSED',
                        'Listing investigated and verified as legitimate.'
                      )
                    }
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Dismiss Report
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-red-100 text-red-700 rounded-2xl">
                <Trash2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-stone-900">Delete Report Record?</h3>
                <p className="text-xs text-stone-500">Report #{deleteConfirmReport.id}</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to permanently delete this report record from the moderation history? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmReport(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteReportRecord}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

