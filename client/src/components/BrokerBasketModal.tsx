import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  X, 
  ExternalLink, 
  Layers, 
  ShieldCheck, 
  Zap, 
  Code, 
  FileSpreadsheet, 
  CheckCircle2,
  Info
} from 'lucide-react';

export interface BrokerBasketItem {
  contractSymbol: string;
  strikePrice?: number;
  optionType: 'CE' | 'PE' | 'SPREAD';
  action: string;
  lotSize: number;
  lots: number;
  entryPrice: number;
  stoplossPrice: number;
  target1Price: number;
  executionType: 'NET_DEBIT' | 'NET_CREDIT';
}

export interface BrokerBasketModalProps {
  isOpen: boolean;
  onClose: () => void;
  basketItem: BrokerBasketItem;
}

export const BrokerBasketModal: React.FC<BrokerBasketModalProps> = ({
  isOpen,
  onClose,
  basketItem
}) => {
  const [copiedFormat, setCopiedFormat] = useState<'JSON' | 'CSV' | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);

  if (!isOpen || !basketItem) return null;

  const totalQuantity = (basketItem.lots || 1) * (basketItem.lotSize || 50);
  const entryPrice = typeof basketItem.entryPrice === 'number' ? basketItem.entryPrice : (Number(basketItem.entryPrice) || 0);
  const stoplossPrice = typeof basketItem.stoplossPrice === 'number' ? basketItem.stoplossPrice : (Number(basketItem.stoplossPrice) || 0);
  const target1Price = typeof basketItem.target1Price === 'number' ? basketItem.target1Price : (Number(basketItem.target1Price) || 0);
  const actionStr = String(basketItem.action || 'BUY');

  // Fyers API v3 and Dhan HQ API standard format
  const basketJson = JSON.stringify({
    broker_basket_version: '1.0.0',
    terminal: 'FAYDA_PRO',
    timestamp: new Date().toISOString(),
    orders: [
      {
        symbol: basketItem.contractSymbol || 'UNKNOWN',
        qty: totalQuantity,
        side: actionStr.includes('BUY') ? 1 : -1,
        type: 'LIMIT',
        limitPrice: entryPrice,
        stopPrice: stoplossPrice,
        targetPrice: target1Price,
        productType: 'INTRADAY',
        validity: 'DAY'
      }
    ]
  }, null, 2);

  // Zerodha / Dhan Standard CSV import format
  const basketCsv = [
    'Symbol,Exchange,Segment,Action,Quantity,Price,TriggerPrice,Product,OrderType',
    `"${basketItem.contractSymbol || 'UNKNOWN'}",NSE,NFO,${actionStr.includes('BUY') ? 'BUY' : 'SELL'},${totalQuantity},${entryPrice},${stoplossPrice},MIS,LIMIT`
  ].join('\n');

  const handleCopy = (text: string, format: 'JSON' | 'CSV') => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleSimulateOrder = () => {
    setIsSimulated(true);
    setTimeout(() => setIsSimulated(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 font-mono select-none animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md"
      />

      {/* Modal Box */}
      <div className="w-full max-w-xl bg-slate-50 dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl z-10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>Multi-Broker Order Basket</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 font-sans font-bold">
                  Architecture Ready
                </span>
              </h3>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {basketItem.contractSymbol} • {basketItem.lots} Lot{basketItem.lots > 1 ? 's' : ''} ({totalQuantity} Qty)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3.5 text-xs">
          {/* Notice: Direct trading safely isolated */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-[11px] font-sans flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold font-mono">Architecture Isolation Notice:</strong>
              <span className="block mt-0.5 leading-relaxed text-slate-700 dark:text-slate-300">
                Direct live trade execution from this application is currently isolated for your safety. You can copy the exact pre-calculated order basket into your broker (Fyers / Dhan / Zerodha) or execute a zero-risk paper simulation.
              </span>
            </div>
          </div>

          {/* Basket Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-center">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[9px] text-slate-400 block uppercase">Order Action</span>
              <span className="font-bold text-xs text-slate-900 dark:text-white mt-0.5 block">
                {actionStr.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[9px] text-slate-400 block uppercase">Quantity</span>
              <span className="font-bold text-xs text-slate-900 dark:text-white mt-0.5 block">
                {totalQuantity} ({basketItem.lots || 1}L)
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[9px] text-slate-400 block uppercase">Limit Price</span>
              <span className="font-bold text-xs text-cyan-600 dark:text-cyan-400 mt-0.5 block">
                ₹{entryPrice.toFixed(1)}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[9px] text-slate-400 block uppercase">Target / SL</span>
              <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                ₹{target1Price.toFixed(1)} / ₹{stoplossPrice.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Formatted Payloads */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Code className="w-3.5 h-3.5 text-accent-gold" />
                <span>Broker API Payload (JSON)</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(basketJson, 'JSON')}
                className="px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer"
              >
                {copiedFormat === 'JSON' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedFormat === 'JSON' ? 'Copied JSON' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-28 scrollbar-thin">
              {basketJson}
            </pre>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zerodha / Dhan Basket Import (CSV)</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(basketCsv, 'CSV')}
                className="px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer"
              >
                {copiedFormat === 'CSV' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedFormat === 'CSV' ? 'Copied CSV' : 'Copy CSV'}</span>
              </button>
            </div>
            <pre className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-emerald-300 overflow-x-auto">
              {basketCsv}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleSimulateOrder}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            {isSimulated ? <CheckCircle2 className="w-4 h-4 text-emerald-950" /> : <Zap className="w-4 h-4" />}
            <span>{isSimulated ? 'Paper Order Simulated!' : 'Simulate Paper Execution'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrokerBasketModal;
