import { QRCodeSVG } from 'qrcode.react';
import { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
        <Card className="flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-xl shadow-lg border border-white/5">
            <CardContent className="p-4 bg-white rounded-lg border-2 border-white/10">
                {qrCode}
            </CardContent>

            {/* Manual Entry Key */}
            <div className="w-full">
                <p className="text-sm font-medium text-zinc-300 mb-2 text-center">
                    Can't scan the QR code? Enter this key manually:
                </p>
                <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-white dark:bg-zinc-950 rounded-lg font-mono text-sm text-center text-zinc-900 dark:text-white break-all border border-zinc-300 dark:border-white/10">
                        {secret}
                    </code>
                    <Button
                        onClick={handleCopy}
                        variant="ghost"
                        size="icon-sm"
                        className="bg-gray-100 dark:bg-zinc-800/50 hover:bg-zinc-700/50"
                        aria-label={copied ? 'Copied' : 'Copy secret to clipboard'}
                    >
                        {copied ? (
                            <Check className="w-5 h-5 text-emerald-400" />
                        ) : (
                            <Copy className="w-5 h-5 text-zinc-400" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Instructions */}
            <div className="text-xs text-gray-600 dark:text-gray-400 text-center space-y-1">
                <p>1. Open your authenticator app (Google Authenticator, Authy, etc.)</p>
                <p>2. Scan the QR code or enter the key manually</p>
                <p>3. Enter the 6-digit code from the app</p>
            </div>
        </Card>
    );
};
