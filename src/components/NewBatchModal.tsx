import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface NewBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentBatchNumber: number;
}

export const NewBatchModal: React.FC<NewBatchModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentBatchNumber,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-[#141720] border border-[#2c3142] p-6 shadow-2xl text-slate-100">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 mx-auto">
          <RefreshCw className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-center text-white mb-2">
          Start a new 25-prompt batch?
        </h3>

        <p className="text-xs text-slate-300 text-center mb-4 leading-relaxed">
          Batch saat ini akan ditutup dan batch berikutnya akan dimulai dari counter{' '}
          <strong className="text-amber-400">#1</strong>.<br />
          Hasil tracklist dari batch sebelumnya <strong>tetap tersimpan</strong> dan tidak akan
          dihapus kecuali Anda memilih tombol Clear Tracklist.
        </p>

        <div className="rounded-xl bg-[#0f1118] border border-[#222736] p-3 text-[11px] text-slate-400 mb-5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            Setiap batch dirancang untuk menghasilkan 25 prompt unik berkesinambungan untuk satu album / video YouTube instrumental.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-[#1d212d] hover:bg-[#272d3d] text-slate-300 font-medium text-xs transition"
          >
            Batal
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.3)] transition"
          >
            Ya, Mulai Batch Baru
          </button>
        </div>
      </div>
    </div>
  );
};
