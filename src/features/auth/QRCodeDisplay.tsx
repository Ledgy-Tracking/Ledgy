import { QRCodeSVG } from 'qrcode.react';
import { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface QRCodeDisplayProps {
    totpUri: string;
    secret: string;
    accountName: string;
}

export const QRCodeDisplay = ({ totpUri, secret, accountName }: QRCodeDisplayProps) => {
    const [copied, setCopied] = useState(false);

    // Memoize QR code to prevent unnecessary regeneration
    const qrCode = useMemo(() => (
        <QRCodeSVG
            value={totpUri}
            size={200}
            level="H" // High error correction
            includeMargin={true}
            aria-label={`QR code for setting up two-factor authentication for ${accountName}`}
        />
    ), [totpUri, accountName]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            {/* QR Code */}
            <div className="p-4 bg-white rounded-lg border-2 border-gray-200 dark:border-gray-700">
                {qrCode}
            </div>

            {/* Manual Entry Key */}
            <div className="w-full">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                    Can't scan the QR code? Enter this key manually:
                </p>
                <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900 rounded-lg font-mono text-sm text-center text-gray-900 dark:text-gray-100 break-all">
                        {secret}
                    </code>
                    <button
                        onClick={handleCopy}
                        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        aria-label={copied ? 'Copied' : 'Copy secret to clipboard'}
                    >
                        {copied ? (
                            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                            <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        )}
                    </button>
                </div>
            </div>

            {/* Instructions */}
            <div className="text-xs text-gray-600 dark:text-gray-400 text-center space-y-1">
                <p>1. Open your authenticator app (Google Authenticator, Authy, etc.)</p>
                <p>2. Scan the QR code or enter the key manually</p>
                <p>3. Enter the 6-digit code from the app</p>
            </div>
        </div>
    );
};
