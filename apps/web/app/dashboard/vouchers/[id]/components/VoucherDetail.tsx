'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface VoucherDetailProps {
  voucher: any;
  canEdit: boolean;
  canPost: boolean;
}

export default function VoucherDetail({ voucher, canEdit, canPost }: VoucherDetailProps) {
  const router = useRouter();
  const [isPosting, setIsPosting] = useState(false);

  const totalDebit = voucher.lines.reduce((sum: number, line: any) => sum + Number(line.debit), 0);
  const totalCredit = voucher.lines.reduce((sum: number, line: any) => sum + Number(line.credit), 0);

  const handlePost = async () => {
    if (!confirm('Are you sure you want to post this voucher? It cannot be edited after posting.')) {
      return;
    }

    setIsPosting(true);
    try {
      const response = await fetch(`/api/vouchers/${voucher.id}/post`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.ok) {
        window.location.reload();
      } else {
        alert(data.error || 'Failed to post voucher');
      }
    } catch (error) {
      alert('An error occurred while posting the voucher');
    } finally {
      setIsPosting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Actions */}
      <div className="mb-6 flex gap-4 justify-end print:hidden">
        {canEdit && (
          <a
            href={`/dashboard/vouchers/${voucher.id}/edit`}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Edit
          </a>
        )}
        {canPost && (
          <button
            onClick={handlePost}
            disabled={isPosting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
          >
            {isPosting ? 'Posting...' : 'Post Voucher'}
          </button>
        )}
        <button
          onClick={handlePrint}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Print
        </button>
        <a
          href="/dashboard/vouchers"
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Back to List
        </a>
      </div>

      {/* Voucher Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Voucher Number</h3>
            <p className="mt-1 text-lg font-semibold text-gray-900">{voucher.voucherNo}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Date</h3>
            <p className="mt-1 text-lg text-gray-900">
              {new Date(voucher.date).toLocaleDateString()}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Type</h3>
            <p className="mt-1 text-lg text-gray-900">{voucher.type || 'JOURNAL'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <p className="mt-1">
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  voucher.status === 'POSTED'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {voucher.status}
              </span>
            </p>
          </div>
          {voucher.project && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Project</h3>
              <p className="mt-1 text-lg text-gray-900">{voucher.project.name}</p>
            </div>
          )}
          {voucher.narration && (
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500">Narration</h3>
              <p className="mt-1 text-gray-900">{voucher.narration}</p>
            </div>
          )}
        </div>
      </div>

      {/* Voucher Lines */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {voucher.lines.map((line: any, index: number) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {line.account.code} - {line.account.name}
                  </div>
                  {line.project && (
                    <div className="text-xs text-gray-500">Project: {line.project.name}</div>
                  )}
                  {line.vendor && (
                    <div className="text-xs text-gray-500">Vendor: {line.vendor.name}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{line.description || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {Number(line.debit) > 0
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(Number(line.debit))
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {Number(line.credit) > 0
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(Number(line.credit))
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={2} className="px-6 py-4 text-right font-medium text-gray-900">
                Totals:
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                }).format(totalDebit)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                }).format(totalCredit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Allocations (for Payment Vouchers) */}
      {voucher.type === 'PAYMENT' && voucher.allocations && voucher.allocations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Payment Allocations</h3>
            <p className="text-sm text-gray-500 mt-1">
              This payment voucher allocates amounts to the following vendor payable lines:
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source Voucher</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Allocated Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {voucher.allocations.map((allocation: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a
                        href={`/dashboard/vouchers/${allocation.sourceLine.voucher.id}`}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        {allocation.sourceLine.voucher.voucherNo}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(allocation.sourceLine.voucher.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {allocation.sourceLine.account.code} - {allocation.sourceLine.account.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(Number(allocation.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-right font-medium text-gray-900">
                    Total Allocated:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(
                      voucher.allocations.reduce(
                        (sum: number, alloc: any) => sum + Number(alloc.amount),
                        0
                      )
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="mt-6 text-sm text-gray-500">
        <p>Created by: {voucher.createdBy.name} on {new Date(voucher.createdAt).toLocaleString()}</p>
        {voucher.postedBy && (
          <p>Posted by: {voucher.postedBy.name} on {new Date(voucher.postedAt).toLocaleString()}</p>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
