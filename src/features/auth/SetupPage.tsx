import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from './useAuthStore';
import { generateSecret, encodeSecret, generateOtpauthUri } from '../../lib/totp';

export const SetupPage: React.FC = () => {
    const [tempSecret, setTempSecret] = useState<string | null>(null);
    const [qrUri, setQrUri] = useState<string>('');
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = React.useRef(false);
    const hasGenerated = React.useRef(false);
    const { verifyAndRegister } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (hasGenerated.current) return;
        hasGenerated.current = true;

        // Generate new secret on mount
        const rawSecret = generateSecret();
        const encoded = encodeSecret(rawSecret);
        const uri = generateOtpauthUri(encoded, 'user@ledgy', 'Ledgy');

        setTempSecret(encoded);
        setQrUri(uri);
    }, []);

    const handleVerify = async (val?: string) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        const verifyCode = val || code;
        if (!tempSecret || verifyCode.length !== 6) {
            isSubmittingRef.current = false;
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            const success = await verifyAndRegister(tempSecret, verifyCode);
            if (success) {
                navigate('/profiles');
            } else {
                setError('Invalid code. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setCode(value);
        if (value.length === 6) {
            handleVerify(value);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleVerify();
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-2xl space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-emerald-500">Secure Your Ledgy</h1>
                    <p className="text-zinc-400">Scan this QR code with Google Authenticator or any TOTP app.</p>
                </div>

                <div className="flex justify-center bg-white p-4 rounded-xl border-4 border-emerald-500/20">
                    {qrUri && (
                        <QRCodeSVG
                            value={qrUri}
                            size={200}
                            level="M"
                            includeMargin={false}
                        />
                    )}
                </div>

                <div className="space-y-4">
                    <div className="p-4 bg-zinc-950/50 rounded-lg border border-zinc-800 text-sm font-mono break-all text-zinc-500 text-center">
                        Secret: <span className="text-zinc-300">{tempSecret}</span>
                    </div>

                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="code" className="block text-sm font-medium text-zinc-400 text-center">
                                Enter 6-digit confirmation code
                            </label>
                            <input
                                id="code"
                                type="text"
                                maxLength={6}
                                value={code}
                                onChange={handleCodeChange}
                                placeholder="000000"
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-4 text-center text-3xl tracking-widest text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                                autoFocus
                            />
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm text-center font-medium">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={code.length !== 6 || isSubmitting}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold py-4 rounded-xl transition-all shadow-lg active:scale-[0.98]"
                        >
                            {isSubmitting ? 'Verifying...' : 'Finish Setup'}
                        </button>
                    </form>
                </div>

                <p className="text-xs text-zinc-600 text-center uppercase tracking-widest font-bold">
                    Ledgy is 100% Offline & Private
                </p>
            </div>
        </div>
    );
};
